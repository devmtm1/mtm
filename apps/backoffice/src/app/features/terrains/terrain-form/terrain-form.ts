import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { LucideArrowLeft, LucideFileText, LucideImage, LucideSave, LucideTrash2, LucideUpload } from '@lucide/angular';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { CreateTerrainPayload, ProprietaireSummary, TerrainDetail, TerrainPointInteret } from '../../../core/models/terrain.model';
import { ProprietaireDialog } from '../proprietaire-dialog';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-terrain-form',
  imports: [FormsModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, LucideArrowLeft, LucideFileText, LucideImage, LucideSave, LucideTrash2, LucideUpload],
  templateUrl: './terrain-form.html',
  styleUrl: './terrain-form.scss',
})
export class TerrainForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(TerrainsApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly session = inject(SessionService);
  private originalStatuses: { statutJuridique: string; niveauVerification: string } | null = null;
  private originalSensitiveValues: { prixAcquisition: number | null; marge: number | null; commission: number | null; proprietaireId: string } | null = null;

  protected terrainId: string | null = null;
  protected terrain: TerrainDetail | null = null;
  protected saving = false;
  protected options = { statutJuridique: [], niveauVerification: [], statutCommercial: [] } as { statutJuridique: string[]; niveauVerification: string[]; statutCommercial: string[] };
  protected proprietaires: ProprietaireSummary[] = [];
  protected selectedAssets: SelectedAsset[] = [];
  protected readonly currentStep = signal(1);
  protected readonly form = this.formBuilder.group({
    referenceInterne: ['', [Validators.required, Validators.maxLength(100)]], nom: ['', [Validators.required, Validators.maxLength(200)]], parcelleMatricule: [''], proprietaireId: [''], statutJuridique: ['Régularisation en cours', Validators.required], typeDocumentFoncier: [''], niveauVerification: ['Non vérifié', Validators.required], region: [''], commune: [''], localisationDetail: [''], latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]], longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]], superficie: [null as number | null, Validators.min(0)], uniteSuperficie: ['m²'], dimensions: [''], prixAcquisition: [null as number | null, Validators.min(0)], prixPublic: [null as number | null, Validators.min(0)], marge: [null as number | null], commission: [null as number | null, Validators.min(0)],      statutCommercial: ['Brouillon', Validators.required], misEnAvant: [false], accesRoutier: [''], eauDisponible: [null as boolean | null], electriciteDisponible: [null as boolean | null], voisinage: [''], vocation: [''], proximiteAxes: [''], notesInternes: [''], justification: [''], pointsInteret: this.formBuilder.array<ReturnType<typeof this.buildPointInteretGroup>>([]),
  });

  protected get pointsInteretArray(): FormArray {
    return this.form.controls.pointsInteret as FormArray;
  }

  private buildPointInteretGroup(point: Partial<TerrainPointInteret> = {}) {
    return this.formBuilder.group({
      nom: [point.nom ?? '', [Validators.required, Validators.maxLength(150)]],
      type: [point.type ?? ''],
      distanceKm: [point.distanceKm ?? null as number | null, Validators.min(0)],
    });
  }

  protected addPointInteret(): void {
    this.pointsInteretArray.push(this.buildPointInteretGroup());
  }

  protected removePointInteret(index: number): void {
    this.pointsInteretArray.removeAt(index);
  }

  ngOnInit(): void {
    this.api.getOptions().subscribe({ next: (options) => { this.options = options; } });
    this.api.getProprietaires().subscribe({ next: (proprietaires) => { this.proprietaires = proprietaires; } });
    this.terrainId = this.route.snapshot.paramMap.get('id');
    if (this.terrainId) {
      this.api.findOne(this.terrainId).subscribe({ next: (terrain) => {
        this.terrain = terrain;
        this.originalStatuses = {
          statutJuridique: terrain.statutJuridique,
          niveauVerification: terrain.niveauVerification,
        };
        this.originalSensitiveValues = {
          prixAcquisition: this.toNumber(terrain.prixAcquisition),
          marge: this.toNumber(terrain.marge),
          commission: this.toNumber(terrain.commission),
          proprietaireId: terrain.proprietaire?.id ?? '',
        };
        this.form.patchValue(this.toFormValue(terrain));
        this.pointsInteretArray.clear();
        (terrain.pointsInteret ?? []).forEach((point) => this.pointsInteretArray.push(this.buildPointInteretGroup(point)));
      }, error: () => this.goBack() });
    }
    if (!this.session.hasPermission('terrains:valider')) {
      this.form.controls.statutJuridique.disable();
      this.form.controls.niveauVerification.disable();
    }
  }

  protected readonly justificationRequired = signal(false);

  private computeJustificationRequired(value: ReturnType<typeof this.form.getRawValue>): boolean {
    if (!this.terrainId) return false;
    const juridicalChanged = !!this.originalStatuses && value.statutJuridique !== this.originalStatuses.statutJuridique;
    const sensitiveChanged = !!this.originalSensitiveValues && (
      this.toNumber(value.prixAcquisition) !== this.originalSensitiveValues.prixAcquisition ||
      this.toNumber(value.marge) !== this.originalSensitiveValues.marge ||
      this.toNumber(value.commission) !== this.originalSensitiveValues.commission ||
      (value.proprietaireId ?? '') !== this.originalSensitiveValues.proprietaireId
    );
    return juridicalChanged || sensitiveChanged;
  }

  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const requiresJustification = this.computeJustificationRequired(value);
    this.justificationRequired.set(requiresJustification);
    if (requiresJustification && !value.justification?.trim()) {
      this.snackBar.open('Une justification est obligatoire : vous modifiez un prix, une marge, une commission, le propriétaire ou le statut juridique.', 'Fermer', { duration: 5000 });
      return;
    }
    this.saving = true;
    const payload = this.cleanPayload(value);
    const request$ = this.terrainId ? this.api.update(this.terrainId, payload) : this.api.create(payload);
    request$.subscribe({ next: (terrain) => {
      const statusUpdates = this.terrainId && this.originalStatuses
        ? [
            value.statutJuridique !== this.originalStatuses.statutJuridique
              ? this.api.updateJuridicalStatus(terrain.id, value.statutJuridique ?? '', value.justification ?? undefined)
              : of(null),
            value.niveauVerification !== this.originalStatuses.niveauVerification
              ? this.api.updateVerificationStatus(terrain.id, value.niveauVerification ?? '')
              : of(null),
          ]
        : [];
      const uploads = this.selectedAssets.map((asset) => this.api.upload(terrain.id, asset.kind, asset.file, asset.type, asset.title, asset.isPublic));
      forkJoin([...statusUpdates, ...uploads].length ? [...statusUpdates, ...uploads] : [of(null)]).subscribe({
        next: () => { this.saving = false; this.snackBar.open(this.selectedAssets.length ? 'Terrain et fichiers enregistrés' : (this.terrainId ? 'Terrain mis à jour' : 'Terrain créé'), 'Fermer', { duration: 3000 }); this.router.navigate(['/terrains', terrain.id]); },
        error: () => { this.saving = false; this.snackBar.open('Terrain enregistré, mais un fichier n’a pas pu être envoyé', 'Fermer', { duration: 5000 }); this.router.navigate(['/terrains', terrain.id]); },
      });
    }, error: (error: HttpErrorResponse) => { this.saving = false; this.snackBar.open(this.getApiErrorMessage(error), 'Fermer', { duration: 4000 }); } });
  }

  protected nextStep(): void {
    if (this.currentStep() < 4) {
      this.currentStep.update((step) => step + 1);
    } else {
      this.submit();
    }
  }

  protected previousStep(): void {
    if (this.currentStep() > 1) this.currentStep.update((step) => step - 1);
  }

  protected selectAssets(event: Event, kind: 'media' | 'documents'): void {
    const input = event.target as HTMLInputElement;
    Array.from(input.files ?? []).forEach((file) => this.selectedAssets.push({ file, kind, type: kind === 'media' ? (file.type.startsWith('video/') ? 'video' : 'photo') : 'document', title: file.name, isPublic: false }));
    input.value = '';
  }

  protected removeAsset(index: number): void { this.selectedAssets.splice(index, 1); }

  protected addProprietaire(): void {
    const ref = this.dialog.open(ProprietaireDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)' });
    ref.afterClosed().subscribe((payload: Omit<ProprietaireSummary, 'id'> | undefined) => {
      if (!payload) return;
      this.api.createProprietaire(payload).subscribe({
        next: (proprietaire) => { this.proprietaires = [...this.proprietaires, proprietaire].sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)); this.form.controls.proprietaireId.setValue(proprietaire.id); this.snackBar.open('Propriétaire ajouté', 'Fermer', { duration: 3000 }); },
        error: () => this.snackBar.open('Impossible d’ajouter le propriétaire', 'Fermer', { duration: 4000 }),
      });
    });
  }

  protected goBack(): void { this.router.navigate(['/terrains']); }

  private toFormValue(terrain: TerrainDetail) {
    return { referenceInterne: terrain.referenceInterne, nom: terrain.nom, parcelleMatricule: terrain.parcelleMatricule, proprietaireId: terrain.proprietaire?.id ?? '', statutJuridique: terrain.statutJuridique, typeDocumentFoncier: terrain.typeDocumentFoncier, niveauVerification: terrain.niveauVerification, region: terrain.region, commune: terrain.commune, localisationDetail: terrain.localisationDetail, latitude: this.toNumber(terrain.latitude), longitude: this.toNumber(terrain.longitude), superficie: this.toNumber(terrain.superficie), uniteSuperficie: 'm²', dimensions: terrain.dimensions ? JSON.stringify(terrain.dimensions) : '', prixAcquisition: this.toNumber(terrain.prixAcquisition), prixPublic: this.toNumber(terrain.prixPublic), marge: this.toNumber(terrain.marge), commission: this.toNumber(terrain.commission), statutCommercial: terrain.statutCommercial,     accesRoutier: terrain.accesRoutier, misEnAvant: !!terrain.misEnAvant, eauDisponible: terrain.eauDisponible, electriciteDisponible: terrain.electriciteDisponible, voisinage: terrain.voisinage, vocation: terrain.vocation, proximiteAxes: terrain.proximiteAxes, notesInternes: terrain.notesInternes };
  }

  private toNumber(value: number | string | null): number | null { return value === null ? null : Number(value); }
  private parseDimensions(value: string | null): Record<string, unknown> | undefined { if (!value?.trim()) return undefined; try { return JSON.parse(value) as Record<string, unknown>; } catch { return { description: value }; } }
  private cleanPayload(value: ReturnType<typeof this.form.getRawValue>): CreateTerrainPayload {
    const dimensions = this.parseDimensions(value.dimensions);
    const pointsInteret = (value.pointsInteret ?? [])
      .filter((point) => point.nom?.trim())
      .map((point) => ({
        nom: point.nom!.trim(),
        type: point.type?.trim() || undefined,
        distanceKm: point.distanceKm ?? undefined,
      }));
    const stringFields = ['parcelleMatricule', 'proprietaireId', 'typeDocumentFoncier', 'region', 'commune', 'localisationDetail', 'accesRoutier', 'voisinage', 'vocation', 'proximiteAxes', 'notesInternes', 'uniteSuperficie', 'justification'] as const;
    const cleaned = { ...value, dimensions, pointsInteret: pointsInteret.length ? pointsInteret : undefined } as Record<string, unknown>;
    if (this.terrainId) {
      delete cleaned['statutJuridique'];
      delete cleaned['niveauVerification'];
    }
    for (const field of stringFields) {
      if (typeof cleaned[field] === 'string' && cleaned[field].trim() === '') {
        cleaned[field] = undefined;
      }
    }
    return cleaned as unknown as CreateTerrainPayload;
  }

  private getApiErrorMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message.trim()) return message;
    return 'Impossible d’enregistrer le terrain';
  }
}

interface SelectedAsset {
  file: File;
  kind: 'media' | 'documents';
  type: string;
  title: string;
  isPublic: boolean;
}
