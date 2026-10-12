import { Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { type Observable, map } from 'rxjs';

export interface ConfirmDialogData {
  message: string;
  title?: string;
  /** Texte du bouton d'action : « Supprimer », « Retirer »… (« Confirmer » par défaut). */
  confirmLabel?: string;
  /** Action destructive : le bouton passe en rouge. */
  danger?: boolean;
}

/** Libellé du bouton d'après le premier mot du message (« Supprimer … » → « Supprimer »). */
export function libelleAction(message: string): string {
  const mot = message.trim().split(/\s+/)[0] ?? '';
  return ['Supprimer', 'Retirer', 'Annuler'].includes(mot) ? mot : 'Confirmer';
}

/**
 * Confirmation avant une action irréversible. Remplace le `confirm()` natif :
 * même apparence que le reste de l'interface, boutons nommés selon l'action,
 * focus piégé dans la boîte et fermeture au clavier.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title ?? 'Confirmation' }}</h2>
    <mat-dialog-content>
      <p class="confirm-message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" [mat-dialog-close]="false">Annuler</button>
      <button
        mat-flat-button
        type="button"
        [color]="data.danger ? 'warn' : 'primary'"
        [mat-dialog-close]="true"
        cdkFocusInitial
      >
        {{ data.confirmLabel ?? 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .confirm-message {
      margin: 0;
      white-space: pre-line;
    }
  `,
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  /** Émet `true` si l'utilisateur confirme, `false` s'il annule ou ferme la boîte. */
  ask(data: ConfirmDialogData | string): Observable<boolean> {
    const options = typeof data === 'string' ? { message: data } : data;
    const label = options.confirmLabel ?? libelleAction(options.message);
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '440px',
        data: { ...options, confirmLabel: label, danger: options.danger ?? label !== 'Confirmer' },
      })
      .afterClosed()
      .pipe(map((reponse) => reponse === true));
  }
}
