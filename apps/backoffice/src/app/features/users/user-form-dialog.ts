import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UsersApiService } from '../../core/services/api/users-api.service';
import type { CreateUserPayload, UserListItem } from '../../core/models/user.model';

interface UserForm {
  email: FormControl<string>;
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './user-form-dialog.html',
  styleUrl: './user-form-dialog.scss',
})
export class UserFormDialog {
  private readonly usersApi = inject(UsersApiService);
  private readonly dialogRef = inject(MatDialogRef<UserFormDialog>);

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

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
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    const payload: CreateUserPayload = this.form.getRawValue();

    this.usersApi.create(payload).subscribe({
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
