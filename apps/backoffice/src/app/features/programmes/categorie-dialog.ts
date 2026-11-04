import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  type CategorieLot,
  type CategoriePayload,
  ProgrammesApiService,
} from '../../core/services/api/programmes-api.service';
import { TerrainsApiService } from '../../core/services/api/terrains-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';

export interface CategorieDialogData {
  programmeId: string;
  /** Renseignée en modification. */
  existante?: CategorieLot;
}

/** Une catégorie de lots : un nom et des conditions que ses lots reçoivent (façade, angle, standard…). */
@Component({
  selector: 'app-categorie-dialog',
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
    <h2 mat-dialog-title>{{ data.existante ? 'Modifier la catégorie' : 'Nouvelle catégorie de lots' }}</h2>
    <mat-dialog-content class="categorie" [formGroup]="form">
      <mat-form-field appearance="outline">
        <mat-label>Nom</mat-label>
        <input matInput formControlName="nom" maxlength="80" autocomplete="off" />
        <mat-hint>Par exemple « Façade », « Angle » ou « Standard ».</mat-hint>
        @if (form.controls.nom.touched && form.controls.nom.invalid) {
          <mat-error>Le nom est obligatoire.</mat-error>
        }
      </mat-form-field>
      <div class="categorie__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Prix d'un lot (FCFA)</mat-label>
          <input matInput type="number" min="0" formControlName="prixPublic" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Modalité de paiement</mat-label>
          <mat-select formControlName="modalitePaiement">
            <mat-option value="">Celle du programme</mat-option>
            @for (valeur of modalites(); track valeur) {
              <mat-option [value]="valeur">{{ valeur }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="categorie__ligne">
        <mat-form-field appearance="outline">
          <mat-label>Acompte (FCFA)</mat-label>
          <input matInput type="number" min="0" formControlName="acompteMontant" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Moratoire (mois)</mat-label>
          <input matInput type="number" min="0" max="240" formControlName="dureeMoratoireMois" />
        </mat-form-field>
      </div>
      @if (peutVoirFinancier) {
        <div class="categorie__ligne">
          <mat-form-field appearance="outline">
            <mat-label>Commission de MTM (FCFA)</mat-label>
            <input matInput type="number" min="0" formControlName="commission" />
            <mat-hint>Biens confiés. Vide : celle du programme.</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Marge de MTM (FCFA)</mat-label>
            <input matInput type="number" min="0" formControlName="marge" />
            <mat-hint>Biens en propre. Vide : celle du programme.</mat-hint>
          </mat-form-field>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="enregistrer()" [disabled]="enCours()">
        {{ enCours() ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .categorie {
      display: grid;
      gap: 4px;
      min-width: min(520px, 80vw);
    }
    .categorie__ligne {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 600px) {
      .categorie__ligne {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class CategorieDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProgrammesApiService);
  private readonly terrains = inject(TerrainsApiService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<CategorieDialog, CategorieLot>);
  protected readonly data = inject<CategorieDialogData>(MAT_DIALOG_DATA);

  private readonly session = inject(SessionService);
  /** Commission et marge sont des données sensibles : réservées à la direction et aux habilités. */
  protected readonly peutVoirFinancier =
    this.session.hasPermission('terrains:consulter_financier') ||
    this.session.hasRole('administrateur') ||
    this.session.hasRole('direction');

  protected readonly modalites = signal<string[]>([]);
  protected readonly enCours = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.maxLength(80)]],
    prixPublic: [null as number | null],
    modalitePaiement: [''],
    acompteMontant: [null as number | null],
    dureeMoratoireMois: [null as number | null],
    commission: [null as number | null],
    marge: [null as number | null],
  });

  ngOnInit(): void {
    this.terrains.getOptions().subscribe((o) => this.modalites.set(o.modalitePaiement));
    const c = this.data.existante;
    if (c) {
      this.form.patchValue({
        nom: c.nom,
        prixPublic: c.prixPublic == null ? null : Number(c.prixPublic),
        modalitePaiement: c.modalitePaiement ?? '',
        acompteMontant: c.acompteMontant == null ? null : Number(c.acompteMontant),
        dureeMoratoireMois: c.dureeMoratoireMois ?? null,
        commission: c.commission == null ? null : Number(c.commission),
        marge: c.marge == null ? null : Number(c.marge),
      });
    }
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: CategoriePayload = {
      nom: v.nom.trim(),
      ...(v.prixPublic !== null ? { prixPublic: Number(v.prixPublic) } : {}),
      ...(v.modalitePaiement ? { modalitePaiement: v.modalitePaiement } : {}),
      ...(v.acompteMontant !== null ? { acompteMontant: Number(v.acompteMontant) } : {}),
      ...(v.dureeMoratoireMois !== null ? { dureeMoratoireMois: Number(v.dureeMoratoireMois) } : {}),
      ...(this.peutVoirFinancier && v.commission !== null ? { commission: Number(v.commission) } : {}),
      ...(this.peutVoirFinancier && v.marge !== null ? { marge: Number(v.marge) } : {}),
    };
    this.enCours.set(true);
    const requete = this.data.existante
      ? this.api.modifierCategorie(this.data.existante.id, payload)
      : this.api.creerCategorie(this.data.programmeId, payload);
    requete.subscribe({
      next: (categorie) => this.dialogRef.close(categorie),
      error: (erreur) => {
        this.enCours.set(false);
        this.notifications.error(erreur, "La catégorie n'a pas pu être enregistrée");
      },
    });
  }
}
