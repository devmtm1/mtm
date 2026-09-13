import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import type { ActiviteCrmItem, CreateActiviteCrmPayload, ProspectOptions } from '../../../core/models/prospect.model';
import { ACTIVITY_STATUS, ACTIVITY_TYPES, PRIORITIES, help, label } from '../crm-status';

export interface ActiviteDialogData {
  prospectName: string;
  /** Activité à modifier ; absente en création. */
  activite?: ActiviteCrmItem;
  /** Type présélectionné (« Planifier un appel »). */
  type?: string;
}

export type ActiviteDialogResult = CreateActiviteCrmPayload;

const TITLE_SUGGESTIONS: Record<string, string> = {
  appel: 'Rappeler pour faire le point',
  'rendez-vous': 'Visite du terrain',
  tache: 'Envoyer la proposition',
  relance: 'Relance après proposition',
  email: 'Envoyer les documents',
  note: 'Compte rendu',
};

/**
 * Créer ou modifier une activité (appel, rendez-vous, relance…). Chaque
 * type est expliqué ; l'échéance et la priorité servent aux rappels du
 * tableau de bord.
 */
@Component({
  selector: 'app-activite-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.activite ? 'Modifier l’activité' : 'Planifier une action' }}</h2>
    <mat-dialog-content class="activity-dialog">
      <p class="activity-dialog__intro">
        Pour <strong>{{ data.prospectName }}</strong>. Les actions « à faire » avec une échéance apparaissent dans
        vos rappels et dans la liste des prospects.
      </p>
      <form [formGroup]="form" class="activity-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            @for (type of types(); track type) {
              <mat-option [value]="type">{{ typeLabel(type) }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ typeHelp(form.controls.type.value) }}</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Priorité</mat-label>
          <mat-select formControlName="priorite">
            @for (priorite of priorites(); track priorite) {
              <mat-option [value]="priorite">{{ priorityLabel(priorite) }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ priorityHelp(form.controls.priorite.value) }}</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="activity-dialog__wide">
          <mat-label>Titre</mat-label>
          <input matInput formControlName="titre" [placeholder]="suggestion()" autocomplete="off" />
          <mat-error>Indiquez un titre.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Échéance</mat-label>
          <input matInput type="date" formControlName="dateEcheance" />
          <mat-hint>Date à laquelle l’action doit être faite.</mat-hint>
        </mat-form-field>
        @if (data.activite) {
          <mat-form-field appearance="outline">
            <mat-label>Statut</mat-label>
            <mat-select formControlName="statut">
              @for (statut of statuts(); track statut) {
                <mat-option [value]="statut">{{ statusLabel(statut) }}</mat-option>
              }
            </mat-select>
            <mat-hint>{{ statusHelp(form.controls.statut.value) }}</mat-hint>
          </mat-form-field>
        }
        <mat-form-field appearance="outline" class="activity-dialog__wide">
          <mat-label>Détails</mat-label>
          <textarea matInput rows="3" formControlName="description" placeholder="Ce qui a été dit, ce qu’il reste à préparer…"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">
        {{ data.activite ? 'Enregistrer' : 'Planifier' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .activity-dialog { display: grid; gap: 12px; min-width: min(520px, calc(100vw - 96px)); }
    .activity-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .activity-dialog__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; }
    .activity-dialog__wide { grid-column: 1 / -1; }
    @media (max-width: 560px) { .activity-dialog__form { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class ActiviteDialog {
  private readonly dialogRef = inject(MatDialogRef<ActiviteDialog, ActiviteDialogResult | undefined>);
  private readonly api = inject(CrmApiService);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<ActiviteDialogData>(MAT_DIALOG_DATA);

  protected readonly types = signal<string[]>(Object.keys(ACTIVITY_TYPES));
  protected readonly priorites = signal<string[]>(Object.keys(PRIORITIES));
  protected readonly statuts = signal<string[]>(Object.keys(ACTIVITY_STATUS));
  protected readonly suggestion = signal(TITLE_SUGGESTIONS['appel']);

  protected readonly form = this.formBuilder.nonNullable.group({
    type: [this.data.activite?.type ?? this.data.type ?? 'appel', Validators.required],
    priorite: [this.data.activite?.priorite ?? 'moyenne'],
    statut: [this.data.activite?.statut ?? 'a_faire'],
    titre: [this.data.activite?.titre ?? '', [Validators.required, Validators.maxLength(200)]],
    dateEcheance: [this.data.activite?.dateEcheance ? this.data.activite.dateEcheance.slice(0, 10) : ''],
    description: [this.data.activite?.description ?? ''],
  });

  constructor() {
    this.api.getOptions().subscribe({
      next: (options: ProspectOptions) => {
        if (options.activiteTypes.length) this.types.set(options.activiteTypes);
        if (options.priorites.length) this.priorites.set(options.priorites);
        if (options.activiteStats.length) this.statuts.set(options.activiteStats);
      },
    });
    this.form.controls.type.valueChanges.subscribe((type) => this.suggestion.set(TITLE_SUGGESTIONS[type] ?? 'Titre de l’action'));
    this.suggestion.set(TITLE_SUGGESTIONS[this.form.controls.type.value] ?? 'Titre de l’action');
  }

  protected typeLabel(value: string): string {
    return label(ACTIVITY_TYPES, value);
  }

  protected typeHelp(value: string): string {
    return help(ACTIVITY_TYPES, value);
  }

  protected priorityLabel(value: string): string {
    return label(PRIORITIES, value);
  }

  protected priorityHelp(value: string): string {
    return help(PRIORITIES, value);
  }

  protected statusLabel(value: string): string {
    return label(ACTIVITY_STATUS, value);
  }

  protected statusHelp(value: string): string {
    return help(ACTIVITY_STATUS, value);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: ActiviteDialogResult = {
      type: raw.type,
      titre: raw.titre.trim(),
      description: raw.description.trim() || undefined,
      dateEcheance: raw.dateEcheance ? new Date(raw.dateEcheance).toISOString() : undefined,
      statut: raw.statut,
      priorite: raw.priorite,
    };
    this.dialogRef.close(payload);
  }

  static open(dialog: MatDialog, data: ActiviteDialogData): Observable<ActiviteDialogResult | undefined> {
    return dialog.open(ActiviteDialog, { width: '560px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
