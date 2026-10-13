import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';

export interface NextActionData {
  /** Le prospect concerné, rappelé en tête de la boîte. */
  subject: string;
  /** Action déjà prévue, proposée comme point de départ. */
  action?: string | null;
}

export interface NextActionResult {
  prochaineAction: string;
  prochaineRelanceLe: string;
}

/** Raccourcis de date : on relance le plus souvent « demain » ou « dans trois jours ». */
const RACCOURCIS = [
  { label: 'Demain', jours: 1 },
  { label: 'Dans 3 jours', jours: 3 },
  { label: 'Dans 1 semaine', jours: 7 },
  { label: 'Dans 2 semaines', jours: 14 },
];

function dansJours(jours: number): string {
  const date = new Date();
  date.setDate(date.getDate() + jours);
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/**
 * Prochaine action et date de relance d'un prospect. MTM veut qu'aucun
 * prospect actif ne reste sans suite : ce dialogue remplace deux `prompt()`
 * natifs (texte libre, puis un nombre de jours à deviner) par une saisie
 * guidée — action, raccourcis de date, calendrier.
 */
@Component({
  selector: 'app-next-action-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Prochaine action</h2>
    <mat-dialog-content>
      <p class="na-subject">{{ data.subject }}</p>
      <p class="na-description">Aucun prospect actif ne reste sans suite : dites ce qu’il y a à faire et quand.</p>
      <form [formGroup]="form" class="na-form">
        <mat-form-field appearance="outline">
          <mat-label>Que faut-il faire ?</mat-label>
          <input matInput cdkFocusInitial formControlName="action" placeholder="Ex. Rappeler après la visite, envoyer le plan" />
          @if (form.controls.action.invalid && form.controls.action.touched) {
            <mat-error>Indiquez l’action à mener.</mat-error>
          }
        </mat-form-field>
        <div class="na-raccourcis" role="group" aria-label="Quand relancer">
          @for (raccourci of raccourcis; track raccourci.jours) {
            <button type="button" class="na-raccourci" [class.is-active]="form.controls.date.value === dans(raccourci.jours)" (click)="choisir(raccourci.jours)">
              {{ raccourci.label }}
            </button>
          }
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Date de relance</mat-label>
          <input matInput type="date" formControlName="date" [min]="aujourdhui" />
          @if (form.controls.date.invalid && form.controls.date.touched) {
            <mat-error>Choisissez une date à partir d’aujourd’hui.</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirmer()">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .na-subject {
      margin: 0 0 4px;
      font-weight: 700;
    }

    .na-description {
      margin: 0 0 14px;
      color: var(--mtm-text-muted);
      font-size: 0.88rem;
    }

    .na-form {
      display: grid;
      gap: 4px;
    }

    .na-raccourcis {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 14px;
    }

    .na-raccourci {
      padding: 6px 14px;
      border: 1px solid var(--mtm-border);
      border-radius: 999px;
      background: var(--mtm-card-bg);
      color: var(--mtm-text-muted);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        border-color: var(--mtm-primary);
        color: var(--mtm-primary);
      }

      &.is-active {
        border-color: var(--mtm-primary);
        background: var(--mtm-primary);
        color: var(--mat-sys-on-primary);
      }
    }
  `,
})
export class NextActionDialog {
  private readonly dialogRef = inject(MatDialogRef<NextActionDialog>);
  protected readonly data = inject<NextActionData>(MAT_DIALOG_DATA);

  protected readonly raccourcis = RACCOURCIS;
  protected readonly aujourdhui = dansJours(0);
  protected readonly dans = dansJours;

  protected readonly form = new FormGroup({
    action: new FormControl(this.data.action ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    date: new FormControl(dansJours(3), {
      nonNullable: true,
      validators: [Validators.required, (c) => (c.value && c.value < dansJours(0) ? { passee: true } : null)],
    }),
  });

  protected choisir(jours: number): void {
    this.form.controls.date.setValue(dansJours(jours));
  }

  protected confirmer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { action, date } = this.form.getRawValue();
    // Midi : la date reste la bonne quel que soit le fuseau d'affichage.
    this.dialogRef.close({ prochaineAction: action.trim(), prochaineRelanceLe: new Date(`${date}T12:00:00`).toISOString() });
  }

  /** Émet l'action et la date, ou `undefined` si l'utilisateur annule. */
  static ask(dialog: MatDialog, data: NextActionData): Observable<NextActionResult | undefined> {
    return dialog
      .open<NextActionDialog, NextActionData, NextActionResult>(NextActionDialog, { width: '480px', maxWidth: 'calc(100vw - 32px)', data })
      .afterClosed();
  }
}
