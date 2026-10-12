import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import { SejoursApiService } from '../../../core/services/api/sejours-api.service';
import type { DemandeResiliation } from '../../../core/models/sejour.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { CANAUX_RESILIATION, MOTIFS_RESILIATION, formatJour, libelle, nomVoyageur } from '../sejours/sejour-status';

const JOUR_MS = 24 * 60 * 60 * 1000;

/** AAAA-MM-JJ d'un jour décalé : sans heure, donc sans décalage de fuseau. */
function jourPlus(depuis: string, jours: number): string {
  return new Date(Date.parse(depuis.slice(0, 10)) + jours * JOUR_MS).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// MTM enregistre une demande reçue hors du portail
// ---------------------------------------------------------------------------

export interface DemandeResiliationDialogData {
  bailId: string;
  /** « Aissatou Ba — Appartement à Ngor » : à qui l'on enregistre la demande. */
  libelle: string;
}

/**
 * Demande de résiliation reçue par téléphone, WhatsApp ou courrier : MTM la
 * consigne pour qu'elle soit traitée comme celles du portail (même file, même
 * réponse au locataire, même préavis à l'acceptation).
 */
@Component({
  selector: 'app-demande-resiliation-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Enregistrer une demande de résiliation</h2>
    <mat-dialog-content [formGroup]="form" class="demande">
      <p class="demande__hint">{{ data.libelle }}. La demande rejoint la file des résiliations à traiter.</p>
      <mat-form-field appearance="outline">
        <mat-label>Reçue par</mat-label>
        <mat-select formControlName="canal">
          @for (canal of canaux; track canal[0]) {
            <mat-option [value]="canal[0]">{{ canal[1] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Date de la demande</mat-label>
        <input matInput type="date" formControlName="dateDemande" />
        <mat-hint>Le préavis court à partir d’elle.</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Départ souhaité</mat-label>
        <input matInput type="date" formControlName="dateDepartSouhaitee" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Motif</mat-label>
        <mat-select formControlName="motif">
          <mat-option value="">Non précisé</mat-option>
          @for (motif of motifs; track motif[0]) {
            <mat-option [value]="motif[0]">{{ motif[1] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Message du locataire</mat-label>
        <textarea matInput rows="3" formControlName="message" maxlength="2000"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()" [disabled]="saving()">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .demande { display: grid; gap: 4px; min-width: min(480px, calc(100vw - 96px)); }
    .demande__hint { margin: 0 0 8px; color: var(--mtm-text-muted); font-size: 0.86rem; }
  `,
})
export class DemandeResiliationDialog {
  private readonly api = inject(SejoursApiService);
  private readonly dialogRef = inject(MatDialogRef<DemandeResiliationDialog, DemandeResiliation>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  protected readonly data = inject<DemandeResiliationDialogData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly canaux = Object.entries(CANAUX_RESILIATION).filter(([cle]) => cle !== 'portail');
  protected readonly motifs = Object.entries(MOTIFS_RESILIATION);

  protected readonly form = this.formBuilder.nonNullable.group({
    canal: ['telephone'],
    dateDemande: [new Date().toISOString().slice(0, 10), Validators.required],
    dateDepartSouhaitee: ['', Validators.required],
    motif: [''],
    message: [''],
  });

  protected valider(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .enregistrerResiliation(this.data.bailId, {
        canal: valeur.canal,
        dateDemande: valeur.dateDemande,
        dateDepartSouhaitee: valeur.dateDepartSouhaitee,
        motif: valeur.motif || undefined,
        message: valeur.message.trim() || undefined,
      })
      .subscribe({
        next: (demande) => {
          this.saving.set(false);
          this.dialogRef.close(demande);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }

  static open(dialog: MatDialog, data: DemandeResiliationDialogData): Observable<DemandeResiliation | undefined> {
    return dialog.open(DemandeResiliationDialog, { width: '540px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}

// ---------------------------------------------------------------------------
// Réponse de MTM
// ---------------------------------------------------------------------------

export interface TraiterResiliationDialogData {
  demande: DemandeResiliation;
  preavisJours: number;
}

/**
 * Accepter ouvre le préavis du bail à la date de départ retenue (la plus tardive
 * entre le souhait du locataire et la demande augmentée du préavis, sauf si MTM en
 * décide autrement) ; refuser exige d'expliquer pourquoi au locataire.
 */
@Component({
  selector: 'app-traiter-resiliation-dialog',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Demande de résiliation</h2>
    <mat-dialog-content [formGroup]="form" class="traiter">
      <dl class="traiter__resume">
        <div><dt>Locataire</dt><dd>{{ locataire }}</dd></div>
        <div><dt>Bail</dt><dd>{{ data.demande.bailLocatif.referenceInterne }} · {{ data.demande.bailLocatif.bienLocatif.titre || data.demande.bailLocatif.bienLocatif.commune }}</dd></div>
        <div><dt>Demande reçue</dt><dd>{{ data.demande.dateDemande | date: 'dd/MM/yyyy' }} · {{ libelle(canaux, data.demande.canal) }}</dd></div>
        <div><dt>Départ souhaité</dt><dd>{{ jour(data.demande.dateDepartSouhaitee) }}</dd></div>
        @if (data.demande.motif) {
          <div><dt>Motif</dt><dd>{{ libelle(motifs, data.demande.motif) }}</dd></div>
        }
        @if (data.demande.message) {
          <div class="traiter__message"><dt>Message</dt><dd>{{ data.demande.message }}</dd></div>
        }
      </dl>

      <mat-form-field appearance="outline">
        <mat-label>Décision</mat-label>
        <mat-select formControlName="decision">
          <mat-option value="acceptee">Accepter — ouvrir le préavis</mat-option>
          <mat-option value="refusee">Refuser</mat-option>
        </mat-select>
      </mat-form-field>

      @if (accepte()) {
        <mat-form-field appearance="outline">
          <mat-label>Date de départ retenue</mat-label>
          <input matInput type="date" formControlName="dateDepartRetenue" [min]="data.demande.dateDemande.slice(0, 10)" />
          <mat-hint>Préavis de {{ data.preavisJours }} jours : au plus tôt le {{ jour(departMinimum) }}.</mat-hint>
        </mat-form-field>
        @if (departAvantPreavis()) {
          <p class="traiter__alerte">Cette date est avant la fin du préavis habituel : à n’accorder que par geste commercial.</p>
        }
      }

      <mat-form-field appearance="outline">
        <mat-label>{{ accepte() ? 'Message au locataire (facultatif)' : 'Raison du refus' }}</mat-label>
        <textarea matInput rows="3" formControlName="reponse" maxlength="2000"></textarea>
        @if (!accepte() && form.controls.reponse.touched && form.controls.reponse.invalid) {
          <mat-error>Expliquez au locataire pourquoi la demande est refusée.</mat-error>
        }
      </mat-form-field>
      <p class="traiter__hint">Le locataire est prévenu dans son espace, avec cette réponse.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Fermer</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()" [disabled]="saving()">
        {{ accepte() ? 'Accepter la demande' : 'Refuser la demande' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .traiter { display: grid; gap: 4px; min-width: min(520px, calc(100vw - 96px)); }
    .traiter__resume { display: grid; gap: 6px; margin: 0 0 12px; padding: 12px 14px; border-radius: 10px; background: var(--mtm-bg-surface); font-size: 0.9rem; }
    .traiter__resume div { display: flex; gap: 10px; }
    .traiter__resume dt { flex: 0 0 120px; color: var(--mtm-text-muted); }
    .traiter__resume dd { margin: 0; font-weight: 600; }
    .traiter__message dd { font-weight: 400; white-space: pre-line; }
    .traiter__hint { margin: 0; color: var(--mtm-text-muted); font-size: 0.82rem; }
    .traiter__alerte { margin: 0 0 8px; color: #b7791f; font-size: 0.84rem; }
  `,
})
export class TraiterResiliationDialog {
  private readonly api = inject(SejoursApiService);
  private readonly dialogRef = inject(MatDialogRef<TraiterResiliationDialog, DemandeResiliation>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  protected readonly data = inject<TraiterResiliationDialogData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly jour = formatJour;
  protected readonly libelle = libelle;
  protected readonly motifs = MOTIFS_RESILIATION;
  protected readonly canaux = CANAUX_RESILIATION;
  protected readonly locataire = nomVoyageur(this.data.demande.bailLocatif.locataire);

  /** Fin du préavis habituel : la demande plus le préavis. */
  protected readonly departMinimum = jourPlus(this.data.demande.dateDemande, this.data.preavisJours);
  private readonly souhaite = this.data.demande.dateDepartSouhaitee.slice(0, 10);

  protected readonly form = this.formBuilder.nonNullable.group({
    decision: ['acceptee' as 'acceptee' | 'refusee'],
    dateDepartRetenue: [this.souhaite > this.departMinimum ? this.souhaite : this.departMinimum],
    reponse: [''],
  });

  private readonly decision = signal<'acceptee' | 'refusee'>('acceptee');
  private readonly dateRetenue = signal(this.form.controls.dateDepartRetenue.value);
  protected readonly accepte = computed(() => this.decision() === 'acceptee');
  protected readonly departAvantPreavis = computed(() => this.accepte() && !!this.dateRetenue() && this.dateRetenue() < this.departMinimum);

  constructor() {
    this.form.controls.decision.valueChanges.subscribe((valeur) => this.decision.set(valeur));
    this.form.controls.dateDepartRetenue.valueChanges.subscribe((valeur) => this.dateRetenue.set(valeur));
  }

  protected valider(): void {
    const valeur = this.form.getRawValue();
    if (valeur.decision === 'refusee' && valeur.reponse.trim().length < 5) {
      this.form.controls.reponse.setErrors({ required: true });
      this.form.controls.reponse.markAsTouched();
      return;
    }
    this.saving.set(true);
    this.api
      .traiterResiliation(this.data.demande.id, {
        decision: valeur.decision,
        dateDepartRetenue: valeur.decision === 'acceptee' && valeur.dateDepartRetenue ? valeur.dateDepartRetenue : undefined,
        reponse: valeur.reponse.trim() || undefined,
      })
      .subscribe({
        next: (demande) => {
          this.saving.set(false);
          this.dialogRef.close(demande);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Traitement impossible');
        },
      });
  }

  static open(dialog: MatDialog, data: TraiterResiliationDialogData): Observable<DemandeResiliation | undefined> {
    return dialog.open(TraiterResiliationDialog, { width: '600px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
