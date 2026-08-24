import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RolesApiService } from '../../core/services/api/roles-api.service';
import type { CreateRolePayload, RoleListItem } from '../../core/models/role.model';

interface RoleForm {
  name: FormControl<string>;
  description: FormControl<string>;
}

@Component({
  selector: 'app-role-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './role-form-dialog.html',
  styles: `
    .role-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 360px;
      padding-top: 4px;
    }
    .role-dialog-error {
      color: var(--mat-sys-error);
      font-size: 0.85rem;
      margin: 0;
    }
  `,
})
export class RoleFormDialog {
  private readonly rolesApi = inject(RolesApiService);
  private readonly dialogRef = inject(MatDialogRef<RoleFormDialog>);

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup<RoleForm>({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)],
    }),
    description: new FormControl('', { nonNullable: true }),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();
    const payload: CreateRolePayload = {
      name: raw.name,
      description: raw.description || undefined,
    };

    this.rolesApi.create(payload).subscribe({
      next: (role: RoleListItem) => {
        this.saving.set(false);
        this.dialogRef.close(role);
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
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'Un rôle avec ce nom existe déjà.';
    }
    return 'Une erreur est survenue lors de la création du rôle.';
  }
}
