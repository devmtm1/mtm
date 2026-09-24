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
import { LocataireQuickAddDialog } from './locataire-quick-add-dialog';

export interface BailDialogData {
  locataires: Locataire[];
  /** Personnalise le titre : nouveau bail, ou volet « nouveau locataire » d'un changement. */
  title?: string;
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
        <input matInput type="number" min="0" formControlName="loyerMensuel" />
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
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Jour d'échéance</mat-label>
        <input matInput type="number" min="1" max="28" formControlName="jourEcheance" />
        <mat-hint>Jour du mois où le loyer est dû</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Caution (FCFA)</mat-label>
        <input matInput type="number" min="0" formControlName="cautionMontant" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>État des lieux d'entrée</mat-label>
        <textarea matInput rows="2" formControlName="etatLieuxEntree"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: `.bail-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 420px; } .wide { grid-column: 1 / -1; }`,
})
export class BailDialog {
  private readonly dialogRef = inject(MatDialogRef<BailDialog, CreateBailPayload>);
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(LocatifApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly data = inject<BailDialogData>(MAT_DIALOG_DATA);

  protected readonly locataireOptions = signal(this.data.locataires);
  protected readonly locataireQuery = new FormControl<Locataire | string>('');

  protected readonly form = this.formBuilder.nonNullable.group({
    locataireId: ['', Validators.required],
    loyerMensuel: [null as number | null, Validators.required],
    charges: [null as number | null],
    jourEcheance: [5],
    dateDebut: ['', Validators.required],
    dateFin: [''],
    cautionMontant: [null as number | null],
    etatLieuxEntree: [''],
  });

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

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.dialogRef.close({
      locataireId: valeur.locataireId,
      loyerMensuel: valeur.loyerMensuel ?? 0,
      charges: valeur.charges ?? undefined,
      jourEcheance: valeur.jourEcheance ?? undefined,
      dateDebut: valeur.dateDebut,
      dateFin: texte(valeur.dateFin),
      cautionMontant: valeur.cautionMontant ?? undefined,
      etatLieuxEntree: texte(valeur.etatLieuxEntree),
    });
  }

  static open(dialog: MatDialog, data: BailDialogData): Observable<CreateBailPayload | undefined> {
    return dialog.open(BailDialog, { width: '560px', data }).afterClosed();
  }
}
