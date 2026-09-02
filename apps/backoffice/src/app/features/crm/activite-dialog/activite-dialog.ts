import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import type { ActiviteCrmItem, ProspectOptions } from '../../../core/models/prospect.model';

export type ActiviteDialogMode = 'add' | 'edit' | 'history';

export interface ActiviteDialogData {
  mode: ActiviteDialogMode;
  prospectId: string;
  activite?: ActiviteCrmItem;
}

@Component({
  selector: 'app-activite-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './activite-dialog.html',
  styleUrl: './activite-dialog.scss',
})
export class ActiviteDialog {
  private readonly dialogRef = inject(MatDialogRef<ActiviteDialog, CreateActiviteResult | UpdateActiviteResult>);
  private readonly api = inject(CrmApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  readonly data: ActiviteDialogData = inject(MAT_DIALOG_DATA);

  protected readonly activiteTypes = signal<string[]>([]);
  protected readonly priorites = signal<string[]>([]);
  protected readonly statuts = signal<string[]>([]);
  protected readonly loading = signal(false);
  protected readonly activities: ActiviteCrmItem[] | null = this.data.mode === 'history' ? [] : null;

  readonly form = this.fb.group({
    type: ['', Validators.required],
    priorite: ['moyenne'],
    statut: ['a_faire'],
    titre: ['', Validators.required],
    dateEcheance: [''],
    description: [''],
  });

  constructor() {
    if (this.data.mode !== 'history') {
      this.loadOptions();
    }
    if (this.data.mode === 'edit' && this.data.activite) {
      const a = this.data.activite;
      this.form.patchValue({
        type: a.type,
        priorite: a.priorite,
        statut: a.statut,
        titre: a.titre,
        dateEcheance: a.dateEcheance ? a.dateEcheance.substring(0, 10) : '',
        description: a.description || '',
      });
    }
    if (this.data.mode === 'history') {
      this.loadHistory();
    }
  }

  protected label(value: string): string {
    return CRM_LABELS[value] ?? value;
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload = {
      type: raw.type as string,
      titre: raw.titre as string,
      description: (raw.description || undefined) as string | undefined,
      dateEcheance: raw.dateEcheance ? new Date(raw.dateEcheance).toISOString() : undefined,
      statut: raw.statut as string,
      priorite: raw.priorite as string,
    };
    this.dialogRef.close({ mode: this.data.mode, payload });
  }

  protected updateStatus(activite: ActiviteCrmItem, statut: string): void {
    this.loading.set(true);
    this.api.updateActivite(this.data.prospectId, activite.id, { statut }).subscribe({
      next: () => {
        this.snack.open('Statut mis à jour', 'Fermer', { duration: 2000 });
        this.dialogRef.close({ mode: 'edit', payload: { statut } });
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  private loadOptions(): void {
    this.api.getOptions().subscribe({
      next: (options: ProspectOptions) => {
        this.activiteTypes.set(options.activiteTypes);
        this.priorites.set(options.priorites);
        this.statuts.set(options.activiteStats);
        if (!this.data.activite) {
          this.form.patchValue({
            type: options.activiteTypes[0] ?? '',
            priorite: options.priorites.includes('moyenne') ? 'moyenne' : (options.priorites[0] ?? 'moyenne'),
            statut: options.activiteStats.includes('a_faire') ? 'a_faire' : (options.activiteStats[0] ?? 'a_faire'),
          });
        }
      },
      error: () => this.snack.open('Impossible de charger les options', 'Fermer', { duration: 4000 }),
    });
  }

  private loadHistory(): void {
    this.api.getHistory(this.data.prospectId).subscribe({
      next: () => {
        // historique global (audit) — les activités sont déjà affichées dans la fiche
        // ici on garde juste un placeholder pour le mode history
      },
    });
  }
}

export interface CreateActiviteResult {
  mode: 'add';
  payload: {
    type: string;
    titre: string;
    description?: string;
    dateEcheance?: string;
    statut: string;
    priorite: string;
  };
}

export interface UpdateActiviteResult {
  mode: 'edit';
  payload: { statut?: string; priorite?: string; titre?: string; description?: string; dateEcheance?: string };
}

export const CRM_LABELS: Record<string, string> = {
  nouveau_contact: 'Nouveau contact',
  qualification: 'Qualification',
  proposition: 'Proposition',
  visite: 'Visite',
  negociation: 'Négociation',
  reservation: 'Réservation',
  vente: 'Vente',
  perdu: 'Perdu',
  appel: 'Appel',
  email: 'Email',
  'rendez-vous': 'Rendez-vous',
  tache: 'Tâche',
  relance: 'Relance',
  note: 'Note',
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  a_faire: 'À faire',
  realise: 'Réalisée',
  reporte: 'Reportée',
  annule: 'Annulée',
};
