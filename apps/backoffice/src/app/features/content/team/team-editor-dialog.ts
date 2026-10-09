import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import { TeamApiService, type TeamKind, type TeamMember, type TeamPayload } from '../../../core/services/api/team-api.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { SessionService } from '../../../core/services/session.service';

export interface TeamEditorData {
  kind: TeamKind;
  existing: TeamMember | null;
  nextOrder: number;
}

const LIBELLES: Record<TeamKind, { titre: string; nom: string; nomAide: string; poste?: string }> = {
  directeur: {
    titre: 'le mot du directeur',
    nom: 'Nom du directeur',
    nomAide: 'Tel qu’il sera signé sous le texte.',
    poste: 'Titre (ex. Directeur général)',
  },
  groupe: {
    titre: 'la photo de groupe',
    nom: 'Légende',
    nomAide: 'Affichée en bas de la photo, ex. « L’équipe MTM Immobilier ».',
  },
  membre: {
    titre: 'un membre de l’équipe',
    nom: 'Nom complet',
    nomAide: 'Prénom et nom, tels qu’affichés aux visiteurs.',
    poste: 'Poste (ex. Responsable commercial)',
  },
};

/** Création / modification d'un contenu de la page Équipe (la photo s'ajoute depuis la carte). */
@Component({
  selector: 'app-team-editor-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Modifier' : 'Ajouter' }} {{ meta.titre }}</h2>
    <mat-dialog-content class="team-dialog" [formGroup]="form">
      <mat-form-field appearance="outline">
        <mat-label>{{ meta.nom }}</mat-label>
        <input matInput formControlName="nom" autocomplete="off" />
        <mat-hint>{{ meta.nomAide }}</mat-hint>
        @if (form.controls.nom.touched && form.controls.nom.invalid) {
          <mat-error>Deux caractères minimum.</mat-error>
        }
      </mat-form-field>

      @if (meta.poste) {
        <mat-form-field appearance="outline">
          <mat-label>{{ meta.poste }}</mat-label>
          <input matInput formControlName="poste" autocomplete="off" />
        </mat-form-field>
      }

      @if (data.kind === 'directeur') {
        <mat-form-field appearance="outline">
          <mat-label>Mot du directeur</mat-label>
          <textarea matInput rows="8" formControlName="message" maxlength="3000"></textarea>
          <mat-hint>Une ligne vide sépare deux paragraphes. {{ form.controls.message.value.length }}/3000</mat-hint>
        </mat-form-field>
      }

      @if (data.kind === 'membre') {
        <mat-form-field appearance="outline" class="team-dialog__order">
          <mat-label>Ordre d’affichage</mat-label>
          <input matInput type="number" min="0" formControlName="ordre" />
          <mat-hint>Les plus petits numéros d’abord.</mat-hint>
        </mat-form-field>
      }

      @if (canPublish) {
        <mat-checkbox formControlName="isActive">Visible sur le site</mat-checkbox>
      }
      @if (!editing) {
        <p class="team-dialog__note">La photo s’ajoute juste après, depuis la carte (bouton « Photo »). Sans photo, le site affiche les initiales.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" [disabled]="saving()" (click)="submit()">
        {{ saving() ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .team-dialog {
      display: grid;
      gap: 12px;
      padding-top: 8px !important;
    }
    .team-dialog__order {
      max-width: 220px;
    }
    .team-dialog__note {
      margin: 0;
      color: var(--mtm-text-muted);
      font-size: 0.82rem;
    }
  `,
})
export class TeamEditorDialog {
  private readonly api = inject(TeamApiService);
  private readonly dialogRef = inject(MatDialogRef<TeamEditorDialog>);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly session = inject(SessionService);
  protected readonly data = inject<TeamEditorData>(MAT_DIALOG_DATA);

  protected readonly meta = LIBELLES[this.data.kind];
  protected readonly editing = !!this.data.existing;
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    nom: [this.data.existing?.nom ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    poste: [this.data.existing?.poste ?? '', Validators.maxLength(200)],
    message: [this.data.existing?.message ?? '', Validators.maxLength(3000)],
    ordre: [this.data.existing?.ordre ?? this.data.nextOrder, Validators.min(0)],
    isActive: [this.data.existing?.isActive ?? true],
  });

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const kind = this.data.kind;
    const fields = {
      nom: value.nom.trim(),
      // Seuls les champs de ce type sont envoyés ; un champ vidé est transmis vide pour être effacé.
      ...(kind !== 'groupe' ? { poste: value.poste.trim() } : {}),
      ...(kind === 'directeur' ? { message: value.message.trim() } : {}),
      ...(kind === 'membre' ? { ordre: Number(value.ordre) || 0 } : {}),
    };
    const existing = this.data.existing;
    const payload: TeamPayload = { kind, ...fields, isActive: this.canPublish ? value.isActive : false };
    const request$: Observable<TeamMember> = existing ? this.api.update(existing.id, fields) : this.api.create(payload);

    request$.subscribe({
      next: (member) => {
        const republish = existing && this.canPublish && existing.isActive !== value.isActive;
        if (!republish) return this.finish(existing ? 'Modifications enregistrées' : 'Ajouté — pensez à lui associer une photo');
        this.api.publish(member.id, value.isActive).subscribe({
          next: () => this.finish(value.isActive ? 'Enregistré et publié' : 'Enregistré et retiré du site'),
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
    this.notify.error(error, 'Impossible d’enregistrer');
  }

  static open(dialog: MatDialog, data: TeamEditorData): Observable<boolean | undefined> {
    return dialog.open(TeamEditorDialog, { width: '580px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
