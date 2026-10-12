import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideUpload } from '@lucide/angular';
import { type Observable, of, switchMap } from 'rxjs';
import { PromotionsApiService, type Promotion } from '../../../core/services/api/promotions-api.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { TYPES_MEDIA_ACCEPTES, problemeMedia } from './promotion-status';

export interface PromotionDialogData {
  existing: Promotion | null;
  nextOrder: number;
}

/**
 * Création et modification d'une publicité du bandeau. L'affiche ou la vidéo
 * s'envoie dans le même geste : on crée, on téléverse, puis on publie si
 * demandé — une promotion sans média ne peut pas être publiée.
 */
@Component({
  selector: 'app-promotion-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, LucideUpload],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Modifier la publicité' : 'Nouvelle publicité' }}</h2>
    <mat-dialog-content class="promo-dialog" [formGroup]="form">
      <div class="promo-dialog__media">
        <label class="upload-button">
          <svg lucideUpload aria-hidden="true"></svg>
          {{ fichier() ? 'Changer de fichier' : editing && data.existing?.mediaUrl ? 'Remplacer l’image ou la vidéo' : 'Choisir l’image ou la vidéo' }}
          <input type="file" [accept]="typesAcceptes" (change)="choisir($event)" />
        </label>
        <span class="promo-dialog__fichier">
          @if (fichier(); as f) {
            {{ f.name }} · {{ taille(f.size) }}
          } @else if (editing && data.existing?.mediaUrl) {
            Un média est déjà en place ({{ data.existing?.resourceType === 'video' ? 'vidéo' : 'affiche' }}).
          } @else {
            Affiche (JPG, PNG, WebP) ou vidéo MP4 — 10 Mo au maximum.
            Préparez-la au format paysage 16/9 (1600 × 900 px) : elle remplit tout le bandeau, un autre format est recadré.
          }
        </span>
        @if (erreurFichier()) {
          <p class="promo-dialog__erreur" role="alert">{{ erreurFichier() }}</p>
        }
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Titre</mat-label>
        <input matInput formControlName="titre" autocomplete="off" maxlength="160" />
        <mat-hint>Pour vous repérer, et lu par les lecteurs d’écran.</mat-hint>
        @if (form.controls.titre.touched && form.controls.titre.invalid) {
          <mat-error>Deux caractères minimum.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Légende affichée (facultatif)</mat-label>
        <input matInput formControlName="description" autocomplete="off" maxlength="240" />
        <mat-hint>Ex. « Frais de dossier offerts jusqu’au 30 octobre ». S’affiche sur le bandeau.</mat-hint>
      </mat-form-field>

      <div class="promo-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Début de diffusion</mat-label>
          <input matInput type="date" formControlName="dateDebut" />
          <mat-hint>Vide : dès la publication.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fin de diffusion</mat-label>
          <input matInput type="date" formControlName="dateFin" />
          <mat-hint>Vide : jusqu’au retrait. Ce jour inclus.</mat-hint>
        </mat-form-field>
      </div>
      @if (periodeInvalide()) {
        <p class="promo-dialog__erreur" role="alert">La date de fin ne peut pas précéder la date de début.</p>
      }

      <div class="promo-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Lien (facultatif)</mat-label>
          <input matInput formControlName="lienUrl" autocomplete="off" placeholder="/terrains ou https://…" />
          <mat-hint>Un chemin du site ou une adresse en https.</mat-hint>
          @if (form.controls.lienUrl.touched && form.controls.lienUrl.invalid) {
            <mat-error>Chemin du site (/terrains) ou adresse en https://</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Texte du bouton</mat-label>
          <input matInput formControlName="libelleLien" autocomplete="off" maxlength="60" placeholder="En savoir plus" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="promo-dialog__order">
        <mat-label>Ordre d’affichage</mat-label>
        <input matInput type="number" min="0" formControlName="ordre" />
        <mat-hint>Les plus petits numéros d’abord.</mat-hint>
      </mat-form-field>

      @if (canPublish) {
        <mat-checkbox formControlName="isActive">Publier sur le bandeau d’accueil</mat-checkbox>
        @if (!aUnMedia()) {
          <p class="promo-dialog__note">Choisissez d’abord l’image ou la vidéo pour pouvoir publier.</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" [disabled]="saving()" (click)="submit()">
        {{ saving() ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .promo-dialog { display: grid; gap: 12px; padding-top: 8px !important; min-width: min(560px, calc(100vw - 96px)); }
    .promo-dialog__media { display: grid; gap: 6px; padding: 12px; border: 1px dashed var(--mtm-border); border-radius: var(--mtm-radius-md); }
    .promo-dialog__fichier { font-size: 0.84rem; color: var(--mtm-text-muted); word-break: break-all; }
    .promo-dialog__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .promo-dialog__order { max-width: 220px; }
    .promo-dialog__erreur { margin: 0; color: var(--mtm-accent); font-size: 0.84rem; }
    .promo-dialog__note { margin: 0; color: var(--mtm-text-muted); font-size: 0.82rem; }
    @media (max-width: 640px) { .promo-dialog__row { grid-template-columns: 1fr; } }
  `,
})
export class PromotionDialog {
  private readonly api = inject(PromotionsApiService);
  private readonly dialogRef = inject(MatDialogRef<PromotionDialog>);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly session = inject(SessionService);
  protected readonly data = inject<PromotionDialogData>(MAT_DIALOG_DATA);

  protected readonly editing = !!this.data.existing;
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly typesAcceptes = TYPES_MEDIA_ACCEPTES;
  protected readonly saving = signal(false);
  protected readonly fichier = signal<File | null>(null);
  protected readonly erreurFichier = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    titre: [this.data.existing?.titre ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    description: [this.data.existing?.description ?? '', Validators.maxLength(240)],
    dateDebut: [this.data.existing?.dateDebut?.slice(0, 10) ?? ''],
    dateFin: [this.data.existing?.dateFin?.slice(0, 10) ?? ''],
    lienUrl: [this.data.existing?.lienUrl ?? '', [Validators.maxLength(500), Validators.pattern(/^(\/(?!\/)\S*|https:\/\/\S+)?$/)]],
    libelleLien: [this.data.existing?.libelleLien ?? '', Validators.maxLength(60)],
    ordre: [this.data.existing?.ordre ?? this.data.nextOrder, Validators.min(0)],
    isActive: [this.data.existing?.isActive ?? !!this.canPublish],
  });

  protected aUnMedia(): boolean {
    return !!this.fichier() || !!this.data.existing?.mediaUrl;
  }

  protected periodeInvalide(): boolean {
    const { dateDebut, dateFin } = this.form.getRawValue();
    return !!dateDebut && !!dateFin && dateFin < dateDebut;
  }

  protected taille(octets: number): string {
    return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  }

  protected choisir(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0] ?? null;
    input.value = '';
    if (!fichier) return;
    const probleme = problemeMedia(fichier);
    this.erreurFichier.set(probleme);
    this.fichier.set(probleme ? null : fichier);
  }

  protected submit(): void {
    if (this.form.invalid || this.periodeInvalide() || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const existing = this.data.existing;
    const texte = (item: string) => item.trim();
    // Création : un champ vide est simplement omis. Modification : un champ
    // vidé est envoyé vide (ou null pour une date) afin d'être effacé.
    const payload = {
      titre: texte(valeur.titre),
      description: texte(valeur.description),
      lienUrl: texte(valeur.lienUrl),
      libelleLien: texte(valeur.libelleLien),
      dateDebut: valeur.dateDebut || (existing ? null : undefined),
      dateFin: valeur.dateFin || (existing ? null : undefined),
      ordre: Number(valeur.ordre) || 0,
    };
    const publier = this.canPublish && valeur.isActive && this.aUnMedia();
    const fichier = this.fichier();

    this.saving.set(true);
    const etape1$: Observable<Promotion> = existing ? this.api.update(existing.id, payload) : this.api.create(payload);
    etape1$
      .pipe(
        switchMap((promotion) => (fichier ? this.api.uploadMedia(promotion.id, fichier) : of(promotion))),
        switchMap((promotion) => {
          const changement = existing ? existing.isActive !== publier : publier;
          return this.canPublish && changement ? this.api.publish(promotion.id, publier) : of(promotion);
        }),
      )
      .subscribe({
        next: (promotion) => {
          this.saving.set(false);
          this.notify.success(
            promotion.isActive ? 'Enregistrée — visible sur le bandeau d’accueil' : existing ? 'Modifications enregistrées' : 'Créée — publiez-la pour l’afficher sur le site',
          );
          this.dialogRef.close(true);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Impossible d’enregistrer la publicité');
        },
      });
  }

  static open(dialog: MatDialog, data: PromotionDialogData): Observable<boolean | undefined> {
    return dialog.open(PromotionDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
