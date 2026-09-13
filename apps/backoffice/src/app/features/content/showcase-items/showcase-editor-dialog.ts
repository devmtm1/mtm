import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import type { Observable } from 'rxjs';
import { ShowcaseApiService, type CreateShowcaseItemPayload, type ShowcaseItem } from '../../../core/services/api/showcase-api.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { SessionService } from '../../../core/services/session.service';

export interface ShowcaseEditorData {
  existing: ShowcaseItem | null;
  category: string;
  nextOrder: number;
}

const CATEGORIES = [
  { value: 'realisation', label: 'Réalisation', help: 'Projet terminé, livré.' },
  { value: 'projet_a_venir', label: 'Projet à venir', help: 'Programme annoncé, pas encore livré.' },
];

/** Création / modification d'un élément du portfolio (la photo s'ajoute depuis la carte). */
@Component({
  selector: 'app-showcase-editor-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatCheckboxModule],
  templateUrl: './showcase-editor-dialog.html',
  styleUrl: './showcase-editor-dialog.scss',
})
export class ShowcaseEditorDialog {
  private readonly api = inject(ShowcaseApiService);
  private readonly dialogRef = inject(MatDialogRef<ShowcaseEditorDialog>);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly session = inject(SessionService);
  protected readonly data = inject<ShowcaseEditorData>(MAT_DIALOG_DATA);

  protected readonly categories = CATEGORIES;
  protected readonly editing = !!this.data.existing;
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    category: [this.data.existing?.category ?? this.data.category, Validators.required],
    title: [this.data.existing?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    location: [this.data.existing?.location ?? ''],
    date: [this.data.existing?.date ? this.data.existing.date.slice(0, 10) : ''],
    ordre: [this.data.existing?.ordre ?? this.data.nextOrder, [Validators.min(0)]],
    description: [this.data.existing?.description ?? '', Validators.maxLength(2000)],
    isActive: [this.data.existing?.isActive ?? false],
  });

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const payload: CreateShowcaseItemPayload = {
      category: value.category,
      title: value.title.trim(),
      description: value.description.trim() || undefined,
      location: value.location.trim() || undefined,
      date: value.date || undefined,
      ordre: Number(value.ordre) || 0,
    };
    const existing = this.data.existing;
    const request$: Observable<ShowcaseItem> = existing ? this.api.update(existing.id, payload) : this.api.create({ ...payload, isActive: this.canPublish ? value.isActive : false });

    request$.subscribe({
      next: (item) => {
        const publishNeeded = existing && this.canPublish && existing.isActive !== value.isActive;
        if (!publishNeeded) {
          this.finish(existing ? 'Élément mis à jour' : value.isActive && this.canPublish ? 'Élément créé et publié' : 'Élément créé — ajoutez sa photo puis publiez-le');
          return;
        }
        this.api.publish(item.id, value.isActive).subscribe({
          next: () => this.finish(value.isActive ? 'Élément mis à jour et publié' : 'Élément mis à jour et retiré du site'),
          error: (error: unknown) => this.fail(error),
        });
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private finish(message: string): void {
    this.saving.set(false);
    this.notify.success(message);
    this.dialogRef.close(true);
  }

  private fail(error: unknown): void {
    this.saving.set(false);
    this.notify.error(error, 'Impossible d’enregistrer cet élément');
  }

  static open(dialog: MatDialog, data: ShowcaseEditorData): Observable<boolean | undefined> {
    return dialog.open(ShowcaseEditorDialog, { width: '600px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
