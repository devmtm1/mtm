import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import type { Observable } from 'rxjs';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'info';

export interface StatusChoice {
  value: string;
  label?: string;
  /** Une phrase : ce que ce statut implique concrètement. */
  help: string;
  tone: StatusTone;
}

export interface StatusChoiceDialogData {
  title: string;
  /** Pourquoi ce choix compte (une ou deux phrases). */
  intro: string;
  /** Objet concerné, affiché pour éviter les erreurs (« Terrain : T-12 »). */
  subject: string;
  current: string;
  choices: StatusChoice[];
  /** Justification obligatoire (action sensible tracée dans l'audit). */
  justification?: boolean;
  confirmLabel?: string;
}

export interface StatusChoiceResult {
  value: string;
  justification?: string;
}

export function pillClassFor(tone: StatusTone | undefined): string {
  return !tone || tone === 'neutral' ? 'status-pill' : `status-pill status-pill--${tone}`;
}

/**
 * Choix d'un statut parmi une liste expliquée. Commun à tous les modules :
 * même présentation, même comportement, un seul endroit à maintenir.
 */
@Component({
  selector: 'app-status-choice-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="status-dialog">
      <p class="status-dialog__intro">{{ data.intro }}</p>
      <p class="status-dialog__subject">
        {{ data.subject }} · actuellement
        <span [class]="pill(data.current)">{{ label(data.current) }}</span>
      </p>
      <mat-radio-group class="status-dialog__options" [formControl]="value" aria-label="Nouveau statut">
        @for (choice of data.choices; track choice.value) {
          <mat-radio-button class="status-option" [class.is-selected]="value.value === choice.value" [value]="choice.value">
            <span class="status-option__body">
              <span [class]="pillClassFor(choice.tone)">{{ choice.label ?? choice.value }}</span>
              <small>{{ choice.help }}</small>
            </span>
          </mat-radio-button>
        }
      </mat-radio-group>
      @if (data.justification) {
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Justification</mat-label>
          <textarea matInput rows="2" [formControl]="justification" placeholder="Pourquoi ce changement ?"></textarea>
          <mat-hint>Consignée dans le journal d’audit avec votre identifiant.</mat-hint>
          @if (justification.invalid && justification.touched) {
            <mat-error>Trois caractères minimum.</mat-error>
          }
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="!canConfirm()">
        {{ data.confirmLabel ?? 'Appliquer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .status-dialog { display: grid; gap: 14px; max-width: 520px; }
    .status-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.88rem; line-height: 1.5; }
    .status-dialog__subject { margin: 0; font-size: 0.86rem; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .status-dialog__options { display: grid; gap: 8px; }
    .status-option {
      display: block; padding: 4px 10px 4px 0;
      border: 1px solid var(--mtm-border); border-radius: 10px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .status-option ::ng-deep .mdc-form-field { align-items: flex-start; width: 100%; }
    .status-option ::ng-deep .mdc-label { cursor: pointer; padding-top: 2px; }
    .status-option:hover { background: var(--mtm-bg-hover); }
    .status-option.is-selected { border-color: var(--mtm-primary); background: var(--mtm-primary-subtle); }
    .status-option__body { display: grid; gap: 4px; padding: 6px 0; justify-items: start; }
    .status-option__body small { color: var(--mtm-text-muted); font-size: 0.78rem; line-height: 1.4; }
    .w-full { width: 100%; }
  `,
})
export class StatusChoiceDialog {
  private readonly dialogRef = inject(MatDialogRef<StatusChoiceDialog>);
  readonly data = inject<StatusChoiceDialogData>(MAT_DIALOG_DATA);

  protected readonly value = new FormControl(this.data.current, { nonNullable: true, validators: [Validators.required] });
  protected readonly justification = new FormControl('', { nonNullable: true, validators: [Validators.minLength(3)] });
  private readonly selected = signal(this.data.current);
  private readonly justificationText = signal('');
  protected readonly pillClassFor = pillClassFor;

  protected readonly canConfirm = computed(() => {
    const changed = this.selected() !== this.data.current;
    const justified = !this.data.justification || this.justificationText().trim().length >= 3;
    return changed && justified;
  });

  constructor() {
    this.value.valueChanges.subscribe((value) => this.selected.set(value));
    this.justification.valueChanges.subscribe((text) => this.justificationText.set(text));
  }

  protected pill(value: string): string {
    return pillClassFor(this.data.choices.find((choice) => choice.value === value)?.tone);
  }

  protected label(value: string): string {
    return this.data.choices.find((choice) => choice.value === value)?.label ?? value;
  }

  protected confirm(): void {
    if (!this.canConfirm()) return;
    const result: StatusChoiceResult = { value: this.value.value };
    if (this.data.justification) result.justification = this.justification.value.trim();
    this.dialogRef.close(result);
  }

  static open(dialog: MatDialog, data: StatusChoiceDialogData): Observable<StatusChoiceResult | undefined> {
    return dialog.open(StatusChoiceDialog, { width: '540px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
