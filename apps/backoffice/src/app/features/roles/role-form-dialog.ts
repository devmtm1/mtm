import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { switchMap, type Observable, of } from 'rxjs';
import { RolesApiService } from '../../core/services/api/roles-api.service';
import type { CreateRolePayload, RoleListItem } from '../../core/models/role.model';
import { NotificationService } from '../../shared/services/notification.service';
import { roleLabel } from '../admin/admin-labels';

export interface RoleFormDialogData {
  /** Rôle existant : seule la description se modifie (le nom technique est figé). */
  role?: RoleListItem;
  /** Rôles dont on peut reprendre les droits au départ (un nouveau rôle ne se construit plus case par case). */
  modeles?: RoleListItem[];
}

interface RoleForm {
  name: FormControl<string>;
  description: FormControl<string>;
  modele: FormControl<string>;
}

/** Création d'un rôle (nom technique + description) ou modification de sa description. */
@Component({
  selector: 'app-role-form-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ role ? 'Décrire le rôle ' + roleLabel(role.name) : 'Nouveau rôle' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="role-dialog-content">
        @if (!role) {
          <p class="role-dialog-intro">
            Partez des droits d’un rôle existant (le plus rapide), ou créez-le vide puis donnez-lui ses permissions avec le bouton
            « Permissions » de sa carte. Un rôle sans permission ne donne accès à rien.
          </p>
          <mat-form-field appearance="outline">
            <mat-label>Nom technique</mat-label>
            <input matInput formControlName="name" placeholder="ex. responsable_marketing" autocomplete="off" />
            <mat-hint>Minuscules, chiffres et tirets bas uniquement ; ne pourra plus être changé.</mat-hint>
            @if (form.controls.name.hasError('required') && form.controls.name.touched) {
              <mat-error>Le nom est requis.</mat-error>
            }
            @if (form.controls.name.hasError('pattern') && form.controls.name.touched) {
              <mat-error>Minuscules, chiffres et tirets bas uniquement (ex. responsable_marketing).</mat-error>
            }
          </mat-form-field>
          @if (modeles.length) {
            <mat-form-field appearance="outline">
              <mat-label>Partir des droits de… (facultatif)</mat-label>
              <mat-select formControlName="modele">
                <mat-option value="">Aucun : un rôle vide</mat-option>
                @for (m of modeles; track m.id) {
                  <mat-option [value]="m.id">{{ roleLabel(m.name) }} · {{ m.permissions.length }} droits</mat-option>
                }
              </mat-select>
              <mat-hint>Les droits sont copiés une fois : modifier l’un des deux rôles ensuite ne change pas l’autre.</mat-hint>
            </mat-form-field>
          }
        }
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput rows="3" formControlName="description" placeholder="À qui ce rôle est destiné et ce qu’il permet."></textarea>
          <mat-hint>Affichée aux administrateurs lors de l’attribution d’un rôle.</mat-hint>
        </mat-form-field>
        @if (errorMessage()) {
          <p class="role-dialog-error" role="alert">{{ errorMessage() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="cancel()">Annuler</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
          {{ saving() ? 'Enregistrement…' : role ? 'Enregistrer' : 'Créer le rôle' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .role-dialog-content { display: grid; gap: 6px; min-width: min(460px, calc(100vw - 96px)); }
    .role-dialog-content mat-form-field { width: 100%; }
    .role-dialog-intro { margin: 0 0 8px; color: var(--mtm-text-muted); font-size: var(--mtm-fs-md); line-height: 1.5; }
    .role-dialog-error { margin: 0; padding: 10px 12px; border: 1px solid var(--mtm-accent); border-radius: var(--mtm-radius-sm); background: var(--mtm-accent-subtle); color: var(--mtm-accent); font-size: var(--mtm-fs-sm); }
  `,
})
export class RoleFormDialog {
  private readonly rolesApi = inject(RolesApiService);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<RoleFormDialog>);
  private readonly data = inject<RoleFormDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly role = this.data?.role;
  protected readonly modeles = this.data?.modeles ?? [];
  protected readonly roleLabel = roleLabel;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup<RoleForm>({
    name: new FormControl(this.role?.name ?? '', { nonNullable: true, validators: this.role ? [] : [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)] }),
    description: new FormControl(this.role?.description ?? '', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    modele: new FormControl('', { nonNullable: true }),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();
    const request$: Observable<RoleListItem> = this.role
      ? this.rolesApi.update(this.role.id, { description: raw.description })
      : this.rolesApi.create({ name: raw.name.trim(), description: raw.description || undefined } satisfies CreateRolePayload).pipe(
          // Un modèle choisi : les droits du rôle de départ sont copiés sur le nouveau rôle.
          switchMap((cree) => {
            const modele = this.modeles.find((m) => m.id === raw.modele);
            const droits = modele?.permissions.map((p) => p.permission.name) ?? [];
            return droits.length ? this.rolesApi.assignPermissions(cree.id, droits).pipe(switchMap(() => of(cree))) : of(cree);
          }),
        );

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(this.role ? 'Description mise à jour' : this.form.controls.modele.value ? 'Rôle créé avec les droits du modèle : ajustez-les si besoin' : 'Rôle créé : attribuez-lui maintenant ses permissions');
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(error instanceof HttpErrorResponse && error.status === 409 ? 'Un rôle avec ce nom existe déjà.' : 'Une erreur est survenue lors de l’enregistrement du rôle.');
      },
    });
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  static open(dialog: MatDialog, data: RoleFormDialogData): Observable<boolean | undefined> {
    return dialog.open(RoleFormDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
