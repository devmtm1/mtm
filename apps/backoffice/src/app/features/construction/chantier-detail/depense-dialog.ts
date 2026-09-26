import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import type {
  DepensePayload,
  IntervenantChantier,
  LigneBudget,
} from '../../../core/models/chantier.model';
import { MODES_PAIEMENT, POSTES_BUDGET, label, montant } from '../chantier-status';

export interface DepenseDialogData {
  postes: string[];
  modesPaiement: string[];
  lignes: LigneBudget[];
  intervenants: IntervenantChantier[];
}

/**
 * Dépense engagée sur le chantier (section 16 : « matériaux, paiements »).
 *
 * Rattacher la dépense à sa ligne de budget est facultatif mais fortement
 * suggéré : c'est la seule façon de voir ensuite quel poste dérape, et pas
 * seulement que le total dérape.
 */
@Component({
  selector: 'app-depense-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Nouvelle dépense</h2>
    <mat-dialog-content [formGroup]="form" class="depense-dialog">
      <mat-form-field appearance="outline">
        <mat-label>Libellé</mat-label>
        <input matInput formControlName="libelle" placeholder="20 tonnes de ciment" />
        <mat-error>Décrivez la dépense en quelques mots.</mat-error>
      </mat-form-field>

      <div class="depense-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Montant (FCFA)</mat-label>
          <input matInput type="number" min="1" formControlName="montant" />
          <mat-error>Indiquez un montant.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date" />
        </mat-form-field>
      </div>

      <div class="depense-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Poste</mat-label>
          <mat-select formControlName="poste">
            @for (poste of data.postes; track poste) {
              <mat-option [value]="poste">{{ posteLabel(poste) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Mode de règlement</mat-label>
          <mat-select formControlName="modePaiement">
            <mat-option value="">—</mat-option>
            @for (mode of data.modesPaiement; track mode) {
              <mat-option [value]="mode">{{ modeLabel(mode) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (data.lignes.length) {
        <mat-form-field appearance="outline">
          <mat-label>Ligne de budget</mat-label>
          <mat-select formControlName="ligneBudgetId">
            <mat-option value="">Aucune</mat-option>
            @for (ligne of data.lignes; track ligne.id) {
              <mat-option [value]="ligne.id">
                {{ ligne.libelle }} — {{ posteLabel(ligne.poste) }}
              </mat-option>
            }
          </mat-select>
          <mat-hint>{{ aideLigne() }}</mat-hint>
        </mat-form-field>
      }

      @if (data.intervenants.length) {
        <mat-form-field appearance="outline">
          <mat-label>Prestataire réglé</mat-label>
          <mat-select formControlName="intervenantId">
            <mat-option value="">Aucun</mat-option>
            @for (intervenant of data.intervenants; track intervenant.id) {
              <mat-option [value]="intervenant.id">{{ intervenant.nom }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      <mat-form-field appearance="outline">
        <mat-label>Référence (facture, bon)</mat-label>
        <input matInput formControlName="reference" />
      </mat-form-field>

      <p class="depense-dialog__note">
        La dépense part en attente de contrôle comptable : elle ne pèsera sur le budget consommé
        qu’une fois validée.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        (click)="confirm()"
        [disabled]="form.invalid"
      >
        Enregistrer la dépense
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .depense-dialog {
      display: grid;
      gap: 4px;
      min-width: 480px;
    }
    .depense-dialog__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }
    .depense-dialog__note {
      margin: 4px 0 0;
      color: var(--mtm-text-muted);
      font-size: 0.82rem;
      line-height: 1.5;
    }
    @media (max-width: 560px) {
      .depense-dialog { min-width: 0; }
      .depense-dialog__row { grid-template-columns: 1fr; }
    }
  `,
})
export class DepenseDialog {
  protected readonly data = inject<DepenseDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<DepenseDialog, DepensePayload>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);

  /** Suit la ligne choisie pour afficher ce qu'il reste sur ce poste. */
  protected readonly ligneChoisie = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    libelle: ['', [Validators.required, Validators.minLength(2)]],
    montant: [null as number | null, [Validators.required, Validators.min(1)]],
    date: [new Date().toISOString().slice(0, 10)],
    poste: [this.data.postes[0] ?? 'materiaux'],
    modePaiement: [''],
    ligneBudgetId: [''],
    intervenantId: [''],
    reference: [''],
  });

  protected readonly resteSurLigne = computed(() => {
    const id = this.ligneChoisie();
    const ligne = this.data.lignes.find((item) => item.id === id);
    return ligne ? montant(ligne.montantPrevu) : 0;
  });

  constructor() {
    // Choisir une ligne de budget renseigne le poste : les deux se
    // contrediraient sinon, et c'est la ligne qui fait foi.
    this.form.controls.ligneBudgetId.valueChanges.subscribe((id) => {
      this.ligneChoisie.set(id);
      const ligne = this.data.lignes.find((item) => item.id === id);
      if (ligne) this.form.controls.poste.setValue(ligne.poste);
    });
  }

  protected posteLabel(code: string): string {
    return label(POSTES_BUDGET, code);
  }

  protected modeLabel(code: string): string {
    return label(MODES_PAIEMENT, code);
  }

  protected aideLigne(): string {
    const prevu = this.resteSurLigne();
    if (!prevu) {
      return 'La rattacher permet de voir quel poste dérape, pas seulement le total.';
    }
    return `Budget prévu sur cette ligne : ${prevu.toLocaleString('fr-FR')} FCFA.`;
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.dialogRef.close({
      libelle: valeur.libelle.trim(),
      poste: valeur.poste,
      montant: valeur.montant ?? 0,
      date: valeur.date || undefined,
      ligneBudgetId: texte(valeur.ligneBudgetId),
      intervenantId: texte(valeur.intervenantId),
      modePaiement: texte(valeur.modePaiement),
      reference: texte(valeur.reference),
    });
  }

  static open(
    dialog: MatDialog,
    data: DepenseDialogData,
  ): Observable<DepensePayload | undefined> {
    return dialog.open(DepenseDialog, { width: '560px', data }).afterClosed();
  }
}
