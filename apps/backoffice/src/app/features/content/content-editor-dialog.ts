import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import { ContentBlockApiService, type ContentBlock } from '../../core/services/api/content-block-api.service';
import { NotificationService } from '../../shared/services/notification.service';

export type ContentEditorKind = 'slot' | 'testimonial' | 'news' | 'custom';

export interface ContentEditorData {
  kind: ContentEditorKind;
  /** Emplacement du catalogue (kind = slot). */
  slot?: { key: string; label: string; help: string; multiline?: boolean; type?: string };
  /** Bloc existant à modifier (slot, testimonial, custom). */
  existing?: ContentBlock | null;
  /** Actualité existante (kind = news) : ses trois blocs. */
  news?: { index: number; title?: ContentBlock; tag?: ContentBlock; excerpt?: ContentBlock };
  /** Prochain index disponible pour une nouvelle actualité. */
  nextNewsIndex?: number;
  /** Ordre proposé pour un nouveau témoignage. */
  nextOrder?: number;
}

/**
 * Édition d'un contenu du site. Quatre cas : un emplacement du catalogue
 * (titre, texte…), un témoignage (auteur + citation), une actualité
 * (titre, étiquette, résumé — trois blocs enregistrés ensemble), ou un bloc
 * libre pour les administrateurs.
 */
