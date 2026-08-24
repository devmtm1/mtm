import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SettingsApiService } from '../../core/services/api/settings-api.service';
import type { SettingListItem } from '../../core/models/setting.model';

export interface SettingFormDialogData {
  setting?: SettingListItem;
}

interface SettingForm {
  key: FormControl<string>;
  value: FormControl<string>;
  description: FormControl<string>;
  isSensitive: FormControl<boolean>;
}

@Component({
  selector: 'app-setting-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './setting-form-dialog.html',
  styleUrl: './setting-form-dialog.scss',
})
export class SettingFormDialog {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly dialogRef = inject(MatDialogRef<SettingFormDialog>);

  protected readonly isEdit: boolean;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form: FormGroup<SettingForm>;

  constructor() {
    const data = inject<SettingFormDialogData | null>(MAT_DIALOG_DATA, {
      optional: true,
    });
    this.isEdit = !!data?.setting;

    this.form = new FormGroup<SettingForm>({
      key: new FormControl(data?.setting?.key ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[a-z0-9_.]+$/)],
      }),
      value: new FormControl(
        data?.setting?.redacted
          ? ''
          : JSON.stringify(data?.setting?.value ?? ''),
        { nonNullable: true, validators: [Validators.required] },
      ),
      description: new FormControl(data?.setting?.description ?? '', {
        nonNullable: true,
      }),
      isSensitive: new FormControl(data?.setting?.isSensitive ?? false, {
        nonNullable: true,
      }),
    });

    if (this.isEdit) {
      this.form.controls.key.disable();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(raw.value);
    } catch {
      // Valeur non-JSON (ex: texte simple) : on l'accepte telle quelle en
      // chaîne, pour rester convivial (l'utilisateur ne doit pas connaître
      // la syntaxe JSON pour saisir "5" ou "Bonjour").
      parsedValue = raw.value;
    }

    const request$ = this.isEdit
      ? this.settingsApi.update(raw.key, parsedValue, raw.description || undefined)
      : this.settingsApi.create({
          key: raw.key,
          value: parsedValue,
          description: raw.description || undefined,
          isSensitive: raw.isSensitive,
        });

    request$.subscribe({
      next: (setting: SettingListItem) => {
        this.saving.set(false);
        this.dialogRef.close(setting);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.toErrorMessage(error));
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return 'Un paramètre avec cette clé existe déjà.';
      if (error.status === 403) {
        return typeof error.error?.message === 'string'
          ? error.error.message
          : 'Permission insuffisante pour ce paramètre.';
      }
    }
    return 'Une erreur est survenue.';
  }
}
