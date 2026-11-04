import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  type CategorieLot,
  type GenererLotsPayload,
  ProgrammesApiService,
} from '../../core/services/api/programmes-api.service';
import { NotificationService } from '../../shared/services/notification.service';

export interface GenererLotsDialogData {
  programmeId: string;
  nomProgramme: string;
  categories: CategorieLot[];
  /** Numéros des lots existants : le prochain lot se numérote à la suite, sans collision. */
  numerosExistants: string[];
}

/** Prochain numéro à la suite des lots existants : leur préfixe commun et le rang suivant le plus grand. */
export function suiteDeNumerotation(numeros: string[]): { prefixe: string; debut: number } {
  let prefixe = 'Lot ';
  let plusGrand = 0;
  for (const numero of numeros) {
    const m = /^(.*?)(\d+)$/.exec(numero);
    if (!m) continue;
    prefixe = m[1];
    plusGrand = Math.max(plusGrand, Number(m[2]));
  }
  return { prefixe, debut: plusGrand + 1 };
}

/** Rang complété à deux chiffres au moins, comme le fait l'API (A-01 … A-30, A-100). */
export function numeroApercu(prefixe: string, rang: number, largeur: number): string {
  return `${prefixe}${String(rang).padStart(largeur, '0')}`;
}

/** « 30 lots, de A-01 à A-30 » : les lots d'un programme se créent en série, pas un par un. */
@Component({
  selector: 'app-generer-lots-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Générer des lots</h2>
    <mat-dialog-content class="generer" [formGroup]="form">
      <p class="generer__aide">
        Les lots de « {{ data.nomProgramme }} » sont créés d'un coup, avec les conditions du programme. Vous
        corrigerez ensuite seulement les exceptions.
      </p>
      <div class="generer__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Nombre de lots</mat-label>
          <input matInput type="number" min="1" max="300" formControlName="nombre" />
          @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
            <mat-error>Entre 1 et 300.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Surface de chaque lot (m²)</mat-label>
          <input matInput type="number" min="0" formControlName="superficie" />
          <mat-hint>Facultatif : modifiable lot par lot.</mat-hint>
        </mat-form-field>
      </div>
      <div class="generer__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Début du numéro</mat-label>
          <input matInput formControlName="prefixe" maxlength="10" autocomplete="off" />
          <mat-hint>Par exemple « A- ».</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Premier numéro</mat-label>
          <input matInput type="number" min="0" formControlName="debut" />
        </mat-form-field>
      </div>
      @if (data.categories.length) {
        <mat-form-field appearance="outline">
          <mat-label>Catégorie de ces lots</mat-label>
          <mat-select formControlName="categorieLotId">
            <mat-option value="">Aucune (conditions du programme)</mat-option>
            @for (c of data.categories; track c.id) {
              <mat-option [value]="c.id">{{ c.nom }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
      <p class="generer__apercu" aria-live="polite">{{ apercu() }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="generer()" [disabled]="enCours()">
        {{ enCours() ? 'Création…' : 'Créer les lots' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .generer {
      display: grid;
      gap: 10px;
      min-width: min(520px, 80vw);
    }
    .generer__aide {
      margin: 0 0 8px;
      color: var(--mtm-text-muted);
      font-size: 0.88rem;
    }
    .generer__ligne {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .generer__apercu {
      margin: 4px 0 0;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--mtm-primary-subtle);
      color: var(--mtm-primary);
      font-weight: 600;
    }
    @media (max-width: 600px) {
      .generer__ligne {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class GenererLotsDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProgrammesApiService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<GenererLotsDialog, boolean>);
  protected readonly data = inject<GenererLotsDialogData>(MAT_DIALOG_DATA);

  protected readonly enCours = signal(false);
  private readonly suite = suiteDeNumerotation(this.data.numerosExistants);
  protected readonly form = this.fb.nonNullable.group({
    nombre: [10, [Validators.required, Validators.min(1), Validators.max(300)]],
    superficie: [null as number | null],
    prefixe: [this.suite.prefixe],
    debut: [this.suite.debut, [Validators.required, Validators.min(0)]],
    categorieLotId: [''],
  });

  private readonly valeurs = signal(this.form.getRawValue());
  constructor() {
    this.form.valueChanges.subscribe(() => this.valeurs.set(this.form.getRawValue()));
  }

  protected readonly apercu = computed(() => {
    const { nombre, prefixe, debut } = this.valeurs();
    const n = Number(nombre);
    if (!Number.isInteger(n) || n < 1 || n > 300) return 'Indiquez un nombre de lots entre 1 et 300.';
    const premier = Number(debut) || 0;
    const largeur = Math.max(2, String(premier + n - 1).length);
    const de = numeroApercu(prefixe, premier, largeur);
    const a = numeroApercu(prefixe, premier + n - 1, largeur);
    return n === 1 ? `1 lot : ${de}` : `${n} lots, de ${de} à ${a}`;
  });

  protected generer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: GenererLotsPayload = {
      nombre: Number(v.nombre),
      prefixe: v.prefixe,
      debut: Number(v.debut),
      ...(v.superficie !== null && Number(v.superficie) > 0 ? { superficie: Number(v.superficie) } : {}),
      ...(v.categorieLotId ? { categorieLotId: v.categorieLotId } : {}),
    };
    this.enCours.set(true);
    this.api.genererLots(this.data.programmeId, payload).subscribe({
      next: (res) => {
        this.notifications.success(`${res.crees} lots créés (${res.premier} à ${res.dernier}).`);
        this.dialogRef.close(true);
      },
      error: (erreur) => {
        this.enCours.set(false);
        this.notifications.error(erreur, "Les lots n'ont pas pu être créés");
      },
    });
  }
}
