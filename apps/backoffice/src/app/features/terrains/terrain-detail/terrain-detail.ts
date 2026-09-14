import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArrowLeft,
  LucideCamera,
  LucideChevronDown,
  LucideClock,
  LucideExternalLink,
  LucideEye,
  LucideEyeOff,
  LucideFileText,
  LucideGlobe,
  LucideMapPin,
  LucidePencil,
  LucidePlus,
  LucideStar,
  LucideTrash2,
  LucideUpload,
  LucideUserCheck,
} from '@lucide/angular';
import * as L from 'leaflet';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import type { CommercialSummary } from '../../../core/models/prospect.model';
import { StatusChoiceDialog } from '../../../shared/dialogs/status-choice-dialog';
import { SessionService } from '../../../core/services/session.service';
import type { TerrainDetail as TerrainDetailModel, TerrainOptions } from '../../../core/models/terrain.model';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { TerrainHistoryDialog } from '../terrain-history-dialog';
import { TerrainStatusDialog, type TerrainStatusKind } from '../terrain-status-dialog';
import {
  COMMERCIAL_STATUS,
  LEGAL_STATUS,
  VERIFICATION_STATUS,
  isPublished,
  pillClass,
  statusHelp,
} from '../terrain-status';

/**
 * Fiche terrain (J1.1 / J1.3). Tout ce qu'un commercial doit savoir sur une
 * parcelle, et les actions possibles depuis un seul endroit : modifier,
 * changer un statut, mettre en avant, ajouter photos et documents.
 */
