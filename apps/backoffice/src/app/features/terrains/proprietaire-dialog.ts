import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { ProprietaireSummary } from '../../core/models/terrain.model';
import { SessionService } from '../../core/services/session.service';
import { EtatCivilChamps } from '../../shared/components/identite/etat-civil-champs';
import { PieceIdentiteChamps } from '../../shared/components/piece-identite/piece-identite-champs';

interface ProprietaireForm {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  notes: FormControl<string>;
  typePiece: FormControl<string>;
  numeroPiece: FormControl<string>;
  adresse: FormControl<string>;
  dateNaissance: FormControl<string>;
  lieuNaissance: FormControl<string>;
  nationalite: FormControl<string>;
  profession: FormControl<string>;
  pieceValiditeLe: FormControl<string>;
  urgenceNom: FormControl<string>;
  urgenceLien: FormControl<string>;
  urgenceTelephone: FormControl<string>;
}

/** Ce que renvoie le dialogue : la fiche, plus la copie PDF de la pièce à envoyer ou à retirer. */
export interface ProprietaireDialogResult {
  payload: Omit<ProprietaireSummary, 'id'>;
  fichierPiece: File | null;
  retirerPiece: boolean;
}

@Component({
  selector: 'app-proprietaire-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    EtatCivilChamps,
    PieceIdentiteChamps,
  ],
  templateUrl: './proprietaire-dialog.html',
  styleUrl: './proprietaire-dialog.scss',
})
export class ProprietaireDialog {
  private readonly dialogRef = inject(MatDialogRef<ProprietaireDialog>);
  protected readonly dialogData = inject<{
    proprietaire?: ProprietaireSummary;
    /** Valeurs de départ d'un nouveau propriétaire (ex. une demande reçue du site). */
    prefill?: { firstName: string; lastName: string; email: string; phone: string };
  } | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly isEdit = !!this.dialogData?.proprietaire;
  /**
   * Les coordonnées sont réservées à l'administrateur : un autre peut les saisir à la création
   * (sans pouvoir les relire), mais pas les modifier ensuite.
   */
  protected readonly voitCoordonnees = inject(SessionService).hasRole('administrateur');
  protected readonly coordonneesEditables = this.voitCoordonnees || !this.isEdit;

  protected readonly form = new FormGroup<ProprietaireForm>({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    typePiece: new FormControl('', { nonNullable: true }),
    numeroPiece: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    adresse: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    dateNaissance: new FormControl('', { nonNullable: true }),
    lieuNaissance: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(120)],
    }),
    nationalite: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    profession: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    pieceValiditeLe: new FormControl('', { nonNullable: true }),
    urgenceNom: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    urgenceLien: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    urgenceTelephone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
  });

  protected fichierPiece: File | null = null;
  protected retirerPiece = false;

  constructor() {
    const proprietaire = this.dialogData?.proprietaire;
    if (!proprietaire && this.dialogData?.prefill) this.form.patchValue(this.dialogData.prefill);
    if (proprietaire) {
      this.form.patchValue({
        firstName: proprietaire.firstName,
        lastName: proprietaire.lastName,
        email: proprietaire.email ?? '',
        phone: proprietaire.phone ?? '',
        notes: proprietaire.notes ?? '',
        typePiece: proprietaire.typePiece ?? '',
        numeroPiece: proprietaire.numeroPiece ?? '',
        adresse: proprietaire.adresse ?? '',
        dateNaissance: proprietaire.dateNaissance ? proprietaire.dateNaissance.slice(0, 10) : '',
        lieuNaissance: proprietaire.lieuNaissance ?? '',
        nationalite: proprietaire.nationalite ?? '',
        profession: proprietaire.profession ?? '',
        pieceValiditeLe: proprietaire.pieceValiditeLe
          ? proprietaire.pieceValiditeLe.slice(0, 10)
          : '',
        urgenceNom: proprietaire.urgenceNom ?? '',
        urgenceLien: proprietaire.urgenceLien ?? '',
        urgenceTelephone: proprietaire.urgenceTelephone ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const optional = (item: string) => (item.trim() ? item.trim() : null);
    const payload: Omit<ProprietaireSummary, 'id'> = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: optional(value.email),
      phone: optional(value.phone),
      notes: optional(value.notes),
      // Un non-administrateur ne relit pas la pièce : il ne la réécrit pas non plus.
      ...(this.coordonneesEditables
        ? {
            typePiece: optional(value.typePiece),
            numeroPiece: optional(value.numeroPiece),
            adresse: optional(value.adresse),
            dateNaissance: optional(value.dateNaissance),
            lieuNaissance: optional(value.lieuNaissance),
            nationalite: optional(value.nationalite),
            profession: optional(value.profession),
            pieceValiditeLe: optional(value.pieceValiditeLe),
            urgenceNom: optional(value.urgenceNom),
            urgenceLien: optional(value.urgenceLien),
            urgenceTelephone: optional(value.urgenceTelephone),
          }
        : {}),
    };
    const result: ProprietaireDialogResult = {
      payload,
      fichierPiece: this.coordonneesEditables ? this.fichierPiece : null,
      retirerPiece: this.coordonneesEditables && this.retirerPiece,
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
