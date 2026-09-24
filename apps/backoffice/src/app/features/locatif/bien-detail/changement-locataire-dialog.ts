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
import type { ChangerLocatairePayload, Locataire } from '../../../core/models/locatif.model';
import { LocataireQuickAddDialog } from './locataire-quick-add-dialog';

export interface ChangementLocataireDialogData {
  locataires: Locataire[];
}

/**
 * Changement de locataire (section 15) : clôt le bail en cours et en ouvre
 * un nouveau sur le même bien, en une seule saisie.
 */
@Component({
  selector: 'app-changement-locataire-dialog',
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
    <h2 mat-dialog-title>Changement de locataire</h2>
    <mat-dialog-content [formGroup]="form" class="changement-dialog-grid">
      <p class="form-section-title wide">Départ de l'ancien locataire</p>
      <mat-form-field appearance="outline">
        <mat-label>Date de sortie</mat-label>
        <input matInput type="date" formControlName="dateSortieReelle" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Motif</mat-label>
        <input matInput formControlName="motifCloture" placeholder="Ex. fin de contrat amiable" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>État des lieux de sortie</mat-label>
        <textarea matInput rows="2" formControlName="etatLieuxSortie"></textarea>
      </mat-form-field>

      <p class="form-section-title wide">Nouveau locataire et nouveau bail</p>
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
        <mat-label>Date de début</mat-label>
        <input matInput type="date" formControlName="dateDebut" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Caution (FCFA)</mat-label>
        <input matInput type="number" min="0" formControlName="cautionMontant" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Confirmer le changement
      </button>
    </mat-dialog-actions>
  `,
  styles: `.changement-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 460px; } .wide { grid-column: 1 / -1; } .form-section-title { margin: 4px 0 0; color: var(--mtm-text-muted); font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }`,
})
export class ChangementLocataireDialog {
  private readonly dialogRef = inject(
    MatDialogRef<ChangementLocataireDialog, ChangerLocatairePayload>,
  );
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(LocatifApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly data = inject<ChangementLocataireDialogData>(MAT_DIALOG_DATA);

  protected readonly locataireOptions = signal(this.data.locataires);
  protected readonly locataireQuery = new FormControl<Locataire | string>('');

  protected readonly form = this.formBuilder.nonNullable.group({
    dateSortieReelle: [new Date().toISOString().slice(0, 10), Validators.required],
    motifCloture: [''],
    etatLieuxSortie: [''],
    locataireId: ['', Validators.required],
    loyerMensuel: [null as number | null, Validators.required],
    dateDebut: ['', Validators.required],
    cautionMontant: [null as number | null],
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
      dateSortieReelle: valeur.dateSortieReelle,
      motifCloture: texte(valeur.motifCloture),
      etatLieuxSortie: texte(valeur.etatLieuxSortie),
      nouveauBail: {
        locataireId: valeur.locataireId,
        loyerMensuel: valeur.loyerMensuel ?? 0,
        dateDebut: valeur.dateDebut,
        cautionMontant: valeur.cautionMontant ?? undefined,
      },
    });
  }

  static open(
    dialog: MatDialog,
    data: ChangementLocataireDialogData,
  ): Observable<ChangerLocatairePayload | undefined> {
    return dialog.open(ChangementLocataireDialog, { width: '560px', data }).afterClosed();
  }
}
