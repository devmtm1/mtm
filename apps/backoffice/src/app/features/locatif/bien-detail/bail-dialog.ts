import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucidePlus } from '@lucide/angular';
import type { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type { CreateBailPayload, Locataire } from '../../../core/models/locatif.model';
import {
  TYPES_PIECES,
  datesBailCoherentes,
  nombreOuUndefined,
  trierFichiers,
  valeursParDefautBail,
} from '../locatif-form';
import { NotificationService } from '../../../shared/services/notification.service';
import { LocataireQuickAddDialog } from './locataire-quick-add-dialog';

export interface BailDialogData {
  locataires: Locataire[];
  /** Loyer, charges et caution du bien : proposés comme valeurs de départ. */
  bien?: { loyerMensuel: number | string | null; charges: number | string | null; moisCaution: number | null };
  /** Personnalise le titre : nouveau bail, ou volet « nouveau locataire » d'un changement. */
  title?: string;
}

/** Pièces jointes à la création du bail : déposées sur le bail une fois celui-ci enregistré. */
export interface PiecesBail {
  contrat?: File;
  etatLieuxEntree?: File;
}

export interface BailDialogResult {
  payload: CreateBailPayload;
  pieces: PiecesBail;
}

/** Un bail à créer : locataire, loyer, dates, caution — utilisé pour un nouveau bien loué ou un changement de locataire. */
@Component({
  selector: 'app-bail-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    LucidePlus,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title ?? 'Nouveau bail' }}</h2>
    <mat-dialog-content [formGroup]="form" class="bail-dialog-grid">
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Locataire</mat-label>
        <input
          matInput
          [formControl]="locataireQuery"
          [matAutocomplete]="locataireAuto"
          placeholder="Rechercher par nom ou téléphone…"
        />
        <mat-autocomplete #locataireAuto="matAutocomplete" [displayWith]="displayLocataire" (optionSelected)="selectLocataire($event.option.value)">
          @for (locataire of locataireOptions(); track locataire.id) {
            <mat-option [value]="locataire">
              {{ locataire.firstName }} {{ locataire.lastName }}
              {{ locataire.phone ? '· ' + locataire.phone : '' }}
            </mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>
      <button mat-stroked-button type="button" class="wide" (click)="ajouterLocataire()">
        <svg class="btn-icon" lucidePlus aria-hidden="true"></svg>Nouveau locataire
      </button>

      <mat-form-field appearance="outline">
        <mat-label>Loyer mensuel (FCFA)</mat-label>
        <input matInput type="number" min="1" formControlName="loyerMensuel" />
        @if (form.controls.loyerMensuel.hasError('min')) {
          <mat-error>Le loyer doit être supérieur à zéro.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Charges (FCFA)</mat-label>
        <input matInput type="number" min="0" formControlName="charges" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Date de début</mat-label>
        <input matInput type="date" formControlName="dateDebut" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Date de fin (facultatif)</mat-label>
        <input matInput type="date" formControlName="dateFin" />
        @if (form.hasError('datesIncoherentes')) {
          <mat-error>La fin du bail précède son début.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Jour d'échéance</mat-label>
        <input matInput type="number" min="1" max="28" formControlName="jourEcheance" />
        <mat-hint>Jour du mois où le loyer est dû (1 à 28)</mat-hint>
        @if (form.controls.jourEcheance.invalid) {
          <mat-error>Choisissez un jour entre 1 et 28.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Caution (FCFA)</mat-label>
        <input matInput type="number" min="0" formControlName="cautionMontant" />
        @if (cautionProposee) {
          <mat-hint>{{ cautionProposee }}</mat-hint>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Caution encaissée le</mat-label>
        <input matInput type="date" formControlName="cautionDate" />
        <mat-hint>Laissez vide si elle n’est pas encore versée.</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>État des lieux d'entrée</mat-label>
        <textarea matInput rows="2" formControlName="etatLieuxEntree"></textarea>
      </mat-form-field>

      <div class="wide pieces">
        <p class="pieces__title">Pièces à joindre (facultatif)</p>
        <label class="pieces__row">
          <span>Contrat de bail signé</span>
          <input type="file" [accept]="accept" (change)="choisir($event, 'contrat')" />
        </label>
        <label class="pieces__row">
          <span>État des lieux d'entrée (document)</span>
          <input type="file" [accept]="accept" (change)="choisir($event, 'etatLieuxEntree')" />
        </label>
        <small class="pieces__hint">PDF ou image, 10 Mo au maximum. Elles apparaissent dans les pièces du bail.</small>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: `.bail-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 420px; } .wide { grid-column: 1 / -1; } .pieces { display: flex; flex-direction: column; gap: 6px; } .pieces__title { margin: 0; font-weight: 600; font-size: 0.9rem; } .pieces__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 0.85rem; } .pieces__hint { color: var(--mtm-text-muted); }`,
})
export class BailDialog {
  private readonly dialogRef = inject(MatDialogRef<BailDialog, BailDialogResult>);
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(LocatifApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly data = inject<BailDialogData>(MAT_DIALOG_DATA);

  protected readonly accept = TYPES_PIECES;
  private pieces: PiecesBail = {};
  private readonly notify = inject(NotificationService);

  protected readonly locataireOptions = signal(this.data.locataires);
  protected readonly locataireQuery = new FormControl<Locataire | string>('');

  private readonly depart = valeursParDefautBail(this.data.bien);
  /** Rappel de l'origine du montant proposé, pour que l'écart soit voulu. */
  protected readonly cautionProposee =
    this.data.bien?.moisCaution && this.depart.cautionMontant !== null
      ? `Annonce du bien : ${this.data.bien.moisCaution} mois de loyer.`
      : '';

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      locataireId: ['', Validators.required],
      loyerMensuel: [this.depart.loyerMensuel, [Validators.required, Validators.min(1)]],
      charges: [this.depart.charges, [Validators.min(0)]],
      jourEcheance: [this.depart.jourEcheance, [Validators.required, Validators.min(1), Validators.max(28)]],
      dateDebut: ['', Validators.required],
      dateFin: [''],
      cautionMontant: [this.depart.cautionMontant, [Validators.min(0)]],
      cautionDate: [''],
      etatLieuxEntree: [''],
    },
    { validators: datesBailCoherentes },
  );

  constructor() {
    this.locataireQuery.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((value) => {
          if (value && typeof value === 'object') return [];
          return this.api.findLocataires((value ?? '').trim() || undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((liste) => this.locataireOptions.set(liste));
  }

  protected displayLocataire(value: Locataire | string | null): string {
    if (!value) return '';
    return typeof value === 'string' ? value : `${value.firstName} ${value.lastName}`;
  }

  protected selectLocataire(locataire: Locataire): void {
    this.form.patchValue({ locataireId: locataire.id });
  }

  protected ajouterLocataire(): void {
    LocataireQuickAddDialog.open(this.dialog).subscribe((locataire) => {
      if (!locataire) return;
      this.locataireOptions.update((liste) => [...liste, locataire]);
      this.locataireQuery.setValue(locataire);
      this.form.patchValue({ locataireId: locataire.id });
    });
  }

  protected choisir(event: Event, piece: keyof PiecesBail): void {
    const input = event.target as HTMLInputElement;
    const { valides, trop } = trierFichiers(Array.from(input.files ?? []).slice(0, 1));
    if (trop.length > 0) {
      this.notify.info(`${trop[0].name} : fichier de plus de 10 Mo, non ajouté.`);
      input.value = '';
    }
    this.pieces = { ...this.pieces, [piece]: valides[0] };
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    const payload: CreateBailPayload = {
      locataireId: valeur.locataireId,
      loyerMensuel: valeur.loyerMensuel ?? 0,
      charges: nombreOuUndefined(valeur.charges),
      jourEcheance: valeur.jourEcheance ?? undefined,
      dateDebut: valeur.dateDebut,
      dateFin: texte(valeur.dateFin),
      cautionMontant: nombreOuUndefined(valeur.cautionMontant),
      cautionDate: texte(valeur.cautionDate),
      etatLieuxEntree: texte(valeur.etatLieuxEntree),
    };
    this.dialogRef.close({ payload, pieces: this.pieces });
  }

  static open(dialog: MatDialog, data: BailDialogData): Observable<BailDialogResult | undefined> {
    return dialog.open(BailDialog, { width: '560px', data }).afterClosed();
  }
}