@Component({
  selector: 'app-content-editor-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>{{ title() }}</h2>
    <mat-dialog-content class="content-dialog">
      @if (data.kind === 'slot' && data.slot) {
        <p class="content-dialog__intro">{{ data.slot.help }} Laissez vide pour revenir au texte par défaut du site.</p>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ data.slot.label }}</mat-label>
          @if (data.slot.multiline) {
            <textarea matInput rows="6" [formControl]="form.controls.content"></textarea>
          } @else {
            <input matInput [formControl]="form.controls.content" />
          }
        </mat-form-field>
      }

      @if (data.kind === 'testimonial') {
        <p class="content-dialog__intro">Affiché sur la page d’accueil, dans la section « Ce que disent nos clients ».</p>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Auteur</mat-label>
          <input matInput [formControl]="form.controls.title" placeholder="Ex. Aminata N. | France" />
          <mat-hint>
            Prénom et initiale suffisent ; pas de nom complet sans accord. Ajoutez « | Pays » pour
            afficher le drapeau du pays de résidence (ex. « Awa D. | France »).
          </mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Témoignage</mat-label>
          <textarea matInput rows="4" [formControl]="form.controls.content" placeholder="Ce que le client dit de MTM…"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ordre d’affichage</mat-label>
          <input matInput type="number" min="0" [formControl]="form.controls.ordre" />
          <mat-hint>Les plus petits numéros s’affichent en premier.</mat-hint>
        </mat-form-field>
      }

      @if (data.kind === 'news') {
        <p class="content-dialog__intro">Affichée sur la page « Actualités et conseils ».</p>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Titre</mat-label>
          <input matInput [formControl]="form.controls.title" placeholder="Ex. 5 vérifications avant d’acheter un terrain" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Étiquette</mat-label>
          <input matInput [formControl]="form.controls.tag" placeholder="Ex. Conseil, Actualité, Juridique" />
          <mat-hint>Petit mot-clé affiché au-dessus du titre.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Résumé</mat-label>
          <textarea matInput rows="5" [formControl]="form.controls.content" placeholder="Le contenu de l’article, en quelques paragraphes."></textarea>
        </mat-form-field>
      }

      @if (data.kind === 'custom') {
        <p class="content-dialog__intro">Bloc libre, réservé aux cas prévus par le développeur : la clé doit correspondre à un emplacement lu par le site.</p>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Clé technique</mat-label>
          <input matInput [formControl]="form.controls.key" placeholder="ex. home.section.titre" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Titre (facultatif)</mat-label>
          <input matInput [formControl]="form.controls.title" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Contenu</mat-label>
          <textarea matInput rows="6" [formControl]="form.controls.content"></textarea>
        </mat-form-field>
      }

      @if (data.kind !== 'slot') {
        <mat-checkbox [formControl]="form.controls.isActive">Publié sur le site</mat-checkbox>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="saving() || !valid()">
        {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .content-dialog { display: grid; gap: 6px; min-width: min(560px, calc(100vw - 96px)); }
    .content-dialog__intro { margin: 0 0 8px; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .w-full { width: 100%; }
  `,
})
export class ContentEditorDialog {
  private readonly api = inject(ContentBlockApiService);
  private readonly dialogRef = inject(MatDialogRef<ContentEditorDialog>);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<ContentEditorData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    key: [this.data.existing?.key ?? '', [Validators.minLength(2), Validators.maxLength(200)]],
    title: [this.data.kind === 'news' ? (this.data.news?.title?.content ?? '') : (this.data.existing?.title ?? '')],
    tag: [this.data.news?.tag?.content ?? ''],
    content: [this.data.kind === 'news' ? (this.data.news?.excerpt?.content ?? '') : (this.data.existing?.content ?? '')],
    ordre: [this.data.existing?.ordre ?? this.data.nextOrder ?? 0],
    isActive: [this.data.kind === 'news' ? (this.data.news?.title?.isActive ?? true) : (this.data.existing?.isActive ?? true)],
  });

  protected title(): string {
    switch (this.data.kind) {
      case 'slot':
        return this.data.slot?.label ?? 'Contenu';
      case 'testimonial':
        return this.data.existing ? 'Modifier le témoignage' : 'Nouveau témoignage';
      case 'news':
        return this.data.news ? 'Modifier l’actualité' : 'Nouvelle actualité';
      default:
        return this.data.existing ? 'Modifier le bloc' : 'Nouveau bloc';
    }
  }

  protected valid(): boolean {
    const value = this.form.getRawValue();
    switch (this.data.kind) {
      case 'slot':
        return true;
      case 'testimonial':
        return value.content.trim().length > 0;
      case 'news':
        return value.title.trim().length > 0;
      default:
        return value.key.trim().length >= 2 && value.content.trim().length > 0;
    }
  }

  protected submit(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    const done = () => {
      this.saving.set(false);
      this.notify.success('Contenu enregistré');
      this.dialogRef.close(true);
    };
    const fail = (error: unknown) => {
      this.saving.set(false);
      this.notify.error(error, 'Impossible d’enregistrer le contenu');
    };

    if (this.data.kind === 'slot' && this.data.slot) {
      const slot = this.data.slot;
      const content = value.content.trim();
      if (this.data.existing) {
        // Vider le champ = revenir au texte par défaut du site : on supprime le bloc.
        const request: Observable<unknown> = content ? this.api.update(slot.key, { content }) : this.api.remove(slot.key);
        request.subscribe({ next: done, error: fail });
      } else if (content) {
        this.api.create({ key: slot.key, title: slot.label, content, type: slot.type ?? 'text', ordre: 0, isActive: true }).subscribe({ next: done, error: fail });
      } else {
        done();
      }
      return;
    }

    if (this.data.kind === 'news') {
      const index = this.data.news?.index ?? this.data.nextNewsIndex ?? 1;
      const upsert = (suffix: 'title' | 'tag' | 'excerpt', content: string, existing?: ContentBlock): Observable<unknown> | null => {
        const key = `news.${index}.${suffix}`;
        if (existing) return content ? (this.api.update(key, { content, ordre: index }) as Observable<unknown>) : this.api.remove(key);
        return content ? this.api.create({ key, title: `Actualité ${index} — ${suffix}`, content, type: suffix === 'tag' ? 'stat' : 'text', ordre: index, isActive: value.isActive }) : null;
      };
      const requests = [upsert('title', value.title.trim(), this.data.news?.title), upsert('tag', value.tag.trim(), this.data.news?.tag), upsert('excerpt', value.content.trim(), this.data.news?.excerpt)].filter((item): item is Observable<unknown> => item !== null);
      this.chain(requests, () => {
        const publishTargets = [this.data.news?.title, this.data.news?.tag, this.data.news?.excerpt].filter((block): block is ContentBlock => !!block && block.isActive !== value.isActive);
        this.chain(
          publishTargets.map((block) => this.api.publish(block.key, value.isActive)),
          done,
          fail,
        );
      }, fail);
      return;
    }

    const isTestimonial = this.data.kind === 'testimonial';
    const payload = {
      key: isTestimonial ? (this.data.existing?.key ?? `testimonial.${Date.now()}`) : value.key.trim(),
      title: value.title.trim() || null,
      content: value.content.trim(),
      type: isTestimonial ? 'testimonial' : (this.data.existing?.type ?? 'text'),
      ordre: Number(value.ordre) || 0,
      isActive: value.isActive,
    };
    if (this.data.existing) {
      const existing = this.data.existing;
      this.api.update(existing.key, { title: payload.title, content: payload.content, ordre: payload.ordre }).subscribe({
        next: () => {
          if (existing.isActive !== payload.isActive) this.api.publish(existing.key, payload.isActive).subscribe({ next: done, error: fail });
          else done();
        },
        error: fail,
      });
    } else {
      this.api.create(payload).subscribe({ next: done, error: fail });
    }
  }

  /** Exécute des requêtes l'une après l'autre (l'API n'a pas d'endroit pour les grouper). */
  private chain(requests: Observable<unknown>[], done: () => void, fail: (error: unknown) => void): void {
    const [first, ...rest] = requests;
    if (!first) {
      done();
      return;
    }
    first.subscribe({ next: () => this.chain(rest, done, fail), error: fail });
  }

  static open(dialog: MatDialog, data: ContentEditorData): Observable<boolean | undefined> {
    return dialog.open(ContentEditorDialog, { width: '600px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
