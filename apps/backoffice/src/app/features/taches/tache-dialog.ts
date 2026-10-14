import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import {
  type Collaborateur,
  type Tache,
  type TachePayload,
  type TacheUpdate,
  TachesApiService,
} from '../../core/services/api/taches-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { PRIORITES, TYPES_DOSSIER_LABELS, nomPersonne } from './taches-status';

export interface TacheDialogData {
  /** Renseigné en modification. */
  existante?: Tache;
  /** Dossier auquel rattacher une nouvelle tâche (depuis la fiche du dossier). */
  dossier?: { type: string; id: string; label: string };
}

/** Création et modification d'une tâche : on l'enregistre ici, la boîte se ferme avec le résultat. */
@Component({
  selector: 'app-tache-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.existante ? 'Modifier la tâche' : 'Nouvelle tâche' }}</h2>
    <mat-dialog-content class="tache-dialog" [formGroup]="form">
      @if (dossierLie(); as dossier) {
        <p class="tache-dialog__dossier">
          Dossier : <strong>{{ typeDossier(dossier.type) }} {{ dossier.label }}</strong>
        </p>
      }
      <mat-form-field appearance="outline">
        <mat-label>Que faut-il faire ?</mat-label>
        <input matInput formControlName="titre" maxlength="160" autocomplete="off" />
        @if (form.controls.titre.touched && form.controls.titre.invalid) {
          <mat-error>Deux caractères minimum.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Détails (facultatif)</mat-label>
        <textarea matInput rows="3" formControlName="description" maxlength="2000"></textarea>
      </mat-form-field>
      <div class="tache-dialog__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Priorité</mat-label>
          <mat-select formControlName="priorite">
            @for (code of priorites; track code) {
              <mat-option [value]="code">{{ libellePriorite(code) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date limite</mat-label>
          <input matInput type="date" formControlName="dateLimite" />
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Responsable</mat-label>
        <mat-select formControlName="responsableId">
          @for (collaborateur of collaborateurs(); track collaborateur.id) {
            <mat-option [value]="collaborateur.id">
              {{ nom(collaborateur) }}{{ collaborateur.id === moi ? ' (moi)' : '' }}
            </mat-option>
          }
        </mat-select>
        <mat-hint>La personne choisie est prévenue.</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="enregistrer()" [disabled]="enCours()">
        {{ enCours() ? 'Enregistrement…' : data.existante ? 'Enregistrer' : 'Créer la tâche' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .tache-dialog {
      display: grid;
      gap: 4px;
      min-width: 480px;
    }
    .tache-dialog__ligne {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 12px;
    }
    .tache-dialog__dossier {
      margin: 0 0 10px;
      font-size: 0.88rem;
      color: var(--mtm-text-muted);
    }
    @media (max-width: 620px) {
      .tache-dialog {
        min-width: 0;
      }
      .tache-dialog__ligne {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class TacheDialog implements OnInit {
  protected readonly data = inject<TacheDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<TacheDialog, Tache | true>>(MatDialogRef);
  private readonly api = inject(TachesApiService);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly moi = this.session.user()?.id ?? '';
  protected readonly priorites = Object.keys(PRIORITES);
  protected readonly collaborateurs = signal<Collaborateur[]>([]);
  protected readonly enCours = signal(false);

  protected readonly form = this.fb.group({
    titre: [this.data.existante?.titre ?? '', [Validators.required, Validators.minLength(2)]],
    description: [this.data.existante?.description ?? ''],
    priorite: [this.data.existante?.priorite ?? 'moyenne'],
    dateLimite: [this.data.existante?.dateLimite?.slice(0, 10) ?? ''],
    responsableId: [this.data.existante?.responsableId ?? this.session.user()?.id ?? ''],
  });

  ngOnInit(): void {
    this.api.collaborateurs().subscribe({
      next: (liste) => this.collaborateurs.set(liste),
      error: (error: unknown) => this.notify.error(error, 'Impossible de charger les collaborateurs'),
    });
  }

  protected dossierLie(): { type: string; id: string; label: string } | null {
    if (this.data.dossier) return this.data.dossier;
    const t = this.data.existante;
    return t?.entityType && t.entityId ? { type: t.entityType, id: t.entityId, label: t.entityLabel ?? '' } : null;
  }

  protected typeDossier(type: string): string {
    return TYPES_DOSSIER_LABELS[type] ?? type;
  }

  protected libellePriorite(code: string): string {
    return PRIORITES[code]?.label ?? code;
  }

  protected nom(collaborateur: Collaborateur): string {
    return nomPersonne(collaborateur);
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.enCours.set(true);
    const existante = this.data.existante;
    const requete = existante
      ? this.api.update(existante.id, this.versMiseAJour(v, existante))
      : this.api.create(this.versCreation(v));
    requete.subscribe({
      next: () => {
        this.notify.success(existante ? 'Tâche mise à jour' : 'Tâche créée');
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        this.notify.error(error, 'Enregistrement impossible');
      },
    });
  }

  private versCreation(v: ReturnType<typeof this.form.getRawValue>): TachePayload {
    return {
      titre: v.titre.trim(),
      description: v.description.trim() || undefined,
      priorite: v.priorite,
      dateLimite: v.dateLimite ? new Date(`${v.dateLimite}T17:00:00`).toISOString() : undefined,
      responsableId: v.responsableId || undefined,
      entityType: this.data.dossier?.type,
      entityId: this.data.dossier?.id,
    };
  }

  private versMiseAJour(v: ReturnType<typeof this.form.getRawValue>, existante: Tache): TacheUpdate {
    const dateAvant = existante.dateLimite?.slice(0, 10) ?? '';
    return {
      titre: v.titre.trim(),
      description: v.description.trim(),
      priorite: v.priorite,
      ...(v.dateLimite !== dateAvant
        ? { dateLimite: v.dateLimite ? new Date(`${v.dateLimite}T17:00:00`).toISOString() : null }
        : {}),
      ...(v.responsableId && v.responsableId !== existante.responsableId ? { responsableId: v.responsableId } : {}),
    };
  }

  static open(dialog: MatDialog, data: TacheDialogData): Observable<Tache | true | undefined> {
    return dialog.open(TacheDialog, { width: '540px', data }).afterClosed();
  }
}
