import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArrowLeft,
  LucideChevronDown,
  LucideKeyRound,
  LucideLandPlot,
  LucideMail,
  LucidePencil,
  LucidePhone,
  LucidePlus,
  LucideScrollText,
} from '@lucide/angular';
import { ProprietairesApiService, type ProprietaireDetail as ProprietaireDetailModel } from '../../../core/services/api/proprietaires-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ProprietaireDialog } from '../../terrains/proprietaire-dialog';
import { ClientAccountDialog } from '../../../shared/dialogs/client-account-dialog';
import type { ProprietaireSummary, TerrainListItem } from '../../../core/models/terrain.model';
import type { MandatListItem } from '../../../core/models/mandat.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { COMMERCIAL_STATUS, pillClass as terrainPill, statusHelp as terrainHelp } from '../../terrains/terrain-status';
import { MANDAT_STATUS, echeanceInfo, pillClass as mandatPill, statusHelp as mandatHelp } from '../../mandats/mandat-status';

/**
 * Fiche propriétaire (J1.4) : coordonnées, puis tout ce qu'il a confié à
 * MTM — terrains et mandats — avec les raccourcis pour en créer.
 */
@Component({
  selector: 'app-proprietaire-detail',
  imports: [
    MoneyPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucideChevronDown,
    LucideKeyRound,
    LucideLandPlot,
    LucideMail,
    LucidePencil,
    LucidePhone,
    LucidePlus,
    LucideScrollText,
  ],
  templateUrl: './proprietaire-detail.html',
  styleUrl: './proprietaire-detail.scss',
})
export class ProprietaireDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProprietairesApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly mandatsApi = inject(MandatsApiService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  protected readonly proprietaire = signal<ProprietaireDetailModel | null>(null);
  protected readonly terrains = signal<TerrainListItem[] | null>(null);
  protected readonly mandats = signal<MandatListItem[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('proprietaires:modifier');
  protected readonly canDelete = this.session.hasPermission('proprietaires:supprimer');
  protected readonly canSeeTerrains = this.session.hasPermission('terrains:consulter');
  protected readonly canCreateTerrain = this.session.hasPermission('terrains:creer');
  protected readonly canSeeMandats = this.session.hasPermission('mandats:consulter');
  protected readonly canCreateMandat = this.session.hasPermission('mandats:creer');
  protected readonly canCreateClient = this.session.hasPermission('clients:creer');

  protected readonly activeMandats = computed(() => (this.mandats() ?? []).filter((mandat) => mandat.statut === 'Actif').length);
  protected readonly terrainsDisponibles = computed(() => (this.terrains() ?? []).filter((terrain) => terrain.statutCommercial === 'Disponible').length);

  /** Ce qui manque pour que la relation soit exploitable. */
  protected readonly todo = computed(() => {
    const proprietaire = this.proprietaire();
    const terrains = this.terrains();
    const mandats = this.mandats();
    if (!proprietaire || terrains === null || mandats === null) return [];
    const items: { label: string; hint: string }[] = [];
    if (!proprietaire.phone && !proprietaire.email) items.push({ label: 'Renseigner un moyen de contact', hint: 'Téléphone ou e-mail, pour le joindre.' });
    if (terrains.length === 0) items.push({ label: 'Enregistrer ses terrains', hint: 'Créez la fiche de chaque parcelle confiée.' });
    if (terrains.length > 0 && mandats.length === 0) items.push({ label: 'Formaliser un mandat', hint: 'Sans mandat signé, MTM n’est pas autorisée à commercialiser.' });
    return items;
  });

  private id: string | null = null;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) {
      this.goBack();
      return;
    }
    this.load(this.id);
  }

  protected goBack(): void {
    void this.router.navigate(['/proprietaires']);
  }

  protected openTerrain(id: string): void {
    void this.router.navigate(['/terrains', id]);
  }

  protected openMandat(id: string): void {
    void this.router.navigate(['/mandats', id]);
  }

  protected newTerrain(): void {
    void this.router.navigate(['/terrains/nouveau'], { queryParams: { proprietaireId: this.id } });
  }

  protected newMandat(): void {
    void this.router.navigate(['/mandats/nouveau'], { queryParams: { proprietaireId: this.id } });
  }

  protected terrainPill(value: string): string {
    return terrainPill(COMMERCIAL_STATUS, value);
  }

  protected terrainHelp(value: string): string {
    return terrainHelp(COMMERCIAL_STATUS, value);
  }

  protected mandatPill(value: string): string {
    return mandatPill(MANDAT_STATUS, value);
  }

  protected mandatHelp(value: string): string {
    return mandatHelp(MANDAT_STATUS, value);
  }

  protected echeance(mandat: MandatListItem): { label: string; tone: string } {
    return echeanceInfo(mandat.dateFin, mandat.statut, mandat.alerteEcheanceJours);
  }

  protected location(terrain: TerrainListItem): string {
    return [terrain.commune, terrain.region].filter(Boolean).join(', ') || 'Localisation non renseignée';
  }

  protected edit(): void {
    const current = this.proprietaire();
    if (!current || !this.id) return;
    this.dialog
      .open(ProprietaireDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)', data: { proprietaire: current as ProprietaireSummary } })
      .afterClosed()
      .subscribe((payload: Omit<ProprietaireSummary, 'id'> | undefined) => {
        if (!payload || !this.id) return;
        this.api.update(this.id, payload).subscribe({
          next: () => {
            this.notify.success('Propriétaire mis à jour');
            this.load(this.id!);
          },
          error: (error: unknown) => this.notify.error(error, 'Impossible de mettre à jour le propriétaire'),
        });
      });
  }

  protected openCreateClientAccount(): void {
    const current = this.proprietaire();
    if (!current?.email || !this.canCreateClient) return;
    ClientAccountDialog.open(this.dialog, {
      email: current.email,
      name: `${current.firstName} ${current.lastName}`,
      scopeDescription: 'suivre son bien, le locataire en place et les loyers encaissés',
      create: (password) => this.api.createClientAccount(current.id, password),
    });
  }

  protected remove(): void {
    const current = this.proprietaire();
    if (!this.id || !current) return;
    if (!confirm(`Supprimer ${current.firstName} ${current.lastName} ? Impossible s’il a encore un mandat.`)) return;
    this.api.remove(this.id).subscribe({
      next: () => {
        this.notify.success('Propriétaire supprimé');
        this.goBack();
      },
      error: (error: unknown) => this.notify.error(error, 'Impossible de supprimer : des mandats y sont encore rattachés'),
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (proprietaire) => {
        this.proprietaire.set(proprietaire);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Propriétaire introuvable');
        this.goBack();
      },
    });
    if (this.canSeeTerrains) {
      this.terrainsApi.findAll({ proprietaireId: id, pageSize: 100 }).subscribe({
        next: (page) => this.terrains.set(page.items),
        error: () => this.terrains.set([]),
      });
    } else {
      this.terrains.set([]);
    }
    if (this.canSeeMandats) {
      this.mandatsApi.findAll({ proprietaireId: id, pageSize: 100 }).subscribe({
        next: (page) => this.mandats.set(page.items),
        error: () => this.mandats.set([]),
      });
    } else {
      this.mandats.set([]);
    }
  }
}
