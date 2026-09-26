import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import type {
  IntervenantChantier,
  IntervenantPayload,
} from '../../../core/models/chantier.model';
import { METIERS, STATUTS_INTERVENANT, label, montant } from '../chantier-status';

export interface PrestataireDialogData {
  metiers: string[];
  statuts: string[];
  intervenant?: IntervenantChantier;
}

/**
 * Prestataire du chantier (section 16 : « prestataires »).
 *
 * Le montant du contrat n'entre dans les engagements que si le prestataire
 * est réellement engagé : un contact seulement pressenti, ou un contrat
 * résilié, ne pèse pas sur le budget.
 */
@Component({
  selector: 'app-prestataire-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.intervenant ? 'Modifier le prestataire' : 'Nouveau prestataire' }}
    </h2>
    <mat-dialog-content [formGroup]="form" class="prestataire-dialog">
      <div class="prestataire-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Nom ou raison sociale</mat-label>
          <input matInput formControlName="nom" />
          <mat-error>Indiquez le nom du prestataire.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Corps de métier</mat-label>
          <mat-select formControlName="metier">
            @for (metier of data.metiers; track metier) {
              <mat-option [value]="metier">{{ metierLabel(metier) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="prestataire-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Téléphone</mat-label>
          <input matInput formControlName="telephone" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>E-mail</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>
      </div>

      <div class="prestataire-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Référence du contrat</mat-label>
          <input matInput formControlName="reference" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Montant du contrat (FCFA)</mat-label>
          <input matInput type="number" min="0" formControlName="montantContrat" />
          <mat-hint>Compté dans les engagements une fois le contrat signé.</mat-hint>
        </mat-form-field>
      </div>

      <div class="prestataire-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Début d’intervention</mat-label>
          <input matInput type="date" formControlName="dateDebut" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fin d’intervention</mat-label>
          <input matInput type="date" formControlName="dateFin" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Situation</mat-label>
        <mat-select formControlName="statut">
          @for (statut of data.statuts; track statut) {
            <mat-option [value]="statut">{{ statutLabel(statut) }}</mat-option>
          }
        </mat-select>
        <mat-hint>{{ aideStatut() }}</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="2" formControlName="notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        (click)="confirm()"
        [disabled]="form.invalid"
      >
        {{ data.intervenant ? 'Enregistrer' : 'Ajouter' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .prestataire-dialog {
      display: grid;
      gap: 4px;
      min-width: 500px;
    }
    .prestataire-dialog__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }
    @media (max-width: 580px) {
      .prestataire-dialog { min-width: 0; }
      .prestataire-dialog__row { grid-template-columns: 1fr; }
    }
  `,
})
export class PrestataireDialog {
  protected readonly data = inject<PrestataireDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<PrestataireDialog, IntervenantPayload>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    nom: [
      this.data.intervenant?.nom ?? '',
      [Validators.required, Validators.minLength(2)],
    ],
    metier: [this.data.intervenant?.metier ?? this.data.metiers[0] ?? 'autre'],
    telephone: [this.data.intervenant?.telephone ?? ''],
    email: [this.data.intervenant?.email ?? ''],
    reference: [this.data.intervenant?.reference ?? ''],
    montantContrat: [
      this.data.intervenant
        ? montant(this.data.intervenant.montantContrat) || null
        : (null as number | null),
    ],
    dateDebut: [this.data.intervenant?.dateDebut?.slice(0, 10) ?? ''],
    dateFin: [this.data.intervenant?.dateFin?.slice(0, 10) ?? ''],
    statut: [this.data.intervenant?.statut ?? 'engage'],
    notes: [this.data.intervenant?.notes ?? ''],
  });

  protected metierLabel(code: string): string {
    return label(METIERS, code);
  }

  protected statutLabel(code: string): string {
    return label(STATUTS_INTERVENANT, code);
  }

  /** Dit à la saisie si le montant comptera, plutôt que de la laisser deviner. */
  protected aideStatut(): string {
    const statut = this.form.controls.statut.value;
    if (statut === 'pressenti') {
      return 'Pressenti : son montant n’entre pas dans les engagements.';
    }
    if (statut === 'resilie') {
      return 'Résilié : son montant sort des engagements.';
    }
    return 'Son montant est compté dans les engagements du chantier.';
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    const date = (item: string) =>
      item ? item : this.data.intervenant ? null : undefined;

    this.dialogRef.close({
      nom: valeur.nom.trim(),
      metier: valeur.metier,
      telephone: texte(valeur.telephone),
      email: texte(valeur.email),
      reference: texte(valeur.reference),
      montantContrat: valeur.montantContrat ?? undefined,
      dateDebut: date(valeur.dateDebut),
      dateFin: date(valeur.dateFin),
      statut: valeur.statut,
      notes: texte(valeur.notes),
    });
  }

  static open(
    dialog: MatDialog,
    data: PrestataireDialogData,
  ): Observable<IntervenantPayload | undefined> {
    return dialog
      .open(PrestataireDialog, { width: '580px', data })
      .afterClosed();
  }
}
