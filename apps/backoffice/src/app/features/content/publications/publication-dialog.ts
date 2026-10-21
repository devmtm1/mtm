import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { LucideUpload } from '@lucide/angular';
import { type Observable, firstValueFrom } from 'rxjs';
import { PublicationsApiService, type Publication } from '../../../core/services/api/publications-api.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { TYPES_VIDEO_ACCEPTES, envoyerVideo, problemeVideo } from './publication-envoi';
import { CATEGORIES_PUBLICATION, formaterDuree, formaterTaille, idYoutube } from './publication-status';

export interface PublicationDialogData {
  existing: Publication | null;
}

/**
 * Création et modification d'une vidéo de « Actualités et conseils ». La vidéo ne passe pas par
 * l'API (trop lourde) : elle part du poste directement vers Cloudinary, par morceaux, avec une
 * barre de progression ; l'API vérifie ensuite ce qui est arrivé. On crée, on envoie, puis on
 * publie si demandé : une publication sans vidéo ne peut pas être publiée.
 */
@Component({
  selector: 'app-publication-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    LucideUpload,
  ],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Modifier la publication' : 'Nouvelle publication' }}</h2>
    <mat-dialog-content class="pub-dialog" [formGroup]="form">
      <div class="pub-dialog__source" role="group" aria-label="Origine de la vidéo">
        <button type="button" [class.is-actif]="source() === 'fichier'" [attr.aria-pressed]="source() === 'fichier'" [disabled]="saving()" (click)="source.set('fichier')">Fichier vidéo</button>
        <button type="button" [class.is-actif]="source() === 'youtube'" [attr.aria-pressed]="source() === 'youtube'" [disabled]="saving()" (click)="source.set('youtube')">Lien YouTube</button>
      </div>

      @if (source() === 'youtube') {
        <div class="pub-dialog__video">
          <mat-form-field appearance="outline">
            <mat-label>Lien de la vidéo YouTube</mat-label>
            <input matInput formControlName="youtubeUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.youtube.com/watch?v=…" />
            <mat-hint>Collez l’adresse de la vidéo. Les visiteurs la regardent sur le site, ou sur YouTube.</mat-hint>
          </mat-form-field>
          @if (idYoutubeSaisi(); as id) {
            <div class="pub-dialog__apercu">
              <img [src]="'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'" alt="" width="160" height="90" />
              <span>Vidéo reconnue.</span>
            </div>
          } @else if (form.controls.youtubeUrl.value.trim()) {
            <p class="pub-dialog__erreur" role="alert">Ce lien n’est pas une vidéo YouTube reconnue.</p>
          }
        </div>
      } @else {
      <div class="pub-dialog__video" [class.is-occupe]="saving()">
        <label class="upload-button">
          <svg lucideUpload aria-hidden="true"></svg>
          {{ fichier() ? 'Changer de vidéo' : editing && data.existing?.videoUrl ? 'Remplacer la vidéo' : 'Choisir la vidéo' }}
          <input type="file" [accept]="typesAcceptes" [disabled]="saving()" (change)="choisir($event)" />
        </label>
        <span class="pub-dialog__fichier">
          @if (fichier(); as f) {
            {{ f.name }} · {{ taille(f.size) }}
          } @else if (editing && data.existing?.videoUrl) {
            Une vidéo est déjà en place ({{ dureeExistante() }}{{ dureeExistante() ? ' · ' : '' }}{{ tailleExistante() }}).
          } @else {
            Vidéo <strong>MP4 (H.264)</strong>, MOV ou WebM — <strong>100 Mo au maximum</strong>, 20 minutes au plus.
            Format paysage 16/9 en 1080p : c’est le meilleur compromis entre qualité et fluidité.
          }
        </span>
        @if (erreurFichier()) {
          <p class="pub-dialog__erreur" role="alert">{{ erreurFichier() }}</p>
        }
        @if (saving() && phase() === 'envoi') {
          <div class="pub-dialog__progression" role="status" aria-live="polite">
            <mat-progress-bar mode="determinate" [value]="progression()" />
            <small>Envoi de la vidéo : {{ progression() }} %. Ne fermez pas cette fenêtre.</small>
          </div>
        } @else if (saving() && phase() === 'verification') {
          <div class="pub-dialog__progression" role="status">
            <mat-progress-bar mode="indeterminate" />
            <small>Vérification de la vidéo…</small>
          </div>
        }
      </div>
      }

      <mat-form-field appearance="outline">
        <mat-label>Titre</mat-label>
        <input matInput formControlName="titre" autocomplete="off" maxlength="160" />
        <mat-hint>Ex. « Comment vérifier un titre foncier avant d’acheter ».</mat-hint>
        @if (form.controls.titre.touched && form.controls.titre.invalid) {
          <mat-error>Deux caractères minimum.</mat-error>
        }
      </mat-form-field>

      <div class="pub-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Rubrique</mat-label>
          <mat-select formControlName="categorie">
            @for (categorie of categories; track categorie.code) {
              <mat-option [value]="categorie.code">{{ categorie.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date de publication</mat-label>
          <input matInput type="date" formControlName="datePublication" />
          <mat-hint>Vide : dès la publication. Une date à venir programme la mise en ligne.</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Présentation (facultatif)</mat-label>
        <textarea matInput rows="3" formControlName="resume" maxlength="600"></textarea>
        <mat-hint>Deux phrases qui donnent envie de regarder. Affichées sous la vidéo.</mat-hint>
      </mat-form-field>

      <mat-checkbox formControlName="misEnAvant">Mettre à la une (présentée en grand, en haut de la page)</mat-checkbox>

      @if (canPublish) {
        <mat-checkbox formControlName="isActive">Publier sur le site</mat-checkbox>
        @if (!aUneVideo()) {
          <p class="pub-dialog__note">Choisissez d’abord la vidéo pour pouvoir publier.</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close [disabled]="saving()">Annuler</button>
      <button mat-flat-button color="primary" type="button" [disabled]="saving()" (click)="submit()">
        {{ saving() ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .pub-dialog { display: grid; gap: 12px; padding-top: 8px !important; min-width: min(580px, calc(100vw - 96px)); }
    .pub-dialog__video { display: grid; gap: 8px; padding: 14px; border: 1px dashed var(--mtm-field-border, var(--mtm-border)); border-radius: var(--mtm-radius-md); background: var(--mtm-bg-surface); }
    .pub-dialog__video.is-occupe { opacity: 0.9; }
    .pub-dialog__fichier { font-size: 0.84rem; line-height: 1.5; color: var(--mtm-text-muted); word-break: break-word; }
    .pub-dialog__progression { display: grid; gap: 4px; }
    .pub-dialog__progression small { color: var(--mtm-text-muted); }
    .pub-dialog__source { display: inline-flex; justify-self: start; padding: 3px; gap: 2px; border: 1px solid var(--mtm-border); border-radius: 999px; background: var(--mtm-bg-surface); }
    .pub-dialog__source button { min-height: 34px; padding: 0 16px; border: 0; border-radius: 999px; background: transparent; color: var(--mtm-text-muted); font: inherit; font-size: 0.86rem; font-weight: 600; cursor: pointer; }
    .pub-dialog__source button.is-actif { background: var(--mtm-primary, #1a4974); color: #fff; }
    .pub-dialog__apercu { display: flex; align-items: center; gap: 12px; font-size: 0.84rem; color: var(--mtm-text-muted); }
    .pub-dialog__apercu img { border-radius: 6px; object-fit: cover; }
    .pub-dialog__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .pub-dialog__erreur { margin: 0; color: var(--mtm-accent); font-size: 0.84rem; }
    .pub-dialog__note { margin: 0; color: var(--mtm-text-muted); font-size: 0.82rem; }
    @media (max-width: 640px) { .pub-dialog__row { grid-template-columns: 1fr; } }
  `,
})
export class PublicationDialog {
  private readonly api = inject(PublicationsApiService);
  private readonly dialogRef = inject(MatDialogRef<PublicationDialog>);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly session = inject(SessionService);
  protected readonly data = inject<PublicationDialogData>(MAT_DIALOG_DATA);

  protected readonly editing = !!this.data.existing;
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly typesAcceptes = TYPES_VIDEO_ACCEPTES;
  protected readonly categories = CATEGORIES_PUBLICATION;
  /** D'où vient la vidéo : un fichier envoyé depuis le poste, ou un lien YouTube. */
  protected readonly source = signal<'fichier' | 'youtube'>(this.data.existing?.youtubeId ? 'youtube' : 'fichier');
  protected readonly saving = signal(false);
  protected readonly fichier = signal<File | null>(null);
  protected readonly erreurFichier = signal<string | null>(null);
  protected readonly phase = signal<'envoi' | 'verification' | null>(null);
  protected readonly progression = signal(0);

  /** Publication déjà créée par une tentative précédente : on la met à jour au lieu d'en créer une seconde. */
  private idCree: string | null = null;

  protected readonly form = this.formBuilder.nonNullable.group({
    titre: [this.data.existing?.titre ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    categorie: [this.data.existing?.categorie ?? ('conseil' as Publication['categorie'])],
    resume: [this.data.existing?.resume ?? '', Validators.maxLength(600)],
    datePublication: [this.data.existing?.datePublication?.slice(0, 10) ?? ''],
    misEnAvant: [this.data.existing?.misEnAvant ?? false],
    youtubeUrl: [this.data.existing?.lienYoutube ?? ''],
    isActive: [this.data.existing?.isActive ?? !!this.canPublish],
  });

  protected aUneVideo(): boolean {
    if (this.source() === 'youtube') return !!this.idYoutubeSaisi();
    return !!this.fichier() || !!this.data.existing?.videoUrl;
  }

  protected idYoutubeSaisi(): string | null {
    return idYoutube(this.form.controls.youtubeUrl.value);
  }

  protected taille(octets: number): string {
    return formaterTaille(octets);
  }

  protected dureeExistante(): string {
    return formaterDuree(this.data.existing?.dureeSecondes);
  }

  protected tailleExistante(): string {
    return formaterTaille(this.data.existing?.tailleOctets);
  }

  protected choisir(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0] ?? null;
    input.value = '';
    if (!fichier) return;
    const probleme = problemeVideo(fichier);
    this.erreurFichier.set(probleme);
    this.fichier.set(probleme ? null : fichier);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const existantId = this.data.existing?.id ?? this.idCree;
    const lienYoutube = this.source() === 'youtube' ? valeur.youtubeUrl.trim() : '';
    if (lienYoutube && !this.idYoutubeSaisi()) {
      this.notify.error(null, 'Ce lien n’est pas une vidéo YouTube reconnue');
      return;
    }
    const payload = {
      titre: valeur.titre.trim(),
      categorie: valeur.categorie,
      resume: valeur.resume.trim(),
      // Création : une date vide est omise. Modification : une date vidée est envoyée (null) pour l'effacer.
      datePublication: valeur.datePublication || (existantId ? null : undefined),
      misEnAvant: valeur.misEnAvant,
      // Un lien remplace la vidéo ; un champ vidé retire le lien déjà enregistré.
      youtubeUrl: this.source() === 'youtube' ? lienYoutube || (this.data.existing?.youtubeId ? '' : undefined) : undefined,
    };
    const fichier = this.source() === 'fichier' ? this.fichier() : null;

    this.saving.set(true);
    this.dialogRef.disableClose = true;
    try {
      const etape1$: Observable<Publication> = existantId ? this.api.update(existantId, payload) : this.api.create(payload);
      let publication = await firstValueFrom(etape1$);
      this.idCree = publication.id;

      if (fichier) {
        this.phase.set('envoi');
        this.progression.set(0);
        const autorisation = await firstValueFrom(this.api.autorisationEnvoi());
        const envoi = await envoyerVideo(fichier, autorisation, { progression: (pourcentage) => this.progression.set(pourcentage) });
        this.phase.set('verification');
        publication = await firstValueFrom(this.api.attacherVideo(publication.id, envoi.publicId));
        this.fichier.set(null);
      }

      const publier = this.canPublish && valeur.isActive && !!(publication.videoUrl || publication.youtubeId);
      if (this.canPublish && publication.isActive !== publier) {
        publication = await firstValueFrom(this.api.publish(publication.id, publier));
      }
      this.notify.success(
        publication.isActive ? 'Enregistrée — visible sur la page Actualités et conseils' : existantId ? 'Modifications enregistrées' : 'Créée — publiez-la pour l’afficher sur le site',
      );
      this.dialogRef.close(true);
    } catch (erreur) {
      // Une erreur d'envoi (ErreurEnvoi) porte déjà son message en clair ; une erreur d'API, le sien.
      this.notify.error(
        erreur,
        this.idCree
          ? 'La publication est enregistrée, mais la vidéo n’a pas pu être envoyée : corrigez puis recommencez'
          : 'Impossible d’enregistrer la publication',
      );
    } finally {
      this.saving.set(false);
      this.phase.set(null);
      this.dialogRef.disableClose = false;
    }
  }

  static open(dialog: MatDialog, data: PublicationDialogData): Observable<boolean | undefined> {
    return dialog.open(PublicationDialog, { width: '680px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
