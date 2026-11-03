import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  type ProgrammePayload,
  type ProgrammeResume,
  ProgrammesApiService,
} from '../../core/services/api/programmes-api.service';
import { TerrainsApiService } from '../../core/services/api/terrains-api.service';
import type { ProprietaireSummary, TerrainOptions } from '../../core/models/terrain.model';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';

export interface ProgrammeDialogData {
  /** Renseigné en modification. */
  existant?: ProgrammeResume;
}

/** Création et modification d'un programme : ce qui est commun à tous ses lots, saisi une seule fois. */
@Component({
  selector: 'app-programme-dialog',
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
    <h2 mat-dialog-title>{{ data.existant ? 'Modifier le programme' : 'Nouveau programme' }}</h2>
    <mat-dialog-content class="programme-dialog" [formGroup]="form">
      <mat-form-field appearance="outline">
        <mat-label>Nom du programme</mat-label>
        <input matInput formControlName="nom" maxlength="200" autocomplete="off" />
        <mat-hint>Par exemple « Lotissement Les Almadies ».</mat-hint>
        @if (form.controls.nom.touched && form.controls.nom.invalid) {
          <mat-error>Le nom est obligatoire.</mat-error>
        }
      </mat-form-field>

      <div class="programme-dialog__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Région</mat-label>
          <input matInput formControlName="region" autocomplete="off" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Commune</mat-label>
          <input matInput formControlName="commune" autocomplete="off" />
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Localisation précise</mat-label>
        <input matInput formControlName="localisationDetail" autocomplete="off" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Propriétaire</mat-label>
        <mat-select formControlName="proprietaireId">
          <mat-option value="">Aucun</mat-option>
          @for (p of proprietaires(); track p.id) {
            <mat-option [value]="p.id">{{ p.firstName }} {{ p.lastName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <div class="programme-dialog__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Statut juridique</mat-label>
          <mat-select formControlName="statutJuridique">
            @for (valeur of options()?.statutJuridique ?? []; track valeur) {
              <mat-option [value]="valeur">{{ valeur }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Niveau de vérification</mat-label>
          <mat-select formControlName="niveauVerification">
            @for (valeur of options()?.niveauVerification ?? []; track valeur) {
              <mat-option [value]="valeur">{{ valeur }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <h3 class="programme-dialog__titre">Conditions de vente par défaut</h3>
      <p class="programme-dialog__aide">
        Chaque lot les reçoit à sa création. Une catégorie de lots peut ensuite les remplacer.
      </p>
      <div class="programme-dialog__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Prix d'un lot (FCFA)</mat-label>
          <input matInput type="number" min="0" formControlName="prixLot" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Modalité de paiement</mat-label>
          <mat-select formControlName="modalitePaiement">
            <mat-option value="">Non précisée</mat-option>
            @for (valeur of options()?.modalitePaiement ?? []; track valeur) {
              <mat-option [value]="valeur">{{ valeur }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="programme-dialog__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Acompte (FCFA)</mat-label>
          <input matInput type="number" min="0" formControlName="acompteMontant" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Durée du moratoire (mois)</mat-label>
          <input matInput type="number" min="0" max="240" formControlName="dureeMoratoireMois" />
        </mat-form-field>
      </div>

      @if (peutVoirFinancier) {
        <h3 class="programme-dialog__titre">Ce que MTM gagne sur chaque lot vendu</h3>
        <p class="programme-dialog__aide">
          La comptabilité en déduit le revenu de MTM : sans ce montant, une vente rapporterait zéro et le propriétaire
          n'apparaîtrait pas dans les reversements. Chaque lot le reçoit à sa création.
        </p>
        <mat-checkbox formControlName="produitDirect">Produit détenu en direct par MTM (pas de propriétaire intermédiaire)</mat-checkbox>
        @if (confie()) {
          <mat-form-field appearance="outline">
            <mat-label>Commission de MTM par lot (FCFA)</mat-label>
            <input matInput type="number" min="0" formControlName="commissionLot" />
            <mat-hint>Ce que MTM garde sur chaque lot ; le reste revient au propriétaire.</mat-hint>
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline">
            <mat-label>Marge de MTM par lot (FCFA)</mat-label>
            <input matInput type="number" min="0" formControlName="margeLot" />
            <mat-hint>Prix de vente moins ce que le lot a coûté à MTM.</mat-hint>
          </mat-form-field>
        }
      }

      @if (justificationRequise()) {
        <mat-form-field appearance="outline">
          <mat-label>Pourquoi ce changement ?</mat-label>
          <textarea matInput rows="2" formControlName="justification"></textarea>
          <mat-hint>Obligatoire : la commission, la marge et le propriétaire ont déjà servi à des lots.</mat-hint>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="enregistrer()" [disabled]="enCours()">
        {{ enCours() ? 'Enregistrement…' : data.existant ? 'Enregistrer' : 'Créer le programme' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .programme-dialog {
      display: grid;
      gap: 4px;
      min-width: min(560px, 80vw);
    }
    .programme-dialog__ligne {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .programme-dialog__titre {
      margin: 8px 0 0;
      font-size: 0.95rem;
    }
    .programme-dialog__aide {
      margin: 0 0 6px;
      color: var(--mtm-text-muted);
      font-size: 0.84rem;
    }
    @media (max-width: 600px) {
      .programme-dialog__ligne {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ProgrammeDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProgrammesApiService);
  private readonly terrains = inject(TerrainsApiService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<ProgrammeDialog, ProgrammeResume>);
  protected readonly data = inject<ProgrammeDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  protected readonly options = signal<TerrainOptions | null>(null);
  protected readonly proprietaires = signal<ProprietaireSummary[]>([]);
  protected readonly enCours = signal(false);

  private readonly session = inject(SessionService);
  /** Commission, marge et produit direct sont des données sensibles : réservées à la direction et aux habilités. */
  protected readonly peutVoirFinancier =
    this.session.hasPermission('terrains:consulter_financier') ||
    this.session.hasRole('administrateur') ||
    this.session.hasRole('direction');

  protected readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.maxLength(200)]],
    region: [''],
    commune: [''],
    localisationDetail: [''],
    proprietaireId: [''],
    statutJuridique: ['', Validators.required],
    niveauVerification: ['', Validators.required],
    prixLot: [null as number | null],
    modalitePaiement: [''],
    acompteMontant: [null as number | null],
    dureeMoratoireMois: [null as number | null],
    produitDirect: [false],
    commissionLot: [null as number | null],
    margeLot: [null as number | null],
    justification: [''],
  });

  /** Un bien confié par un propriétaire rapporte une commission ; en propre ou en direct, une marge. */
  protected confie(): boolean {
    const v = this.form.getRawValue();
    return Boolean(v.proprietaireId) && !v.produitDirect;
  }

  /** Ce qui fait les comptes a-t-il changé sur un programme qui a déjà des lots ? Alors on dit pourquoi. */
  protected justificationRequise(): boolean {
    const p = this.data.existant;
    if (!p || p.nombreLots === 0) return false;
    const v = this.form.getRawValue();
    const nombre = (x: unknown) => (x === null || x === undefined || x === '' ? null : Number(x));
    return (
      (v.proprietaireId || null) !== (p.proprietaireId ?? null) ||
      (this.peutVoirFinancier &&
        (v.produitDirect !== p.produitDirect ||
          nombre(v.commissionLot) !== nombre(p.commissionLot) ||
          nombre(v.margeLot) !== nombre(p.margeLot)))
    );
  }

  ngOnInit(): void {
    this.terrains.getOptions().subscribe((options) => {
      this.options.set(options);
      // Un nouveau programme part de la première valeur de chaque liste.
      if (!this.data.existant) {
        this.form.patchValue({
          statutJuridique: options.statutJuridique[0] ?? '',
          niveauVerification: options.niveauVerification[0] ?? '',
        });
      }
    });
    this.terrains.getProprietaires().subscribe((liste) => this.proprietaires.set(liste));
    const p = this.data.existant;
    if (p) {
      this.form.patchValue({
        nom: p.nom,
        region: p.region ?? '',
        commune: p.commune ?? '',
        localisationDetail: p.localisationDetail ?? '',
        proprietaireId: p.proprietaireId ?? '',
        statutJuridique: p.statutJuridique,
        niveauVerification: p.niveauVerification,
        prixLot: p.prixLot === null ? null : Number(p.prixLot),
        modalitePaiement: p.modalitePaiement ?? '',
        acompteMontant: p.acompteMontant == null ? null : Number(p.acompteMontant),
        dureeMoratoireMois: p.dureeMoratoireMois ?? null,
        produitDirect: p.produitDirect,
        commissionLot: p.commissionLot == null ? null : Number(p.commissionLot),
        margeLot: p.margeLot == null ? null : Number(p.margeLot),
      });
    }
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (this.justificationRequise() && !v.justification.trim()) {
      this.notifications.info('Indiquez la raison du changement de commission, de marge ou de propriétaire.');
      return;
    }
    const payload: ProgrammePayload = {
      nom: v.nom.trim(),
      statutJuridique: v.statutJuridique,
      niveauVerification: v.niveauVerification,
      ...(v.region.trim() ? { region: v.region.trim() } : {}),
      ...(v.commune.trim() ? { commune: v.commune.trim() } : {}),
      ...(v.localisationDetail.trim() ? { localisationDetail: v.localisationDetail.trim() } : {}),
      ...(v.proprietaireId ? { proprietaireId: v.proprietaireId } : {}),
      ...(v.prixLot !== null ? { prixLot: Number(v.prixLot) } : {}),
      ...(v.modalitePaiement ? { modalitePaiement: v.modalitePaiement } : {}),
      ...(v.acompteMontant !== null ? { acompteMontant: Number(v.acompteMontant) } : {}),
      ...(v.dureeMoratoireMois !== null ? { dureeMoratoireMois: Number(v.dureeMoratoireMois) } : {}),
      // Les montants sensibles ne partent que de l'écran de qui a le droit de les voir.
      ...(this.peutVoirFinancier
        ? {
            produitDirect: v.produitDirect,
            ...(v.commissionLot !== null ? { commissionLot: Number(v.commissionLot) } : {}),
            ...(v.margeLot !== null ? { margeLot: Number(v.margeLot) } : {}),
          }
        : {}),
      ...(this.justificationRequise() ? { justification: v.justification.trim() } : {}),
    };
    this.enCours.set(true);
    const requete = this.data.existant
      ? this.api.update(this.data.existant.id, payload)
      : this.api.create(payload);
    requete.subscribe({
      next: (programme) => this.dialogRef.close(programme),
      error: (erreur) => {
        this.enCours.set(false);
        this.notifications.error(erreur, "Le programme n'a pas pu être enregistré");
      },
    });
  }
}
