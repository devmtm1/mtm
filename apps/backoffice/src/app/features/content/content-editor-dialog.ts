import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContentBlockApiService, type ContentBlock, type CreateContentBlockPayload } from '../../core/services/api/content-block-api.service';

@Component({
  selector: 'app-content-editor-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Modifier' : 'Créer' }} un contenu</h2>
    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Clé</mat-label>
        <input matInput [(ngModel)]="form.key" [disabled]="editing" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Titre (optionnel)</mat-label>
        <input matInput [(ngModel)]="form.title" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="form.type">
          <mat-option value="text">Texte</mat-option>
          <mat-option value="hero">Hero</mat-option>
          <mat-option value="testimonial">Témoignage</mat-option>
          <mat-option value="stat">Statistique</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Ordre d'affichage</mat-label>
        <input matInput type="number" [(ngModel)]="form.ordre" />
      </mat-form-field>

      <mat-checkbox [(ngModel)]="form.isActive">
        <span class="font-medium">Actif</span>
      </mat-checkbox>

      <mat-form-field appearance="outline" class="full-width textarea-field">
        <mat-label>Contenu</mat-label>
        <textarea
          matInput
          rows="6"
          [(ngModel)]="form.content"
          placeholder="Contenu texte ou markdown..."
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Annuler</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="saving()"
        (click)="submit()"
      >
        {{ saving() ? 'Enregistrement...' : (editing ? 'Mettre à jour' : 'Créer') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { min-width: 500px; display: flex; flex-direction: column; gap: 16px; margin-top: 8px; }
    .full-width { width: 100%; }
    .textarea-field textarea { font-family: monospace; }
  `],
})
export class ContentEditorDialog {
  private readonly api = inject(ContentBlockApiService);
  private readonly dialogRef = inject(MatDialogRef<ContentEditorDialog>);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly editing = !!inject<ContentBlock | null>(MAT_DIALOG_DATA, { optional: true });

  private readonly existing = inject<ContentBlock | null>(MAT_DIALOG_DATA, {
    optional: true,
  });
  protected readonly saving = signal(false);

  protected form: CreateContentBlockPayload = {
    key: this.existing?.key ?? '',
    title: this.existing?.title ?? '',
    content: this.existing?.content ?? '',
    type: this.existing?.type ?? 'text',
    ordre: this.existing ? this.existing.ordre : 0,
    isActive: this.existing ? this.existing.isActive : true,
  };

  submit(): void {
    if (!this.form.key || !this.form.content) {
      this.snackBar.open('La clé et le contenu sont obligatoires', 'Fermer', {
        duration: 3000,
      });
      return;
    }
    this.saving.set(true);

    if (this.editing) {
      this.api.update(this.form.key, this.form).subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogRef.close({ updated: true });
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', {
            duration: 3000,
          });
        },
      });
    } else {
      this.api.create(this.form).subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogRef.close({ created: true });
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Erreur lors de la création', 'Fermer', {
            duration: 3000,
          });
        },
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
