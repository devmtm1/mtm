import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import type { Observable } from 'rxjs';
import { SettingsApiService } from '../../core/services/api/settings-api.service';
import type { SettingListItem } from '../../core/models/setting.model';
import { NotificationService } from '../../shared/services/notification.service';
import { inferKind, type SettingKind, type SettingSlot } from './settings-catalog';

export interface SettingFormDialogData {
  /** Emplacement du catalogue (libellé, aide, type). */
  slot?: SettingSlot;
  /** Paramètre existant ; absent = création. */
  setting?: SettingListItem;
}

interface SettingForm {
  key: FormControl<string>;
  kind: FormControl<SettingKind>;
  value: FormControl<string>;
  description: FormControl<string>;
  isSensitive: FormControl<boolean>;
}

const KIND_OPTIONS: { value: SettingKind; label: string; help: string }[] = [
  { value: 'text', label: 'Texte', help: 'Une valeur simple.' },
  { value: 'number', label: 'Nombre', help: 'Durée, taux, quantité.' },
  { value: 'list', label: 'Liste', help: 'Une valeur par ligne.' },
  { value: 'json', label: 'Technique (JSON)', help: 'Structure libre, avec le développeur.' },
];

/**
 * Modification d'un paramètre avec un éditeur adapté à son type : une
 * liste se saisit une valeur par ligne, un nombre dans un champ numérique,
 * une structure technique en JSON validé avant envoi.
 */
@Component({
  selector: 'app-setting-form-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatRadioModule],
  templateUrl: './setting-form-dialog.html',
  styleUrl: './setting-form-dialog.scss',
})
export class SettingFormDialog {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<SettingFormDialog>);
  private readonly data = inject<SettingFormDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly slot = this.data?.slot;
  protected readonly setting = this.data?.setting;
  protected readonly isEdit = !!this.setting;
  protected readonly isCustom = !this.slot;
  protected readonly kinds = KIND_OPTIONS;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form: FormGroup<SettingForm>;

  constructor() {
    const kind = this.slot?.kind ?? (this.setting ? inferKind(this.setting.value) : 'text');
    this.form = new FormGroup<SettingForm>({
      key: new FormControl(this.slot?.key ?? this.setting?.key ?? '', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[a-z0-9_.]+$/)] }),
      kind: new FormControl<SettingKind>(kind, { nonNullable: true }),
      value: new FormControl(this.setting && !this.setting.redacted ? this.toText(this.setting.value, kind) : '', { nonNullable: true, validators: [Validators.required] }),
      description: new FormControl(this.setting?.description ?? this.slot?.help ?? '', { nonNullable: true }),
      isSensitive: new FormControl(this.setting?.isSensitive ?? false, { nonNullable: true }),
    });
    if (this.isEdit) this.form.controls.key.disable();
  }

  protected get kind(): SettingKind {
    return this.form.controls.kind.value;
  }

  protected title(): string {
    if (this.slot) return this.slot.label;
    return this.isEdit ? `Modifier ${this.setting?.key}` : 'Nouveau paramètre';
  }

  protected listCount(): number {
    return this.form.controls.value.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    let parsedValue: unknown;
    try {
      parsedValue = this.parse(raw.value, raw.kind);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Valeur invalide.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    const request$: Observable<SettingListItem> = this.isEdit
      ? this.settingsApi.update(raw.key, parsedValue, raw.description || undefined)
      : this.settingsApi.create({ key: raw.key.trim(), value: parsedValue, description: raw.description || undefined, isSensitive: raw.isSensitive });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(this.isEdit ? 'Paramètre enregistré : appliqué immédiatement à toute l’équipe' : 'Paramètre créé');
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.toErrorMessage(error));
      },
    });
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  private toText(value: unknown, kind: SettingKind): string {
    if (kind === 'list' && Array.isArray(value)) return value.map((item) => String(item)).join('\n');
    if (kind === 'number' || kind === 'text') return typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    return JSON.stringify(value, null, 2);
  }

  private parse(text: string, kind: SettingKind): unknown {
    const trimmed = text.trim();
    switch (kind) {
      case 'number': {
        const number = Number(trimmed.replace(',', '.'));
        if (!Number.isFinite(number)) throw new Error('Saisissez un nombre (ex. 15 ou 2.5).');
        return number;
      }
      case 'list': {
        const items = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (items.length === 0) throw new Error('La liste doit contenir au moins une valeur.');
        const duplicates = items.filter((item, index) => items.indexOf(item) !== index);
        if (duplicates.length > 0) throw new Error(`Valeur en double : ${duplicates[0]}.`);
        return items;
      }
      case 'json': {
        try {
          return JSON.parse(trimmed);
        } catch {
          throw new Error('Le format technique (JSON) est invalide : vérifiez les accolades, crochets et virgules.');
        }
      }
      default:
        return trimmed;
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return 'Un paramètre avec cette clé existe déjà.';
      if (error.status === 403) return typeof error.error?.message === 'string' ? error.error.message : 'Vous n’avez pas le droit de modifier ce paramètre.';
      if (error.status === 400 && Array.isArray(error.error?.message)) return error.error.message.join(' ');
    }
    return 'Une erreur est survenue lors de l’enregistrement.';
  }

  static open(dialog: MatDialog, data: SettingFormDialogData): Observable<boolean | undefined> {
    return dialog.open(SettingFormDialog, { width: '600px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
