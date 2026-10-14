import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideUpload } from '@lucide/angular';
import { type Observable, switchMap, of } from 'rxjs';
import {
  type OperationFinanciere,
  type OperationPayload,
  FinancesApiService,
} from '../../core/services/api/finances-api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ACTIVITES, libelleCategorie } from './finances-utils';

export interface OperationDialogData {
  /** Renseigné en modification. */
  existante?: OperationFinanciere;
}

const MODES = [
  { code: 'especes', label: 'Espèces' },
  { code: 'virement', label: 'Virement' },
  { code: 'mobile_money', label: 'Mobile money' },
  { code: 'cheque', label: 'Chèque' },
  { code: 'carte', label: 'Carte' },
];

const TAILLE_MAX = 10 * 1024 * 1024;
const TYPES_JUSTIFICATIF = 'application/pdf,image/jpeg,image/png,image/webp';

/**
 * Saisie d'une recette ou d'une dépense qui n'a pas d'autre origine dans l'outil
 * (loyer des bureaux, salaires, acompte d'un chantier…). Elle part en attente :
 * une autre personne la valide avant qu'elle ne compte.
 */
@Component({
  selector: 'app-operation-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideUpload],
  template: `
    <h2 mat-dialog-title>{{ data.existante ? 'Modifier la saisie' : 'Nouvelle saisie' }}</h2>
    <mat-dialog-content class="operation" [formGroup]="form">
      <div class="operation__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Nature</mat-label>
          <mat-select formControlName="sens">
            <mat-option value="depense">Dépense</mat-option>
            <mat-option value="recette">Recette</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Activité</mat-label>
          <mat-select formControlName="activite">
            @for (a of activites; track a.code) {
              <mat-option [value]="a.code">{{ a.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Catégorie</mat-label>
        <mat-select formControlName="categorie">
          @for (categorie of categories(); track categorie) {
            <mat-option [value]="categorie">{{ categorieLabel(categorie) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Libellé</mat-label>
        <input matInput formControlName="libelle" maxlength="200" autocomplete="off" placeholder="Ex. Loyer des bureaux — octobre" />
        @if (form.controls.libelle.touched && form.controls.libelle.invalid) {
          <mat-error>Deux caractères minimum.</mat-error>
        }
      </mat-form-field>
      <div class="operation__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Montant (FCFA)</mat-label>
          <input matInput type="number" min="1" step="1" formControlName="montant" />
          @if (form.controls.montant.touched && form.controls.montant.invalid) {
            <mat-error>Un montant entier, supérieur à zéro.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date" [max]="aujourdhui" />
          @if (form.controls.date.touched && form.controls.date.invalid) {
            <mat-error>Indiquez la date.</mat-error>
          }
        </mat-form-field>
      </div>
      <div class="operation__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Mode de paiement</mat-label>
          <mat-select formControlName="modePaiement">
            <mat-option value="">—</mat-option>
            @for (mode of modes; track mode.code) {
              <mat-option [value]="mode.code">{{ mode.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Référence</mat-label>
          <input matInput formControlName="reference" maxlength="120" autocomplete="off" />
          <mat-hint>N° de facture, de virement…</mat-hint>
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Fournisseur ou client</mat-label>
        <input matInput formControlName="tiers" maxlength="160" autocomplete="off" />
      </mat-form-field>

      <div class="operation__piece">
        <label class="operation__upload">
          <svg lucideUpload aria-hidden="true"></svg>
          {{ fichier() ? 'Changer la pièce' : data.existante?.justificatifUrl ? 'Remplacer le justificatif' : 'Joindre un justificatif' }}
          <input type="file" [accept]="types" (change)="choisir($event)" />
        </label>
        <span [class.operation__erreur]="erreurFichier()">
          {{ erreurFichier() ?? fichier()?.name ?? 'Facture, reçu ou relevé : PDF, JPG, PNG — 10 Mo au plus' }}
        </span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="enregistrer()" [disabled]="enCours()">
        {{ enCours() ? 'Enregistrement…' : data.existante ? 'Enregistrer' : 'Envoyer à la validation' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .operation {
      display: grid;
      gap: 4px;
      min-width: 520px;
    }
    .operation__ligne {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 12px;
    }
    .operation__piece {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      font-size: 0.85rem;
      color: var(--mtm-text-muted);
    }
    .operation__upload {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border: 1px solid var(--mtm-border);
      border-radius: 8px;
      cursor: pointer;
      color: var(--mtm-text-dark);
    }
    .operation__upload svg {
      width: 16px;
      height: 16px;
    }
    .operation__upload input {
      display: none;
    }
    .operation__erreur {
      color: #b91c1c;
    }
    @media (max-width: 640px) {
      .operation {
        min-width: 0;
      }
      .operation__ligne {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class OperationDialog implements OnInit {
  protected readonly data = inject<OperationDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<OperationDialog, boolean>>(MatDialogRef);
  private readonly api = inject(FinancesApiService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly activites = ACTIVITES;
  protected readonly modes = MODES;
  protected readonly types = TYPES_JUSTIFICATIF;
  protected readonly aujourdhui = new Date().toISOString().slice(0, 10);

  protected readonly listes = signal<{ depenses: string[]; recettes: string[] }>({ depenses: [], recettes: [] });
  protected readonly fichier = signal<File | null>(null);
  protected readonly erreurFichier = signal<string | null>(null);
  protected readonly enCours = signal(false);

  protected readonly form = this.fb.group({
    sens: [this.data.existante?.sens ?? 'depense'],
    activite: [this.data.existante?.activite ?? 'general'],
    categorie: [this.data.existante?.categorie ?? '', Validators.required],
    libelle: [this.data.existante?.libelle ?? '', [Validators.required, Validators.minLength(2)]],
    montant: [this.data.existante?.montant ?? (null as number | null), [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    date: [this.data.existante?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10), Validators.required],
    modePaiement: [this.data.existante?.modePaiement ?? ''],
    reference: [this.data.existante?.reference ?? ''],
    tiers: [this.data.existante?.tiers ?? ''],
  });

  protected readonly categories = computed(() => {
    const listes = this.listes();
    return this.form.controls.sens.value === 'recette' ? listes.recettes : listes.depenses;
  });

  /** La liste des catégories change avec la nature : la valeur choisie ne doit pas rester d'une autre liste. */
  private sensCourant = this.form.controls.sens.value;

  ngOnInit(): void {
    this.api.categories().subscribe({
      next: (listes) => {
        this.listes.set(listes);
        if (!this.form.controls.categorie.value) {
          this.form.controls.categorie.setValue(this.categories()[0] ?? '');
        }
      },
      error: (error: unknown) => this.notify.error(error, 'Impossible de charger les catégories'),
    });
    this.form.controls.sens.valueChanges.subscribe((sens) => {
      if (sens === this.sensCourant) return;
      this.sensCourant = sens;
      this.listes.update((l) => ({ ...l }));
      this.form.controls.categorie.setValue(this.categories()[0] ?? '');
    });
  }

  protected categorieLabel = libelleCategorie;

  protected choisir(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const accepte = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!accepte) {
      this.erreurFichier.set('Type non accepté : PDF, JPG, PNG ou WebP.');
      this.fichier.set(null);
    } else if (file.size > TAILLE_MAX) {
      this.erreurFichier.set('Fichier de plus de 10 Mo.');
      this.fichier.set(null);
    } else {
      this.erreurFichier.set(null);
      this.fichier.set(file);
    }
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: OperationPayload = {
      sens: v.sens,
      activite: v.activite,
      categorie: v.categorie,
      libelle: v.libelle.trim(),
      montant: Number(v.montant),
      date: v.date,
      modePaiement: v.modePaiement || undefined,
      reference: v.reference.trim() || undefined,
      tiers: v.tiers.trim() || undefined,
    };
    this.enCours.set(true);
    const existante = this.data.existante;
    const fichier = this.fichier();
    (existante ? this.api.updateOperation(existante.id, payload) : this.api.createOperation(payload))
      .pipe(switchMap((operation) => (fichier ? this.api.attachProof(operation.id, fichier) : of(operation))))
      .subscribe({
        next: () => {
          this.notify.success(existante ? 'Saisie mise à jour' : 'Saisie envoyée à la validation');
          this.dialogRef.close(true);
        },
        error: (error: unknown) => {
          this.enCours.set(false);
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }

  static open(dialog: MatDialog, data: OperationDialogData): Observable<boolean | undefined> {
    return dialog.open(OperationDialog, { width: '580px', data }).afterClosed();
  }
}
