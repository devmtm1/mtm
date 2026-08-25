import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RolesApiService } from '../../core/services/api/roles-api.service';
import { UsersApiService } from '../../core/services/api/users-api.service';
import type { UserListItem } from '../../core/models/user.model';
import type { RoleListItem } from '../../core/models/role.model';

interface UserForm {
  email: FormControl<string>;
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  password: FormControl<string>;
  roleId: FormControl<string>;
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './user-form-dialog.html',
  styleUrl: './user-form-dialog.scss',
})
export class UserFormDialog {
  private readonly usersApi = inject(UsersApiService);
  private readonly rolesApi = inject(RolesApiService);
  private readonly dialogRef = inject(MatDialogRef<UserFormDialog>);
  private readonly dialogData = inject<{ user?: UserListItem } | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly isEdit = !!this.dialogData?.user;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly roles = signal<RoleListItem[]>([]);

  protected readonly form = new FormGroup<UserForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12)],
    }),
    roleId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    const user = this.dialogData?.user;
    if (user) {
      this.form.patchValue({ email: user.email, firstName: user.firstName, lastName: user.lastName });
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity();
    }
    this.rolesApi.findAll().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        if (user?.roles[0]) {
          const currentRole = roles.find((role) => role.name === user.roles[0]);
          if (currentRole) this.form.controls.roleId.setValue(currentRole.id);
        }
      },
      error: () => this.errorMessage.set('Impossible de charger les rôles disponibles.'),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    const payload = this.form.getRawValue();

    const request$ = this.isEdit
      ? this.usersApi.update(this.dialogData!.user!.id, { ...payload, password: payload.password || undefined, roleId: payload.roleId || undefined })
      : this.usersApi.create(payload);

    request$.subscribe({
      next: (user: UserListItem) => {
        this.saving.set(false);
        this.dialogRef.close(user);
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
      if (error.status === 409) {
        return 'Un utilisateur avec cet email existe déjà.';
      }
      if (error.status === 400 && Array.isArray(error.error?.message)) {
        return error.error.message.join(' ');
      }
    }
    return "Une erreur est survenue lors de la création de l'utilisateur.";
  }
}
