import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import type { ReservationRequestItem } from '../../core/models/vente.model';

export interface ReservationRequestDialogData {
  request: ReservationRequestItem;
}

export interface ReservationRequestDialogResult {
  prixVente?: number;
  notes?: string;
}

/**
 * Transformer une demande de réservation reçue du site public en dossier de
 * vente : le prospect est créé (ou retrouvé) automatiquement, le terrain est
 * celui de la demande.
 */
@Component({
  selector: 'app-reservation-request-dialog',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Créer le dossier de vente</h2>
    <mat-dialog-content class="request-dialog">
      <p class="request-dialog__intro">
        La demande devient un dossier de vente : le client est ajouté aux prospects, le terrain est rattaché,
        et vous pourrez enregistrer la réservation et les paiements.
      </p>
      <dl class="request-dialog__facts">
        <div><dt>Client</dt><dd>{{ data.request.nom }}</dd></div>
        <div><dt>Contact</dt><dd>{{ data.request.telephone || '—' }} · {{ data.request.email }}</dd></div>
        <div><dt>Terrain</dt><dd>{{ data.request.terrain.referenceInterne }} — {{ data.request.terrain.nom }}</dd></div>
        <div><dt>Reçue le</dt><dd>{{ data.request.createdAt | date: 'dd/MM/yyyy à HH:mm' }}</dd></div>
        @if (data.request.message) {
          <div class="is-wide"><dt>Message</dt><dd class="is-text">{{ data.request.message }}</dd></div>
        }
      </dl>
      @if (data.request.terrain.statutCommercial !== 'Disponible') {
        <p class="request-dialog__warn">Ce terrain n’est plus « Disponible » ({{ data.request.terrain.statutCommercial }}) : la création peut être refusée.</p>
      }
      <form [formGroup]="form" class="request-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Prix de vente prévisionnel (FCFA)</mat-label>
          <input matInput type="number" min="0" step="1000" formControlName="prixVente" />
          <mat-hint>Facultatif : par défaut, le prix public du terrain.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="2" formControlName="notes" placeholder="Ex. Rappeler avant 18 h"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">Créer le dossier</button>
    </mat-dialog-actions>
  `,
  styles: `
    .request-dialog { display: grid; gap: 12px; min-width: min(500px, calc(100vw - 96px)); }
    .request-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .request-dialog__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin: 0; padding: 12px; border-radius: 10px; background: var(--mtm-bg-surface); }
    .request-dialog__facts dt { color: var(--mtm-text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .request-dialog__facts dd { margin: 2px 0 0; font-size: 0.86rem; font-weight: 500; }
    .request-dialog__facts .is-wide { grid-column: 1 / -1; }
    .request-dialog__facts .is-text { white-space: pre-line; font-weight: 400; }
    .request-dialog__warn { margin: 0; padding: 10px 12px; border-radius: 8px; background: var(--mtm-warning-bg); color: var(--mtm-warning); font-size: 0.82rem; }
    .request-dialog__form { display: grid; gap: 4px; }
  `,
})
export class ReservationRequestDialog {
  private readonly dialogRef = inject(MatDialogRef<ReservationRequestDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<ReservationRequestDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    prixVente: [null as number | null, Validators.min(0)],
    notes: [''],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const result: ReservationRequestDialogResult = {
      ...(raw.prixVente !== null && raw.prixVente > 0 ? { prixVente: Number(raw.prixVente) } : {}),
      ...(raw.notes.trim() ? { notes: raw.notes.trim() } : {}),
    };
    this.dialogRef.close(result);
  }

  static open(dialog: MatDialog, data: ReservationRequestDialogData): Observable<ReservationRequestDialogResult | undefined> {
    return dialog.open(ReservationRequestDialog, { width: '560px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
