import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import type { Observable } from 'rxjs';
import { SejoursApiService } from '../../../core/services/api/sejours-api.service';
import type {
  CreatePaiementSejourPayload,
  EtatDesLieuxVue,
  EtatPiece,
  EtatsDesLieux,
  PieceEtat,
} from '../../../core/models/sejour.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { MODES_PAIEMENT } from '../locatif-status';
import { ETATS_PIECE, PIECES_PAR_DEFAUT } from './sejour-status';

/** « 2026-10-12T17:08 » : la valeur attendue par un champ date et heure local. */
function versChampLocal(date: Date): string {
  const decalage = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - decalage).toISOString().slice(0, 16);
}

// ---------------------------------------------------------------------------
// Règlement d'un séjour
// ---------------------------------------------------------------------------

export interface PaiementSejourDialogData {
  reste: number;
  modes: string[];
}

/** Acompte à la réservation, solde à l'arrivée : le montant proposé est le reste à payer. */
@Component({
  selector: 'app-paiement-sejour-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Enregistrer un règlement</h2>
    <mat-dialog-content [formGroup]="form" class="paiement-sejour">
      <p class="paiement-sejour__reste">Reste à payer : <strong>{{ data.reste | mtmMoney }}</strong></p>
      <mat-form-field appearance="outline">
        <mat-label>Montant reçu (FCFA)</mat-label>
        <input matInput type="number" min="1" formControlName="montant" />
        <mat-hint>Un acompte, ou le solde du séjour.</mat-hint>
        @if (form.controls.montant.invalid && form.controls.montant.touched) {
          <mat-error>Indiquez un montant supérieur à 0.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Mode de paiement</mat-label>
        <mat-select formControlName="mode">
          @for (mode of data.modes; track mode) {
            <mat-option [value]="mode">{{ modes[mode] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Date et heure</mat-label>
        <input matInput type="datetime-local" formControlName="datePaiement" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Référence (facultatif)</mat-label>
        <input matInput formControlName="reference" placeholder="ID Wave, numéro de virement…" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .paiement-sejour { display: grid; gap: 4px; min-width: min(420px, calc(100vw - 96px)); }
    .paiement-sejour__reste { margin: 0 0 8px; padding: 8px 12px; border-radius: 8px; background: var(--mtm-bg-surface); }
  `,
})
export class PaiementSejourDialog {
  private readonly dialogRef = inject(MatDialogRef<PaiementSejourDialog, CreatePaiementSejourPayload>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<PaiementSejourDialogData>(MAT_DIALOG_DATA);
  protected readonly modes = MODES_PAIEMENT;

  protected readonly form = this.formBuilder.nonNullable.group({
    montant: [this.data.reste as number | null, [Validators.required, Validators.min(1)]],
    mode: [this.data.modes.includes('mobile_money') ? 'mobile_money' : (this.data.modes[0] ?? ''), Validators.required],
    datePaiement: [versChampLocal(new Date()), Validators.required],
    reference: [''],
  });

  protected valider(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    this.dialogRef.close({
      montant: Number(valeur.montant),
      mode: valeur.mode,
      datePaiement: new Date(valeur.datePaiement).toISOString(),
      reference: valeur.reference.trim() || undefined,
    });
  }

  static open(dialog: MatDialog, data: PaiementSejourDialogData): Observable<CreatePaiementSejourPayload | undefined> {
    return dialog.open(PaiementSejourDialog, { width: '480px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}

// ---------------------------------------------------------------------------
// Restitution de la caution
// ---------------------------------------------------------------------------

export interface RestitutionCautionData {
  caution: number;
  /** Pièces dégradées entre l'entrée et la sortie : le motif de retenue le plus courant. */
  degradations: number;
}

export interface RestitutionCautionResultat {
  retenue?: number;
  justification?: string;
}

/**
 * Rend la caution au voyageur. Une retenue est toujours justifiée : le
 * serveur la refuse sans motif, et l'état des lieux de sortie est la preuve.
 */
@Component({
  selector: 'app-caution-sejour-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Restituer la caution</h2>
    <mat-dialog-content [formGroup]="form" class="caution-sejour">
      <p class="caution-sejour__info">
        Caution détenue : <strong>{{ data.caution | mtmMoney }}</strong>.
        @if (data.degradations > 0) {
          L’état des lieux de sortie relève <strong>{{ data.degradations }} pièce{{ data.degradations > 1 ? 's' : '' }} dégradée{{ data.degradations > 1 ? 's' : '' }}</strong> :
          une retenue peut se justifier.
        } @else {
          Aucune dégradation relevée entre l’entrée et la sortie.
        }
      </p>
      <mat-form-field appearance="outline">
        <mat-label>Montant retenu (FCFA)</mat-label>
        <input matInput type="number" min="0" [max]="data.caution" formControlName="retenue" />
        <mat-hint>0 : la caution est rendue en totalité.</mat-hint>
      </mat-form-field>
      <p class="caution-sejour__rendu">À rendre au voyageur : <strong>{{ aRendre() | mtmMoney }}</strong></p>
      @if (retient()) {
        <mat-form-field appearance="outline">
          <mat-label>Justification de la retenue</mat-label>
          <textarea matInput rows="3" formControlName="justification" maxlength="1000" placeholder="Ex. canapé taché, constaté à l’état des lieux de sortie"></textarea>
          @if (form.controls.justification.touched && form.controls.justification.invalid) {
            <mat-error>Une retenue doit être justifiée.</mat-error>
          }
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()">Restituer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .caution-sejour { display: grid; gap: 4px; min-width: min(460px, calc(100vw - 96px)); }
    .caution-sejour__info { margin: 0 0 8px; font-size: 0.9rem; line-height: 1.5; }
    .caution-sejour__rendu { margin: 0 0 12px; padding: 8px 12px; border-radius: 8px; background: var(--mtm-bg-surface); }
  `,
})
export class CautionSejourDialog {
  private readonly dialogRef = inject(MatDialogRef<CautionSejourDialog, RestitutionCautionResultat>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<RestitutionCautionData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    retenue: [0 as number | null, [Validators.min(0), Validators.max(this.data.caution)]],
    justification: [''],
  });

  protected retient(): boolean {
    return Number(this.form.controls.retenue.value ?? 0) > 0;
  }

  protected aRendre(): number {
    return Math.max(this.data.caution - Number(this.form.controls.retenue.value ?? 0), 0);
  }

  protected valider(): void {
    const { retenue, justification } = this.form.getRawValue();
    const montant = Number(retenue ?? 0);
    if (this.form.invalid || montant > this.data.caution) {
      this.form.markAllAsTouched();
      return;
    }
    if (montant > 0 && !justification.trim()) {
      this.form.controls.justification.setErrors({ required: true });
      this.form.controls.justification.markAsTouched();
      return;
    }
    this.dialogRef.close({
      retenue: montant > 0 ? montant : undefined,
      justification: montant > 0 ? justification.trim() : undefined,
    });
  }

  static open(dialog: MatDialog, data: RestitutionCautionData): Observable<RestitutionCautionResultat | undefined> {
    return dialog.open(CautionSejourDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}

// ---------------------------------------------------------------------------
// État des lieux
// ---------------------------------------------------------------------------

export interface EtatDesLieuxDialogData {
  cible: 'sejours' | 'baux';
  id: string;
  type: 'entree' | 'sortie';
  existant: EtatDesLieuxVue | null;
  /** État d'entrée : sert de point de départ à l'état de sortie. */
  entree: EtatDesLieuxVue | null;
}

/**
 * État des lieux pièce par pièce, avec compteurs et clés. À la sortie, la liste
 * des pièces et leurs états d'entrée sont repris : on ne modifie que ce qui a
 * changé, et la comparaison fait le reste.
 */
@Component({
  selector: 'app-etat-des-lieux-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucidePlus, LucideTrash2],
  template: `
    <h2 mat-dialog-title>État des lieux {{ data.type === 'entree' ? 'd’entrée' : 'de sortie' }}</h2>
    <mat-dialog-content [formGroup]="form" class="edl">
      @if (data.type === 'sortie' && !data.existant && data.entree) {
        <p class="edl__hint">Les pièces et leurs états viennent de l’entrée : modifiez seulement ce qui a changé.</p>
      }

      <div class="edl__pieces" formArrayName="pieces">
        @for (ligne of pieces.controls; track $index; let i = $index) {
          <div class="edl__piece" [formGroupName]="i">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Pièce</mat-label>
              <input matInput formControlName="piece" maxlength="80" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>État</mat-label>
              <mat-select formControlName="etat">
                @for (etat of etats; track etat[0]) {
                  <mat-option [value]="etat[0]">{{ etat[1].label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="edl__observation">
              <mat-label>Observation</mat-label>
              <input matInput formControlName="observation" maxlength="500" placeholder="Rayure, tache, fuite…" />
            </mat-form-field>
            <button mat-icon-button type="button" (click)="retirer(i)" aria-label="Retirer cette pièce">
              <svg lucideTrash2 aria-hidden="true"></svg>
            </button>
          </div>
        }
      </div>
      <button mat-stroked-button type="button" class="edl__ajout" (click)="ajouter()">
        <svg class="btn-icon" lucidePlus aria-hidden="true"></svg>Ajouter une pièce
      </button>

      <div class="edl__grid">
        <mat-form-field appearance="outline">
          <mat-label>Date et heure</mat-label>
          <input matInput type="datetime-local" formControlName="dateEtat" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Clés remises</mat-label>
          <input matInput type="number" min="0" max="50" formControlName="nombreCles" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Compteur d’eau</mat-label>
          <input matInput formControlName="releveEau" maxlength="40" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Compteur d’électricité</mat-label>
          <input matInput formControlName="releveElectricite" maxlength="40" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="edl__wide">
          <mat-label>Présent lors de l’état des lieux</mat-label>
          <input matInput formControlName="signataire" maxlength="200" placeholder="Nom du voyageur ou du locataire" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="edl__wide">
          <mat-label>Observations générales</mat-label>
          <textarea matInput rows="2" formControlName="observations" maxlength="2000"></textarea>
        </mat-form-field>
      </div>
      <p class="edl__hint">Les photos s’ajoutent juste après l’enregistrement, depuis la fiche.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()" [disabled]="saving()">
        {{ saving() ? 'Enregistrement…' : 'Enregistrer l’état des lieux' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .edl { display: grid; gap: 8px; min-width: min(760px, calc(100vw - 96px)); }
    .edl__hint { margin: 0; color: var(--mtm-text-muted); font-size: 0.84rem; }
    .edl__pieces { display: grid; gap: 8px; }
    .edl__piece { display: grid; grid-template-columns: 1.1fr 1fr 1.6fr auto; gap: 8px; align-items: start; }
    .edl__ajout { justify-self: start; }
    .edl__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-top: 8px; }
    .edl__wide { grid-column: 1 / -1; }
    @media (max-width: 720px) { .edl__piece { grid-template-columns: 1fr 1fr; } .edl__observation { grid-column: 1 / -1; } .edl__grid { grid-template-columns: 1fr; } }
  `,
})
export class EtatDesLieuxDialog {
  private readonly api = inject(SejoursApiService);
  private readonly dialogRef = inject(MatDialogRef<EtatDesLieuxDialog, EtatsDesLieux>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  protected readonly data = inject<EtatDesLieuxDialogData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly etats = Object.entries(ETATS_PIECE);

  private ligne(piece: string, etat: EtatPiece = 'bon', observation = '') {
    return this.formBuilder.nonNullable.group({
      piece: [piece, [Validators.required, Validators.maxLength(80)]],
      etat: [etat],
      observation: [observation],
    });
  }

  protected readonly form = this.formBuilder.nonNullable.group({
    pieces: this.formBuilder.array([] as ReturnType<EtatDesLieuxDialog['ligne']>[]),
    dateEtat: [versChampLocal(this.data.existant ? new Date(this.data.existant.dateEtat) : new Date()), Validators.required],
    nombreCles: [this.data.existant?.nombreCles ?? (null as number | null)],
    releveEau: [this.data.existant?.releveEau ?? ''],
    releveElectricite: [this.data.existant?.releveElectricite ?? ''],
    signataire: [this.data.existant?.signataire ?? ''],
    observations: [this.data.existant?.observations ?? ''],
  });

  protected get pieces(): FormArray {
    return this.form.controls.pieces as unknown as FormArray;
  }

  constructor() {
    const source: PieceEtat[] =
      this.data.existant?.pieces ??
      this.data.entree?.pieces ??
      PIECES_PAR_DEFAUT.map((piece) => ({ piece, etat: 'bon' as EtatPiece, observation: '' }));
    // À la sortie, les observations d'entrée ne sont pas reprises : seul l'état l'est.
    const reprise = !this.data.existant && this.data.type === 'sortie';
    for (const piece of source) {
      this.pieces.push(this.ligne(piece.piece, piece.etat, reprise ? '' : (piece.observation ?? '')));
    }
  }

  protected ajouter(): void {
    this.pieces.push(this.ligne(''));
  }

  protected retirer(index: number): void {
    this.pieces.removeAt(index);
  }

  protected valider(): void {
    const valeur = this.form.getRawValue() as unknown as {
      pieces: { piece: string; etat: EtatPiece; observation: string }[];
      dateEtat: string;
      nombreCles: number | null;
      releveEau: string;
      releveElectricite: string;
      signataire: string;
      observations: string;
    };
    if (this.form.invalid || valeur.pieces.length === 0) {
      this.form.markAllAsTouched();
      if (valeur.pieces.length === 0) this.notify.info('Ajoutez au moins une pièce.');
      return;
    }
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.saving.set(true);
    this.api
      .saveEtat(this.data.cible, this.data.id, this.data.type, {
        dateEtat: new Date(valeur.dateEtat).toISOString(),
        pieces: valeur.pieces.map((ligne) => ({
          piece: ligne.piece.trim(),
          etat: ligne.etat,
          observation: texte(ligne.observation),
        })),
        nombreCles: valeur.nombreCles ?? undefined,
        releveEau: texte(valeur.releveEau),
        releveElectricite: texte(valeur.releveElectricite),
        signataire: texte(valeur.signataire),
        observations: texte(valeur.observations),
      })
      .subscribe({
        next: (resultat) => {
          this.saving.set(false);
          this.dialogRef.close(resultat);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }

  static open(dialog: MatDialog, data: EtatDesLieuxDialogData): Observable<EtatsDesLieux | undefined> {
    return dialog.open(EtatDesLieuxDialog, { width: '860px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
