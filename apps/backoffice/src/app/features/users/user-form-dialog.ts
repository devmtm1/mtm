import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import { RolesApiService } from '../../core/services/api/roles-api.service';
import { UsersApiService } from '../../core/services/api/users-api.service';
import type { UserListItem } from '../../core/models/user.model';
import type { RoleListItem } from '../../core/models/role.model';
import { NotificationService } from '../../shared/services/notification.service';
import { SENSITIVE_ROLES, roleHelp, roleLabel } from '../admin/admin-labels';

export interface UserFormDialogData {
  user?: UserListItem;
}

interface UserForm {
  email: FormControl<string>;
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  password: FormControl<string>;
  roleId: FormControl<string>;
}

/** Règle imposée par l'API : 12 caractères, majuscule, minuscule, chiffre, caractère spécial. */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

/** Génère un mot de passe provisoire conforme, que l'administrateur transmet à la personne. */
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%*?';
  const all = upper + lower + digits + special;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < 14) chars.push(pick(all));
  return chars.sort(() => Math.random() - 0.5).join('');
}

/**
 * Création / modification d'un compte. À la création, le mot de passe est
 * provisoire : la personne devra le changer à sa première connexion.
 */
@Component({
  selector: 'app-user-form-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './user-form-dialog.html',
  styleUrl: './user-form-dialog.scss',
})
export class UserFormDialog {
  private readonly usersApi = inject(UsersApiService);
  private readonly rolesApi = inject(RolesApiService);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<UserFormDialog>);
  private readonly dialogData = inject<UserFormDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly user = this.dialogData?.user;
  protected readonly isEdit = !!this.user;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly roles = signal<RoleListItem[]>([]);
  protected readonly showPassword = signal(false);
  protected readonly roleLabel = roleLabel;
  protected readonly roleHelp = roleHelp;

  protected readonly form = new FormGroup<UserForm>({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(12), Validators.pattern(PASSWORD_PATTERN)] }),
    roleId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    const user = this.user;
    if (user) {
      this.form.patchValue({ email: user.email, firstName: user.firstName, lastName: user.lastName });
      // En modification, le mot de passe est facultatif mais doit respecter la règle s'il est saisi.
      this.form.controls.password.setValidators([Validators.minLength(12), Validators.pattern(PASSWORD_PATTERN)]);
      this.form.controls.password.updateValueAndValidity();
    } else {
      this.form.controls.password.setValue(generatePassword());
      this.showPassword.set(true);
    }
    // Un sélecteur sans option ne s'ouvre pas : on le garde désactivé (avec
    // une aide « Chargement… ») jusqu'à l'arrivée des rôles.
    this.form.controls.roleId.disable();
    this.rolesApi.findAll().subscribe({
      next: (roles) => {
        this.form.controls.roleId.enable();
        // Le rôle « client » sert à l'espace client du site, pas au back-office.
        this.roles.set(roles.filter((role) => role.name !== 'client').sort((a, b) => roleLabel(a.name).localeCompare(roleLabel(b.name), 'fr')));
        if (user?.roles[0]) {
          const currentRole = roles.find((role) => role.name === user.roles[0]);
          if (currentRole) this.form.controls.roleId.setValue(currentRole.id);
        }
      },
      error: () => {
        this.form.controls.roleId.enable();
        this.errorMessage.set('Impossible de charger les rôles disponibles.');
      },
    });
  }

  protected selectedRole(): RoleListItem | undefined {
    return this.roles().find((role) => role.id === this.form.controls.roleId.value);
  }

  protected selectedRoleNeedsTwoFactor(): boolean {
    const role = this.selectedRole();
    return !!role && SENSITIVE_ROLES.has(role.name);
  }

  protected regeneratePassword(): void {
    this.form.controls.password.setValue(generatePassword());
    this.showPassword.set(true);
  }

  protected toggleShowPassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected copyPassword(): void {
    const value = this.form.controls.password.value;
    if (!value) return;
    void navigator.clipboard?.writeText(value).then(
      () => this.notify.success('Mot de passe copié : transmettez-le à la personne par un canal sûr'),
      () => this.notify.error(null, 'Copie impossible : sélectionnez le mot de passe manuellement'),
    );
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const payload = this.form.getRawValue();
    const request$ = this.isEdit
      ? this.usersApi.update(this.user!.id, { ...payload, password: payload.password || undefined, roleId: payload.roleId || undefined })
      : this.usersApi.create(payload);

    request$.subscribe({
      next: (user: UserListItem) => {
        this.saving.set(false);
        this.notify.success(this.isEdit ? (payload.password ? 'Compte mis à jour : nouveau mot de passe provisoire à transmettre' : 'Compte mis à jour') : 'Compte créé : transmettez le mot de passe provisoire à la personne');
        this.dialogRef.close(user);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.toErrorMessage(error));
      },
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return 'Un compte existe déjà avec cette adresse e-mail.';
      if (error.status === 400 && Array.isArray(error.error?.message)) return error.error.message.join(' ');
      if (error.status === 403) return 'Vous n’avez pas le droit d’effectuer cette action.';
    }
    return 'Une erreur est survenue lors de l’enregistrement du compte.';
  }

  static open(dialog: MatDialog, data: UserFormDialogData): Observable<UserListItem | undefined> {
    return dialog.open(UserFormDialog, { width: '560px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
