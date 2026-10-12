import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import {
  AgendaApiService,
  type EvenementPayload,
  type EvenementUpdate,
  type ItemAgenda,
} from '../../core/services/api/agenda-api.service';
import type { Collaborateur } from '../../core/services/api/taches-api.service';
import { SessionService } from '../../core/services/session.service';
import { ConfirmService } from '../../shared/dialogs/confirm-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { TYPES_EVENEMENT, versChampDateHeure } from './agenda-utils';

export interface EvenementDialogData {
  /** Renseigné en modification. */
  existant?: ItemAgenda;
  /** Date pré-remplie quand on crée depuis une case du calendrier. */
  jour?: Date;
  /** Dossier auquel rattacher le nouvel événement. */
  dossier?: { type: string; id: string; label: string };
}

const RAPPELS: { minutes: number | null; label: string }[] = [
  { minutes: null, label: 'Aucun rappel' },
  { minutes: 15, label: '15 minutes avant' },
  { minutes: 60, label: '1 heure avant' },
  { minutes: 1440, label: '1 jour avant' },
];

/** Création, modification et suppression d'un événement de l'agenda. Se ferme avec `true` si quelque chose a changé. */
@Component({
  selector: 'app-evenement-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.existant ? 'Modifier l’événement' : 'Nouvel événement' }}</h2>
    <mat-dialog-content class="evenement" [formGroup]="form">
      @if (dossier(); as d) {
        <p class="evenement__dossier">Dossier : <strong>{{ d.label }}</strong></p>
      }
      <mat-form-field appearance="outline">
        <mat-label>Titre</mat-label>
        <input matInput formControlName="titre" maxlength="160" autocomplete="off" />
        @if (form.controls.titre.touched && form.controls.titre.invalid) {
          <mat-error>Deux caractères minimum.</mat-error>
        }
      </mat-form-field>
      <div class="evenement__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Nature</mat-label>
          <mat-select formControlName="type">
            @for (type of types; track type.code) {
              <mat-option [value]="type.code">{{ type.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Lieu</mat-label>
          <input matInput formControlName="lieu" maxlength="200" autocomplete="off" />
        </mat-form-field>
      </div>
      <mat-checkbox formControlName="journeeEntiere">Toute la journée</mat-checkbox>
      <div class="evenement__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Début</mat-label>
          <input matInput [type]="form.controls.journeeEntiere.value ? 'date' : 'datetime-local'" formControlName="debut" />
          @if (form.controls.debut.touched && form.controls.debut.invalid) {
            <mat-error>Indiquez le début.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fin (facultatif)</mat-label>
          <input matInput [type]="form.controls.journeeEntiere.value ? 'date' : 'datetime-local'" formControlName="fin" />
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Participants</mat-label>
        <mat-select formControlName="participantIds" multiple>
          @for (collaborateur of collaborateurs(); track collaborateur.id) {
            @if (collaborateur.id !== moi) {
              <mat-option [value]="collaborateur.id">{{ nom(collaborateur) }}</mat-option>
            }
          }
        </mat-select>
        <mat-hint>Les participants sont invités et reçoivent le rappel.</mat-hint>
      </mat-form-field>
      <div class="evenement__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Visible par</mat-label>
          <mat-select formControlName="visibilite">
            <mat-option value="equipe">Toute l’équipe</mat-option>
            <mat-option value="prive">Moi et les participants</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Rappel</mat-label>
          <mat-select formControlName="rappelMinutes">
            @for (rappel of rappels; track rappel.label) {
              <mat-option [value]="rappel.minutes">{{ rappel.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Notes (facultatif)</mat-label>
        <textarea matInput rows="2" formControlName="description" maxlength="2000"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.existant) {
        <button mat-button type="button" class="evenement__supprimer" (click)="supprimer()" [disabled]="enCours()">
          Supprimer
        </button>
      }
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="enregistrer()" [disabled]="enCours()">
        {{ enCours() ? 'Enregistrement…' : data.existant ? 'Enregistrer' : 'Ajouter à l’agenda' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .evenement {
      display: grid;
      gap: 4px;
      min-width: 520px;
    }
    .evenement__ligne {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 12px;
    }
    .evenement__dossier {
      margin: 0 0 10px;
      font-size: 0.88rem;
      color: var(--mtm-text-muted);
    }
    .evenement__supprimer {
      margin-right: auto;
      color: #b91c1c;
    }
    @media (max-width: 640px) {
      .evenement {
        min-width: 0;
      }
      .evenement__ligne {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class EvenementDialog implements OnInit {
  protected readonly data = inject<EvenementDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<EvenementDialog, boolean>>(MatDialogRef);
  private readonly api = inject(AgendaApiService);
  private readonly notify = inject(NotificationService);
  private readonly confirmer = inject(ConfirmService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly moi = this.session.user()?.id ?? '';
  protected readonly types = TYPES_EVENEMENT;
  protected readonly rappels = RAPPELS;
  protected readonly collaborateurs = signal<Collaborateur[]>([]);
  protected readonly enCours = signal(false);

  protected readonly form = this.fb.group({
    titre: [this.data.existant?.titre ?? '', [Validators.required, Validators.minLength(2)]],
    type: [this.data.existant?.type ?? 'rendez_vous'],
    lieu: [this.data.existant?.lieu ?? ''],
    journeeEntiere: [this.data.existant?.journeeEntiere ?? false],
    debut: [this.valeurInitiale()],
    fin: [this.data.existant?.fin ? this.valeur(this.data.existant.fin, this.data.existant.journeeEntiere) : ''],
    participantIds: [(this.data.existant?.participants ?? []).map((p) => p.id).filter((id) => id !== this.session.user()?.id)],
    visibilite: [this.data.existant?.visibilite ?? 'equipe'],
    rappelMinutes: [this.data.existant?.rappelMinutes ?? (null as number | null)],
    description: [this.data.existant?.description ?? ''],
  });

  ngOnInit(): void {
    this.api.collaborateurs().subscribe({
      next: (liste) => this.collaborateurs.set(liste),
      error: (error: unknown) => this.notify.error(error, 'Impossible de charger les collaborateurs'),
    });
    // Passer en « journée entière » garde le jour, pas l'heure.
    this.form.controls.journeeEntiere.valueChanges.subscribe((entiere) => {
      for (const champ of [this.form.controls.debut, this.form.controls.fin]) {
        if (champ.value) champ.setValue(entiere ? champ.value.slice(0, 10) : `${champ.value.slice(0, 10)}T09:00`);
      }
    });
  }

  protected dossier(): { type: string; id: string; label: string } | null {
    if (this.data.dossier) return this.data.dossier;
    const e = this.data.existant;
    return e?.entityType && e.entityId ? { type: e.entityType, id: e.entityId, label: e.entityLabel ?? '' } : null;
  }

  protected nom(c: Collaborateur): string {
    return [c.firstName, c.lastName].filter(Boolean).join(' ');
  }

  private valeur(iso: string, entiere: boolean): string {
    return entiere ? iso.slice(0, 10) : versChampDateHeure(iso);
  }

  private valeurInitiale(): string {
    if (this.data.existant) return this.valeur(this.data.existant.debut, this.data.existant.journeeEntiere);
    const jour = this.data.jour ?? new Date();
    const date = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), 9, 0);
    return versChampDateHeure(date);
  }

  /** « 2026-10-12 » ou « 2026-10-12T09:00 » (heure locale) → instant ISO. */
  private versIso(valeur: string, entiere: boolean): string {
    return entiere ? new Date(`${valeur.slice(0, 10)}T00:00:00.000Z`).toISOString() : new Date(valeur).toISOString();
  }

  protected enregistrer(): void {
    if (this.form.invalid || !this.form.controls.debut.value) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const entiere = v.journeeEntiere;
    const debut = this.versIso(v.debut, entiere);
    const fin = v.fin ? this.versIso(v.fin, entiere) : undefined;
    this.enCours.set(true);

    const existant = this.data.existant;
    const requete: Observable<unknown> = existant
      ? this.api.update(existant.id, this.miseAJour(v, debut, fin))
      : this.api.create(this.creation(v, debut, fin));
    requete.subscribe({
      next: () => {
        this.notify.success(existant ? 'Événement mis à jour' : 'Événement ajouté à l’agenda');
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        this.notify.error(error, 'Enregistrement impossible');
      },
    });
  }

  private creation(v: ReturnType<typeof this.form.getRawValue>, debut: string, fin?: string): EvenementPayload {
    return {
      type: v.type,
      titre: v.titre.trim(),
      description: v.description.trim() || undefined,
      lieu: v.lieu.trim() || undefined,
      debut,
      fin,
      journeeEntiere: v.journeeEntiere,
      visibilite: v.visibilite,
      participantIds: v.participantIds,
      rappelMinutes: v.rappelMinutes ?? undefined,
      entityType: this.data.dossier?.type,
      entityId: this.data.dossier?.id,
    };
  }

  private miseAJour(v: ReturnType<typeof this.form.getRawValue>, debut: string, fin?: string): EvenementUpdate {
    return {
      type: v.type,
      titre: v.titre.trim(),
      description: v.description.trim(),
      lieu: v.lieu.trim(),
      debut,
      fin: fin ?? null,
      journeeEntiere: v.journeeEntiere,
      visibilite: v.visibilite,
      participantIds: v.participantIds,
      rappelMinutes: v.rappelMinutes,
    };
  }

  protected supprimer(): void {
    const existant = this.data.existant;
    if (!existant) return;
    this.confirmer.ask(`Supprimer l’événement « ${existant.titre} » ? Les participants ne le verront plus.`).subscribe((ok) => {
      if (!ok) return;
      this.api.remove(existant.id).subscribe({
        next: () => {
          this.notify.success('Événement supprimé');
          this.dialogRef.close(true);
        },
        error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
      });
    });
  }

  static open(dialog: MatDialog, data: EvenementDialogData): Observable<boolean | undefined> {
    return dialog.open(EvenementDialog, { width: '580px', data }).afterClosed();
  }
}
