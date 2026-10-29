import { Component, inject, signal } from '@angular/core';
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
import { catchError, of, switchMap, type Observable } from 'rxjs';
import { contactRequis } from '../locatif-form';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type { Locataire } from '../../../core/models/locatif.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { EtatCivilChamps } from '../../../shared/components/identite/etat-civil-champs';
import { PieceIdentiteChamps } from '../../../shared/components/piece-identite/piece-identite-champs';

export interface LocataireDialogData {
  locataire?: Locataire;
}

/** Création ou modification d'une fiche locataire (J2.1). */
@Component({
  selector: 'app-locataire-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, EtatCivilChamps, PieceIdentiteChamps],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Modifier le locataire' : 'Nouveau locataire' }}</h2>
    <mat-dialog-content [formGroup]="form" class="locataire-dialog-grid">
      <mat-form-field appearance="outline">
        <mat-label>Prénom</mat-label>
        <input matInput formControlName="firstName" />
        @if (form.controls.firstName.hasError('required')) {
          <mat-error>Le prénom est nécessaire.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Nom</mat-label>
        <input matInput formControlName="lastName" />
        @if (form.controls.lastName.hasError('required')) {
          <mat-error>Le nom est nécessaire.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Téléphone</mat-label>
        <input matInput type="tel" formControlName="phone" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>E-mail</mat-label>
        <input matInput type="email" formControlName="email" />
        @if (form.controls.email.hasError('email')) {
          <mat-error>Adresse e-mail invalide.</mat-error>
        }
      </mat-form-field>
      @if (form.hasError('contactManquant') && form.touched) {
        <p class="wide contact-error">Indiquez au moins un téléphone ou un e-mail : les relances et l'espace locataire en ont besoin.</p>
      }
      <app-etat-civil-champs class="wide" [groupe]="form" />
      <app-piece-identite-champs
        class="wide"
        [groupe]="form"
        [pieceUrl]="data.locataire?.pieceUrl ?? null"
        (fichierChange)="fichierPiece = $event"
        (retraitChange)="retirerPiece = $event"
      />
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Notes internes</mat-label>
        <textarea matInput rows="2" formControlName="notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="saving()">
        {{ saving() ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `.locataire-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 400px; } .wide { grid-column: 1 / -1; } .contact-error { margin: 0; color: var(--mtm-danger, #b52c36); font-size: 0.82rem; }`,
})
export class LocataireDialog {
  private readonly dialogRef = inject(MatDialogRef<LocataireDialog, Locataire>);
  private readonly api = inject(LocatifApiService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<LocataireDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data.locataire;
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    email: [''],
    notes: [''],
    typePiece: [''],
    numeroPiece: ['', Validators.maxLength(50)],
    adresse: ['', Validators.maxLength(200)],
    dateNaissance: [''],
    lieuNaissance: ['', Validators.maxLength(120)],
    nationalite: ['', Validators.maxLength(80)],
    profession: ['', Validators.maxLength(120)],
    pieceValiditeLe: [''],
    urgenceNom: ['', Validators.maxLength(120)],
    urgenceLien: ['', Validators.maxLength(80)],
    urgenceTelephone: ['', Validators.maxLength(30)],
  }, { validators: contactRequis });

  protected fichierPiece: File | null = null;
  protected retirerPiece = false;

  constructor() {
    const locataire = this.data.locataire;
    if (locataire) {
      this.form.patchValue({
        firstName: locataire.firstName,
        lastName: locataire.lastName,
        phone: locataire.phone ?? '',
        email: locataire.email ?? '',
        notes: locataire.notes ?? '',
        typePiece: locataire.typePiece ?? '',
        numeroPiece: locataire.numeroPiece ?? '',
        adresse: locataire.adresse ?? '',
        dateNaissance: locataire.dateNaissance ? locataire.dateNaissance.slice(0, 10) : '',
        lieuNaissance: locataire.lieuNaissance ?? '',
        nationalite: locataire.nationalite ?? '',
        profession: locataire.profession ?? '',
        pieceValiditeLe: locataire.pieceValiditeLe ? locataire.pieceValiditeLe.slice(0, 10) : '',
        urgenceNom: locataire.urgenceNom ?? '',
        urgenceLien: locataire.urgenceLien ?? '',
        urgenceTelephone: locataire.urgenceTelephone ?? '',
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    const payload = {
      firstName: valeur.firstName.trim(),
      lastName: valeur.lastName.trim(),
      phone: texte(valeur.phone),
      email: texte(valeur.email),
      notes: texte(valeur.notes),
      // À la modification, un champ vidé s'efface (null) ; à la création, il reste absent.
      typePiece: texte(valeur.typePiece) ?? (this.isEdit ? null : undefined),
      numeroPiece: texte(valeur.numeroPiece) ?? (this.isEdit ? null : undefined),
      adresse: texte(valeur.adresse) ?? (this.isEdit ? null : undefined),
      dateNaissance: texte(valeur.dateNaissance) ?? (this.isEdit ? null : undefined),
      lieuNaissance: texte(valeur.lieuNaissance) ?? (this.isEdit ? null : undefined),
      nationalite: texte(valeur.nationalite) ?? (this.isEdit ? null : undefined),
      profession: texte(valeur.profession) ?? (this.isEdit ? null : undefined),
      pieceValiditeLe: texte(valeur.pieceValiditeLe) ?? (this.isEdit ? null : undefined),
      urgenceNom: texte(valeur.urgenceNom) ?? (this.isEdit ? null : undefined),
      urgenceLien: texte(valeur.urgenceLien) ?? (this.isEdit ? null : undefined),
      urgenceTelephone: texte(valeur.urgenceTelephone) ?? (this.isEdit ? null : undefined),
    };
    this.saving.set(true);
    const request = this.isEdit
      ? this.api.updateLocataire(this.data.locataire!.id, payload)
      : this.api.createLocataire(payload);
    request
      .pipe(
        switchMap((locataire) =>
          this.api.enregistrerPieceLocataire(locataire.id, this.fichierPiece, this.retirerPiece).pipe(
            // La fiche est enregistrée : un PDF qui n'a pas pu partir se rajoute depuis la fiche, sans tout refaire.
            catchError((error: unknown) => {
              this.notify.error(error, 'Fiche enregistrée, mais la copie de la pièce n’a pas pu être envoyée');
              return of(null);
            }),
            switchMap(() => of(locataire)),
          ),
        ),
      )
      .subscribe({
      next: (locataire) => {
        this.saving.set(false);
        this.dialogRef.close(locataire);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, this.isEdit ? 'Mise à jour impossible' : 'Création impossible');
      },
    });
  }

  static open(dialog: MatDialog, data: LocataireDialogData = {}): Observable<Locataire | undefined> {
    return dialog.open(LocataireDialog, { width: '480px', data }).afterClosed();
  }
}
