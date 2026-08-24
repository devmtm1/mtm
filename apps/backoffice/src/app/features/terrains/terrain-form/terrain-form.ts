import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideArrowLeft, LucideSave } from '@lucide/angular';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { CreateTerrainPayload, TerrainDetail } from '../../../core/models/terrain.model';

@Component({
  selector: 'app-terrain-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideArrowLeft, LucideSave],
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
  protected readonly form = this.formBuilder.group({
    referenceInterne: ['', [Validators.required, Validators.maxLength(100)]], nom: ['', [Validators.required, Validators.maxLength(200)]], parcelleMatricule: [''], statutJuridique: ['Régularisation en cours', Validators.required], typeDocumentFoncier: [''], niveauVerification: ['Non vérifié', Validators.required], region: [''], commune: [''], localisationDetail: [''], latitude: [null as number | null], longitude: [null as number | null], superficie: [null as number | null], uniteSuperficie: ['m²'], prixAcquisition: [null as number | null], prixPublic: [null as number | null], marge: [null as number | null], commission: [null as number | null], statutCommercial: ['Brouillon', Validators.required], accesRoutier: [''], voisinage: [''], vocation: [''], proximiteAxes: [''], notesInternes: [''],
  });

  ngOnInit(): void {
    this.terrainId = this.route.snapshot.paramMap.get('id');
    if (this.terrainId) {
      this.api.findOne(this.terrainId).subscribe({ next: (terrain) => { this.terrain = terrain; this.form.patchValue(this.toFormValue(terrain)); }, error: () => this.goBack() });
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const payload = this.form.getRawValue() as CreateTerrainPayload;
    const request$ = this.terrainId ? this.api.update(this.terrainId, payload) : this.api.create(payload);
    request$.subscribe({ next: (terrain) => { this.saving = false; this.snackBar.open(this.terrainId ? 'Terrain mis à jour' : 'Terrain créé', 'Fermer', { duration: 3000 }); this.router.navigate(['/terrains', terrain.id]); }, error: () => { this.saving = false; this.snackBar.open('Impossible d’enregistrer le terrain', 'Fermer', { duration: 4000 }); } });
  }

  protected goBack(): void { this.router.navigate(['/terrains']); }

  private toFormValue(terrain: TerrainDetail) {
    return { referenceInterne: terrain.referenceInterne, nom: terrain.nom, parcelleMatricule: terrain.parcelleMatricule, statutJuridique: terrain.statutJuridique, typeDocumentFoncier: terrain.typeDocumentFoncier, niveauVerification: terrain.niveauVerification, region: terrain.region, commune: terrain.commune, localisationDetail: terrain.localisationDetail, latitude: this.toNumber(terrain.latitude), longitude: this.toNumber(terrain.longitude), superficie: this.toNumber(terrain.superficie), uniteSuperficie: 'm²', prixAcquisition: this.toNumber(terrain.prixAcquisition), prixPublic: this.toNumber(terrain.prixPublic), marge: this.toNumber(terrain.marge), commission: this.toNumber(terrain.commission), statutCommercial: terrain.statutCommercial, accesRoutier: terrain.accesRoutier, voisinage: terrain.voisinage, vocation: terrain.vocation, proximiteAxes: terrain.proximiteAxes, notesInternes: terrain.notesInternes };
  }

  private toNumber(value: number | string | null): number | null { return value === null ? null : Number(value); }
}
