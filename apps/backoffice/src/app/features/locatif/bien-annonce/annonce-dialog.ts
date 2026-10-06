import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import type { AnnoncePayload, BienDetail } from '../../../core/models/locatif.model';

export interface AnnonceDialogData {
  bien: BienDetail;
  /** La mise à la une est réservée à la permission « publier ». */
  canPublish: boolean;
}

/** Nombre saisi → nombre, champ vide → absent (jamais « 0 » par défaut). */
const nombre = (valeur: number | string | null): number | undefined => {
  if (valeur === null || valeur === '') return undefined;
  const converti = Number(valeur);
  return Number.isFinite(converti) ? converti : undefined;
};

/**
 * Description du bien telle qu'un visiteur du site la lira : loyer, pièces,
 * équipements, disponibilité. L'adresse exacte et les notes internes n'y
 * figurent pas — elles ne sortent jamais vers le site.
 */
@Component({
  selector: 'app-annonce-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Annonce — {{ data.bien.referenceInterne }}</h2>
    <mat-dialog-content [formGroup]="form" class="annonce-grid">
      <p class="annonce-hint annonce-wide">
        Ce que le visiteur verra sur le site. L’adresse exacte et les notes internes ne sont jamais publiées : seule
        la commune l’est.
      </p>

      <mat-form-field appearance="outline" class="annonce-wide">
        <mat-label>Titre de l’annonce</mat-label>
        <input matInput formControlName="titre" maxlength="160" placeholder="Appartement lumineux aux Almadies" />
        <mat-hint>Laissez vide : « Appartement à Ngor » sera affiché.</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="annonce-wide">
        <mat-label>Description</mat-label>
        <textarea matInput rows="5" formControlName="description" maxlength="4000"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Loyer mensuel (FCFA)</mat-label>
        <input matInput type="number" min="0" step="5000" formControlName="loyerMensuel" />
        @if (form.controls.loyerMensuel.hasError('min')) {
          <mat-error>Le loyer ne peut pas être négatif.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Charges mensuelles (FCFA)</mat-label>
        <input matInput type="number" min="0" step="1000" formControlName="charges" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Caution (mois de loyer)</mat-label>
        <input matInput type="number" min="0" max="12" formControlName="moisCaution" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Disponible à partir du</mat-label>
        <input matInput type="date" formControlName="disponibleLe" />
        <mat-hint>Vide : disponible immédiatement.</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Pièces</mat-label>
        <input matInput type="number" min="0" max="50" formControlName="nombrePieces" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Chambres</mat-label>
        <input matInput type="number" min="0" max="30" formControlName="nombreChambres" />
        <mat-hint>0 pour un studio.</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Salles d’eau</mat-label>
        <input matInput type="number" min="0" max="30" formControlName="nombreSallesEau" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Ameublement</mat-label>
        <mat-select formControlName="meuble">
          <mat-option [value]="false">Non meublé</mat-option>
          <mat-option [value]="true">Meublé</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="annonce-wide">
        <mat-label>Équipements et prestations</mat-label>
        <input matInput formControlName="equipements" placeholder="Climatisation, Parking, Gardien, Groupe électrogène" />
        <mat-hint>Séparés par des virgules.</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Latitude</mat-label>
        <input matInput type="number" step="0.000001" formControlName="latitude" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Longitude</mat-label>
        <input matInput type="number" step="0.000001" formControlName="longitude" />
        <mat-hint>Arrondie à 100 m sur le site.</mat-hint>
      </mat-form-field>

      @if (data.canPublish) {
        <mat-form-field appearance="outline" class="annonce-wide">
          <mat-label>Mise en avant</mat-label>
          <mat-select formControlName="misEnAvant">
            <mat-option [value]="false">Annonce normale</mat-option>
            <mat-option [value]="true">À la une (en tête de liste et sur l’accueil)</mat-option>
          </mat-select>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Enregistrer l’annonce
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .annonce-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; min-width: min(640px, calc(100vw - 96px)); }
    .annonce-wide { grid-column: 1 / -1; }
    .annonce-hint { margin: 0 0 4px; color: var(--mtm-text-muted); font-size: 0.84rem; line-height: 1.5; }
    @media (max-width: 640px) { .annonce-grid { grid-template-columns: 1fr; } }
  `,
})
export class AnnonceDialog {
  private readonly dialogRef = inject(MatDialogRef<AnnonceDialog, AnnoncePayload>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<AnnonceDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.group({
    titre: [this.data.bien.titre ?? ''],
    description: [this.data.bien.description ?? ''],
    loyerMensuel: [nombre(this.data.bien.loyerMensuel) ?? (null as number | null), [Validators.min(0)]],
    charges: [nombre(this.data.bien.charges) ?? (null as number | null), [Validators.min(0)]],
    moisCaution: [this.data.bien.moisCaution as number | null, [Validators.min(0), Validators.max(12)]],
    disponibleLe: [this.data.bien.disponibleLe ? this.data.bien.disponibleLe.slice(0, 10) : ''],
    nombrePieces: [this.data.bien.nombrePieces as number | null, [Validators.min(0)]],
    nombreChambres: [this.data.bien.nombreChambres as number | null, [Validators.min(0)]],
    nombreSallesEau: [this.data.bien.nombreSallesEau as number | null, [Validators.min(0)]],
    meuble: [this.data.bien.meuble],
    equipements: [this.data.bien.equipements.join(', ')],
    latitude: [nombre(this.data.bien.latitude) ?? (null as number | null)],
    longitude: [nombre(this.data.bien.longitude) ?? (null as number | null)],
    misEnAvant: [this.data.bien.misEnAvant],
  });

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const payload: AnnoncePayload = {
      titre: valeur.titre?.trim() ?? '',
      description: valeur.description?.trim() ?? '',
      meuble: Boolean(valeur.meuble),
      equipements: (valeur.equipements ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    };
    // Un champ vide n'est pas envoyé : l'API le laisse tel quel plutôt que de
    // l'écraser par zéro.
    const ajouter = <K extends keyof AnnoncePayload>(cle: K, valeurChamp: AnnoncePayload[K] | undefined) => {
      if (valeurChamp !== undefined) payload[cle] = valeurChamp;
    };
    ajouter('loyerMensuel', nombre(valeur.loyerMensuel));
    ajouter('charges', nombre(valeur.charges));
    ajouter('moisCaution', nombre(valeur.moisCaution));
    ajouter('nombrePieces', nombre(valeur.nombrePieces));
    ajouter('nombreChambres', nombre(valeur.nombreChambres));
    ajouter('nombreSallesEau', nombre(valeur.nombreSallesEau));
    ajouter('latitude', nombre(valeur.latitude));
    ajouter('longitude', nombre(valeur.longitude));
    if (valeur.disponibleLe) payload.disponibleLe = valeur.disponibleLe;
    if (this.data.canPublish && valeur.misEnAvant !== this.data.bien.misEnAvant) {
      payload.misEnAvant = Boolean(valeur.misEnAvant);
    }
    this.dialogRef.close(payload);
  }

  static open(dialog: MatDialog, data: AnnonceDialogData): Observable<AnnoncePayload | undefined> {
    return dialog.open(AnnonceDialog, { width: '720px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
