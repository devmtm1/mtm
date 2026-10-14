import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';

export interface TextPromptData {
  title: string;
  /** Pourquoi on demande cette saisie. */
  description?: string;
  label: string;
  placeholder?: string;
  hint?: string;
  /** Vrai par défaut : la saisie est obligatoire. */
  required?: boolean;
  /** Nombre minimal de caractères quand la saisie est obligatoire (3 par défaut). */
  minLength?: number;
  rows?: number;
  initial?: string;
  confirmLabel?: string;
}

/**
 * Saisie d'un texte court (motif, légende…). Remplace le `prompt()` natif :
 * même apparence que le reste de l'interface, validation visible, clavier et
 * lecteurs d'écran pris en charge.
 */
@Component({
  selector: 'app-text-prompt-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (data.description) {
        <p class="prompt-description">{{ data.description }}</p>
      }
      <mat-form-field appearance="outline" class="prompt-field">
        <mat-label>{{ data.label }}</mat-label>
        <textarea matInput cdkFocusInitial [rows]="data.rows ?? 3" [formControl]="texte" [placeholder]="data.placeholder ?? ''"></textarea>
        @if (data.hint) {
          <mat-hint>{{ data.hint }}</mat-hint>
        }
        @if (texte.invalid && texte.touched) {
          <mat-error>{{ minimum }} caractères minimum.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirmer()">
        {{ data.confirmLabel ?? 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .prompt-description {
      margin: 0 0 14px;
      color: var(--mtm-text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .prompt-field {
      width: 100%;
    }
  `,
})
export class TextPromptDialog {
  private readonly dialogRef = inject(MatDialogRef<TextPromptDialog>);
  protected readonly data = inject<TextPromptData>(MAT_DIALOG_DATA);

  protected readonly minimum = this.data.minLength ?? 3;
  protected readonly texte = new FormControl(this.data.initial ?? '', {
    nonNullable: true,
    validators: this.data.required === false ? [] : [Validators.required, Validators.minLength(this.minimum)],
  });

  protected confirmer(): void {
    if (this.texte.invalid) {
      this.texte.markAsTouched();
      return;
    }
    this.dialogRef.close(this.texte.value.trim());
  }

  /** Émet le texte saisi, ou `undefined` si l'utilisateur annule. */
  static ask(dialog: MatDialog, data: TextPromptData): Observable<string | undefined> {
    return dialog
      .open<TextPromptDialog, TextPromptData, string>(TextPromptDialog, { width: '480px', maxWidth: 'calc(100vw - 32px)', data })
      .afterClosed();
  }
}
