import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import { PolesApiService, type Pole, type PolePayload } from '../../../core/services/api/poles-api.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { SessionService } from '../../../core/services/session.service';

export interface PoleEditorData {
  existing: Pole | null;
  nextOrder: number;
  /** Les autres pôles, proposables en complément. */
  autres: { slug: string; nom: string }[];
}

/** Le lien d'un pôle : un chemin du site ou une adresse https, rien d'autre. */
const LIEN_VALIDE = /^(\/(?!\/)|https:\/\/)/;

/** Création / modification d'un pôle d'activité (la photo s'ajoute depuis la carte). */
@Component({
  selector: 'app-pole-editor-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Modifier le pôle' : 'Ajouter un pôle' }}</h2>
    <mat-dialog-content class="pole-dialog" [formGroup]="form">
      <mat-form-field appearance="outline">
        <mat-label>Nom du pôle</mat-label>
        <input matInput formControlName="nom" autocomplete="off" />
        <mat-hint>Ex. « MTM Clean ». C’est le titre de la carte.</mat-hint>
        @if (form.controls.nom.touched && form.controls.nom.invalid) {
          <mat-error>Deux caractères minimum.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Mention rouge</mat-label>
        <input matInput formControlName="accroche" autocomplete="off" maxlength="160" />
        <mat-hint>Sous le titre, ex. « Nettoyage et entretien ».</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Phrase courte (accueil)</mat-label>
        <textarea matInput rows="3" formControlName="description" maxlength="400"></textarea>
        <mat-hint>Affichée sur la carte de la page d’accueil. {{ form.controls.description.value.length }}/400</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Prestations (une par ligne)</mat-label>
        <textarea matInput rows="6" formControlName="points"></textarea>
        <mat-hint>Chaque ligne devient une puce sur la page « Nos services » (12 au maximum).</mat-hint>
        @if (form.controls.points.touched && form.controls.points.errors?.['trop']) {
          <mat-error>12 prestations au maximum.</mat-error>
        }
      </mat-form-field>

      <div class="pole-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Texte du bouton</mat-label>
          <input matInput formControlName="libelleLien" autocomplete="off" maxlength="60" />
          <mat-hint>Ex. « Demander un devis ».</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="pole-dialog__order">
          <mat-label>Ordre</mat-label>
          <input matInput type="number" min="0" formControlName="ordre" />
          <mat-hint>Plus petit d’abord.</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Lien du bouton</mat-label>
        <input matInput formControlName="lienUrl" autocomplete="off" placeholder="/contact?sujet=MTM%20Clean" />
        <mat-hint>Une page du site (commence par /) ou une adresse https://. Vide : pas de bouton.</mat-hint>
        @if (form.controls.lienUrl.touched && form.controls.lienUrl.errors?.['lien']) {
          <mat-error>Commencez par / (page du site) ou https://.</mat-error>
        }
      </mat-form-field>

      @if (data.autres.length > 0) {
        <mat-form-field appearance="outline">
          <mat-label>Services complémentaires</mat-label>
          <mat-select formControlName="lies" multiple>
            @for (autre of data.autres; track autre.slug) {
              <mat-option [value]="autre.slug">{{ autre.nom }}</mat-option>
            }
          </mat-select>
          <mat-hint>Proposés en bas de la page de ce pôle (6 au maximum).</mat-hint>
          @if (form.controls.lies.errors?.['trop']) {
            <mat-error>6 services au maximum.</mat-error>
          }
        </mat-form-field>
      }

      <mat-checkbox formControlName="surAccueil">Montrer sur la page d’accueil</mat-checkbox>
      @if (canPublish) {
        <mat-checkbox formControlName="isActive">Visible sur le site</mat-checkbox>
      }
      @if (!editing) {
        <p class="pole-dialog__note">La photo s’ajoute juste après, depuis la carte (bouton « Photo »).</p>
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
    .pole-dialog {
      display: grid;
      gap: 12px;
      padding-top: 8px !important;
    }
    .pole-dialog__row {
      display: grid;
      grid-template-columns: 1fr 140px;
      gap: 12px;
    }
    .pole-dialog__note {
      margin: 0;
      color: var(--mtm-text-muted);
      font-size: 0.82rem;
    }
  `,
})
export class PoleEditorDialog {
  private readonly api = inject(PolesApiService);
  private readonly dialogRef = inject(MatDialogRef<PoleEditorDialog>);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly session = inject(SessionService);
  protected readonly data = inject<PoleEditorData>(MAT_DIALOG_DATA);

  protected readonly editing = !!this.data.existing;
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    nom: [this.data.existing?.nom ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    accroche: [this.data.existing?.accroche ?? '', Validators.maxLength(160)],
    description: [this.data.existing?.description ?? '', Validators.maxLength(400)],
    points: [(this.data.existing?.points ?? []).join('\n'), (control: { value: string }) => (lignes(control.value).length > 12 ? { trop: true } : null)],
    libelleLien: [this.data.existing?.libelleLien ?? '', Validators.maxLength(60)],
    lienUrl: [
      this.data.existing?.lienUrl ?? '',
      (control: { value: string }) => (control.value.trim() && !LIEN_VALIDE.test(control.value.trim()) ? { lien: true } : null),
    ],
    ordre: [this.data.existing?.ordre ?? this.data.nextOrder, Validators.min(0)],
    surAccueil: [this.data.existing?.surAccueil ?? false],
    lies: this.formBuilder.nonNullable.control<string[]>(this.data.existing?.lies ?? [], (control) => ((control.value as string[]).length > 6 ? { trop: true } : null)),
    isActive: [this.data.existing?.isActive ?? true],
  });

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    // Un champ vidé est transmis vide : le serveur l'efface au lieu de garder l'ancienne valeur.
    const fields = {
      nom: value.nom.trim(),
      accroche: value.accroche.trim(),
      description: value.description.trim(),
      points: lignes(value.points),
      libelleLien: value.libelleLien.trim(),
      lienUrl: value.lienUrl.trim(),
      ordre: Number(value.ordre) || 0,
      surAccueil: value.surAccueil,
      lies: value.lies,
    };
    const existing = this.data.existing;
    const payload: PolePayload = { ...fields, isActive: this.canPublish ? value.isActive : false };
    const request$: Observable<Pole> = existing ? this.api.update(existing.id, fields) : this.api.create(payload);

    request$.subscribe({
      next: (pole) => {
        const republish = existing && this.canPublish && existing.isActive !== value.isActive;
        if (!republish) return this.finish(existing ? 'Modifications enregistrées' : 'Pôle ajouté — pensez à lui associer une photo');
        this.api.publish(pole.id, value.isActive).subscribe({
          next: () => this.finish(value.isActive ? 'Enregistré et publié' : 'Enregistré et retiré du site'),
          error: (error: unknown) => this.fail(error),
        });
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private finish(message: string): void {
    this.saving.set(false);
    this.notify.success(message);
    this.dialogRef.close(true);
  }

  private fail(error: unknown): void {
    this.saving.set(false);
    this.notify.error(error, 'Impossible d’enregistrer');
  }

  static open(dialog: MatDialog, data: PoleEditorData): Observable<boolean | undefined> {
    return dialog.open(PoleEditorDialog, { width: '620px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}

/** Les prestations saisies : une par ligne, sans blancs ni lignes vides. */
function lignes(texte: string): string[] {
  return texte
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter(Boolean);
}
