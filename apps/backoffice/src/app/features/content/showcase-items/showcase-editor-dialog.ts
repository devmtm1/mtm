import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ShowcaseApiService,
  type CreateShowcaseItemPayload,
  type ShowcaseItem,
} from '../../../core/services/api/showcase-api.service';

@Component({
  selector: 'app-showcase-editor-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './showcase-editor-dialog.html',
  styleUrl: './showcase-editor-dialog.scss',
})
export class ShowcaseEditorDialog {
  private readonly api = inject(ShowcaseApiService);
  private readonly dialogRef = inject(MatDialogRef<ShowcaseEditorDialog>);
  private readonly snackBar = inject(MatSnackBar);

  private readonly existing = inject<ShowcaseItem | null>(MAT_DIALOG_DATA, { optional: true });
  protected readonly editing = !!this.existing;
  protected readonly saving = signal(false);

  protected form: CreateShowcaseItemPayload & { date: string } = {
    category: this.existing?.category ?? 'realisation',
    title: this.existing?.title ?? '',
    description: this.existing?.description ?? '',
    location: this.existing?.location ?? '',
    date: this.existing?.date ? this.existing.date.slice(0, 10) : '',
    ordre: this.existing?.ordre ?? 0,
  };

  submit(): void {
    if (!this.form.title.trim()) {
      this.snackBar.open('Le titre est obligatoire', 'Fermer', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    const payload: CreateShowcaseItemPayload = {
      category: this.form.category,
      title: this.form.title,
      description: this.form.description || undefined,
      location: this.form.location || undefined,
      date: this.form.date || undefined,
      ordre: this.form.ordre ?? 0,
    };

    const request$ = this.editing
      ? this.api.update(this.existing!.id, payload)
      : this.api.create({ ...payload, isActive: false });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(this.editing ? { updated: true } : { created: true });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Erreur lors de l’enregistrement', 'Fermer', { duration: 3000 });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
