import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { LucideArrowLeft, LucideFileText, LucideImage, LucideSave, LucideTrash2, LucideUpload } from '@lucide/angular';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { CreateTerrainPayload, TerrainDetail } from '../../../core/models/terrain.model';

@Component({
  selector: 'app-terrain-form',
  imports: [FormsModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideArrowLeft, LucideFileText, LucideImage, LucideSave, LucideTrash2, LucideUpload],
  templateUrl: './terrain-form.html',
  styleUrl: './terrain-form.scss',
})
export class TerrainForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(TerrainsApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected terrainId: string | null = null;
  protected terrain: TerrainDetail | null = null;
  protected saving = false;
  protected options = { statutJuridique: [], niveauVerification: [], statutCommercial: [] } as { statutJuridique: string[]; niveauVerification: string[]; statutCommercial: string[] };
  protected selectedAssets: SelectedAsset[] = [];
  protected readonly currentStep = signal(1);
  protected readonly form = this.formBuilder.group({
    referenceInterne: ['', [Validators.required, Validators.maxLength(100)]], nom: ['', [Validators.required, Validators.maxLength(200)]], parcelleMatricule: [''], statutJuridique: ['Régularisation en cours', Validators.required], typeDocumentFoncier: [''], niveauVerification: ['Non vérifié', Validators.required], region: [''], commune: [''], localisationDetail: [''], latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]], longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]], superficie: [null as number | null, Validators.min(0)], uniteSuperficie: ['m²'], dimensions: [''], prixAcquisition: [null as number | null, Validators.min(0)], prixPublic: [null as number | null, Validators.min(0)], marge: [null as number | null], commission: [null as number | null, Validators.min(0)], statutCommercial: ['Brouillon', Validators.required], accesRoutier: [''], eauDisponible: [null as boolean | null], electriciteDisponible: [null as boolean | null], voisinage: [''], vocation: [''], proximiteAxes: [''], notesInternes: [''],
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({ next: (options) => { this.options = options; } });
    this.terrainId = this.route.snapshot.paramMap.get('id');
    if (this.terrainId) {
      this.api.findOne(this.terrainId).subscribe({ next: (terrain) => { this.terrain = terrain; this.form.patchValue(this.toFormValue(terrain)); }, error: () => this.goBack() });
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const value = this.form.getRawValue();
    const payload = this.cleanPayload(value);
    const request$ = this.terrainId ? this.api.update(this.terrainId, payload) : this.api.create(payload);
    request$.subscribe({ next: (terrain) => {
      const uploads = this.selectedAssets.map((asset) => this.api.upload(terrain.id, asset.kind, asset.file, asset.type, asset.title, asset.isPublic));
      forkJoin(uploads.length ? uploads : [of(null)]).subscribe({
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

  protected goBack(): void { this.router.navigate(['/terrains']); }

  private toFormValue(terrain: TerrainDetail) {
    return { referenceInterne: terrain.referenceInterne, nom: terrain.nom, parcelleMatricule: terrain.parcelleMatricule, statutJuridique: terrain.statutJuridique, typeDocumentFoncier: terrain.typeDocumentFoncier, niveauVerification: terrain.niveauVerification, region: terrain.region, commune: terrain.commune, localisationDetail: terrain.localisationDetail, latitude: this.toNumber(terrain.latitude), longitude: this.toNumber(terrain.longitude), superficie: this.toNumber(terrain.superficie), uniteSuperficie: 'm²', dimensions: terrain.dimensions ? JSON.stringify(terrain.dimensions) : '', prixAcquisition: this.toNumber(terrain.prixAcquisition), prixPublic: this.toNumber(terrain.prixPublic), marge: this.toNumber(terrain.marge), commission: this.toNumber(terrain.commission), statutCommercial: terrain.statutCommercial, accesRoutier: terrain.accesRoutier, eauDisponible: terrain.eauDisponible, electriciteDisponible: terrain.electriciteDisponible, voisinage: terrain.voisinage, vocation: terrain.vocation, proximiteAxes: terrain.proximiteAxes, notesInternes: terrain.notesInternes };
  }

  private toNumber(value: number | string | null): number | null { return value === null ? null : Number(value); }
  private parseDimensions(value: string | null): Record<string, unknown> | undefined { if (!value?.trim()) return undefined; try { return JSON.parse(value) as Record<string, unknown>; } catch { return { description: value }; } }
  private cleanPayload(value: ReturnType<typeof this.form.getRawValue>): CreateTerrainPayload {
    const dimensions = this.parseDimensions(value.dimensions);
    const stringFields = ['parcelleMatricule', 'typeDocumentFoncier', 'region', 'commune', 'localisationDetail', 'accesRoutier', 'voisinage', 'vocation', 'proximiteAxes', 'notesInternes', 'uniteSuperficie'] as const;
    const cleaned = { ...value, dimensions } as Record<string, unknown>;
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