@Component({
  selector: 'app-terrain-detail',
  imports: [
    MoneyPipe,
    LabelPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucideCamera,
    LucideChevronDown,
    LucideClock,
    LucideExternalLink,
    LucideEye,
    LucideEyeOff,
    LucideFileText,
    LucideGlobe,
    LucideMapPin,
    LucidePencil,
    LucidePlus,
    LucideStar,
    LucideTrash2,
    LucideUpload,
    LucideUserCheck,
  ],
  templateUrl: './terrain-detail.html',
  styleUrl: './terrain-detail.scss',
})
export class TerrainDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(TerrainsApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly terrain = signal<TerrainDetailModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly options = signal<TerrainOptions | null>(null);
  protected readonly activeMedia = signal<string | null>(null);

  protected readonly canModify = this.session.hasPermission('terrains:modifier');
  /** Affecter le terrain à un commercial : encadrement uniquement. */
  protected readonly canAssign = this.session.hasPermission('terrains:modifier') && this.session.hasSupervisionScope('terrains') && this.session.hasPermission('crm:consulter');
  protected readonly canValidate = this.session.hasPermission('terrains:valider');
  protected readonly canPublish = this.session.hasPermission('terrains:publier') || this.session.hasRole('administrateur') || this.session.hasRole('direction');
  protected readonly canViewFinancials =
    this.session.hasPermission('terrains:consulter_financier') || this.session.hasRole('administrateur') || this.session.hasRole('direction');

  protected readonly published = computed(() => isPublished(this.terrain()?.statutCommercial));
  protected readonly publicUrl = computed(() => {
    const terrain = this.terrain();
    return terrain && this.published() ? `${environment.publicWebUrl}/terrains/${terrain.id}` : null;
  });
  protected readonly images = computed(() => (this.terrain()?.medias ?? []).filter((media) => media.resourceType === 'image' && media.secureUrl));
  protected readonly otherMedias = computed(() => (this.terrain()?.medias ?? []).filter((media) => media.resourceType !== 'image'));
  protected readonly mainImage = computed(() => this.activeMedia() ?? this.images()[0]?.secureUrl ?? null);
  protected readonly hasGps = computed(() => {
    const terrain = this.terrain();
    return !!terrain && Number.isFinite(Number(terrain.latitude)) && Number.isFinite(Number(terrain.longitude)) && terrain.latitude !== null;
  });
  protected readonly mapUrl = computed(() => {
    const terrain = this.terrain();
    if (!terrain || !this.hasGps()) return null;
    return `https://www.openstreetmap.org/?mlat=${terrain.latitude}&mlon=${terrain.longitude}#map=16/${terrain.latitude}/${terrain.longitude}`;
  });

  /** Ce qui manque pour une fiche « complète » — affiché comme liste de choses à faire. */
  protected readonly todo = computed(() => {
    const terrain = this.terrain();
    if (!terrain) return [];
    const items: { label: string; hint: string }[] = [];
    if (!this.images().some((media) => media.isPublic)) items.push({ label: 'Ajouter une photo publique', hint: 'Sans photo, la fiche du site est peu attractive.' });
    if (!this.hasGps()) items.push({ label: 'Renseigner les coordonnées GPS', hint: 'Nécessaires pour la carte sur le site public.' });
    if (terrain.prixPublic === null) items.push({ label: 'Fixer le prix public', hint: 'Affiché aux visiteurs du site.' });
    if (!terrain.description) items.push({ label: 'Rédiger la description publique', hint: 'Texte de présentation sur le site.' });
    if (terrain.niveauVerification !== 'Vérifié') items.push({ label: 'Terminer la vérification', hint: statusHelp(VERIFICATION_STATUS, terrain.niveauVerification) });
    return items;
  });

  protected readonly commercialStatus = COMMERCIAL_STATUS;
  protected readonly legalStatus = LEGAL_STATUS;
  protected readonly verificationStatus = VERIFICATION_STATUS;

  private readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private map: L.Map | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }
    this.api.getOptions().subscribe({ next: (options) => this.options.set(options) });
    this.api.findOne(id).subscribe({
      next: (terrain) => {
        this.terrain.set(terrain);
        this.loading.set(false);
        setTimeout(() => this.renderMap(), 0);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Terrain introuvable');
        this.goBack();
      },
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  protected goBack(): void {
    void this.router.navigate(['/terrains']);
  }

  protected edit(): void {
    const terrain = this.terrain();
    if (terrain) void this.router.navigate(['/terrains', terrain.id, 'modifier']);
  }

  protected pill(map: Record<string, { tone: string }>, value: string | null | undefined): string {
    return pillClass(map as never, value);
  }

  protected help(map: Record<string, { help: string }>, value: string | null | undefined): string {
    return statusHelp(map as never, value);
  }

  protected formatNumber(value: number | string | null): string {
    return value === null ? '—' : Number(value).toLocaleString('fr-FR');
  }

  /** Les dimensions sont stockées en JSON libre ({ description } depuis le formulaire). */
  protected dimensionsText(terrain: TerrainDetailModel): string {
    const value = terrain.dimensions;
    if (!value) return '—';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && 'description' in value) return String((value as { description: unknown }).description);
    return JSON.stringify(value);
  }

  protected yesNo(value: boolean | null): string {
    return value === null ? 'Non renseigné' : value ? 'Oui' : 'Non';
  }

  protected changeStatus(kind: TerrainStatusKind): void {
    const terrain = this.terrain();
    const options = this.options();
    if (!terrain || !options) return;
    const current = kind === 'commercial' ? terrain.statutCommercial : kind === 'juridique' ? terrain.statutJuridique : terrain.niveauVerification;
    const list = kind === 'commercial' ? options.statutCommercial : kind === 'juridique' ? options.statutJuridique : options.niveauVerification;
    TerrainStatusDialog.open(this.dialog, { kind, current, options: list, terrainNom: terrain.nom }).subscribe((result) => {
      if (!result) return;
      const request$ =
        kind === 'commercial'
          ? this.api.updateCommercialStatus(terrain.id, result.value, result.justification)
          : kind === 'juridique'
            ? this.api.updateJuridicalStatus(terrain.id, result.value, result.justification)
            : this.api.updateVerificationStatus(terrain.id, result.value, result.justification);
      this.run(request$, 'Statut mis à jour');
    });
  }

  /** Choisit le commercial qui suit ce terrain (seul lui et l'encadrement le verront). */
  protected assignCommercial(): void {
    const terrain = this.terrain();
    if (!terrain || !this.canAssign) return;
    this.crmApi.getCommercials().subscribe({
      next: (commercials: CommercialSummary[]) => {
        StatusChoiceDialog.open(this.dialog, {
          title: 'Affecter à un commercial',
          intro: 'Le commercial affecté voit ce terrain dans sa liste et peut l’utiliser dans ses dossiers de vente. L’encadrement continue de tout voir.',
          subject: terrain.nom,
          current: terrain.commercialResponsable?.id ?? '',
          choices: commercials.map((commercial) => ({ value: commercial.id, label: `${commercial.firstName} ${commercial.lastName}`, help: '', tone: 'primary' as const })),
          confirmLabel: 'Affecter',
        }).subscribe((result) => {
          if (!result || result.value === terrain.commercialResponsable?.id) return;
          this.run(this.api.update(terrain.id, { commercialResponsableId: result.value }), 'Terrain affecté');
        });
      },
      error: (error: unknown) => this.notify.error(error, 'Impossible de charger la liste des commerciaux'),
    });
  }

  protected toggleFeatured(misEnAvant: boolean): void {
    const terrain = this.terrain();
    if (!terrain) return;
    this.run(this.api.setFeatured(terrain.id, misEnAvant), misEnAvant ? 'Terrain mis en avant sur la page d’accueil' : 'Terrain retiré de la page d’accueil');
  }

  protected openHistory(): void {
    const terrain = this.terrain();
    if (!terrain) return;
    TerrainHistoryDialog.open(this.dialog, this.api, terrain);
  }

  protected showMedia(url: string): void {
    this.activeMedia.set(url);
  }

  protected uploadAsset(event: Event, kind: 'media' | 'documents', isPublic: boolean): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const terrain = this.terrain();
    input.value = '';
    if (!files.length || !terrain) return;
    this.busy.set(true);
    let remaining = files.length;
    let failed = 0;
    const done = () => {
      remaining -= 1;
      if (remaining > 0) return;
      this.busy.set(false);
      if (failed === 0) this.notify.success(files.length > 1 ? `${files.length} fichiers ajoutés` : 'Fichier ajouté');
      this.reload();
    };
    for (const file of files) {
      const type = kind === 'media' ? (file.type.startsWith('video/') ? 'video' : 'photo') : 'document';
      this.api.upload(terrain.id, kind, file, type, file.name, isPublic).subscribe({
        next: done,
        error: (error: unknown) => {
          failed += 1;
          this.notify.error(error, `Impossible d’ajouter ${file.name}`);
          done();
        },
      });
    }
  }

  protected removeMedia(mediaId: string): void {
    const terrain = this.terrain();
    if (!terrain || !confirm('Supprimer cette photo ? Elle disparaîtra aussi du site public.')) return;
    if (this.activeMedia()) this.activeMedia.set(null);
    this.run(this.api.removeMedia(terrain.id, mediaId), 'Photo supprimée');
  }

  protected removeDocument(documentId: string): void {
    const terrain = this.terrain();
    if (!terrain || !confirm('Supprimer ce document ?')) return;
    this.run(this.api.removeDocument(terrain.id, documentId), 'Document supprimé');
  }

  private run(request$: { subscribe: (observer: { next: () => void; error: (error: unknown) => void }) => unknown }, successMessage: string): void {
    this.busy.set(true);
    request$.subscribe({
      next: () => {
        this.notify.success(successMessage);
        this.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'L’opération a échoué');
      },
    });
  }

  private reload(): void {
    const terrain = this.terrain();
    if (!terrain) return;
    this.api.findOne(terrain.id).subscribe({
      next: (fresh) => {
        this.terrain.set(fresh);
        this.busy.set(false);
        this.map?.remove();
        this.map = null;
        setTimeout(() => this.renderMap(), 0);
      },
      error: () => this.busy.set(false),
    });
  }

  private renderMap(): void {
    const terrain = this.terrain();
    const container = this.mapContainer()?.nativeElement;
    if (!terrain || !container || this.map || !this.hasGps()) return;
    const lat = Number(terrain.latitude);
    const lng = Number(terrain.longitude);
    const map = L.map(container, { scrollWheelZoom: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
    const icon = L.divIcon({ className: 'mtm-map-pin', html: '<span class="mtm-map-pin-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
    L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<strong>${terrain.nom}</strong>`);
    this.map = map;
    setTimeout(() => map.invalidateSize(), 150);
  }
}
