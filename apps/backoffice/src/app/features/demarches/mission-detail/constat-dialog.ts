import { Component, inject, signal } from '@angular/core';
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
import type { EtapeMission, EtapeMissionPayload } from '../../../core/models/mission.model';
import {
  ADMINISTRATIONS,
  CONFORMITES,
  RESULTATS_ADMINISTRATION,
  help,
  label,
} from '../mission-status';

export interface ConstatDialogData {
  /** « verification_physique » ou « verification_administrative ». */
  type: string;
  constat?: EtapeMission;
  conformites: string[];
  administrations: string[];
  resultats: string[];
}

/**
 * Saisie d'un constat : visite sur site (étape 3) ou administration
 * consultée (étape 4). Les deux natures partagent la même trace — qui, quand,
 * ce qui a été observé — et n'affichent que leurs champs propres.
 */
@Component({
  selector: 'app-constat-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ titreDialogue }}</h2>
    <mat-dialog-content>
      <p class="constat__intro">{{ introDialogue }}</p>
      <form [formGroup]="form" class="constat__form">
        <mat-form-field appearance="outline" class="constat__wide">
          <mat-label>Intitulé du constat</mat-label>
          <input matInput formControlName="titre" [placeholder]="placeholderTitre" />
          <mat-error>Donnez un intitulé : il apparaîtra dans le rapport du client.</mat-error>
        </mat-form-field>

        @if (estPhysique) {
          <mat-form-field appearance="outline">
            <mat-label>Date de la visite</mat-label>
            <input matInput type="date" formControlName="dateVisite" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Conformité apparente</mat-label>
            <mat-select formControlName="conformiteApparente">
              <mat-option value="">Non renseignée</mat-option>
              @for (valeur of data.conformites; track valeur) {
                <mat-option [value]="valeur">{{ conformiteLabel(valeur) }}</mat-option>
              }
            </mat-select>
            <mat-hint>{{ conformiteAide(form.controls.conformiteApparente.value) }}</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Latitude relevée</mat-label>
            <input matInput type="number" step="0.0000001" formControlName="latitude" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Longitude relevée</mat-label>
            <input matInput type="number" step="0.0000001" formControlName="longitude" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="constat__wide">
            <mat-label>Accès au terrain</mat-label>
            <input matInput formControlName="accesDescription" placeholder="Route, piste, praticabilité" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="constat__wide">
            <mat-label>Environnement</mat-label>
            <input
              matInput
              formControlName="environnement"
              placeholder="Bâti alentour, occupation, nuisances"
            />
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline">
            <mat-label>Administration consultée</mat-label>
            <mat-select formControlName="administration">
              @for (valeur of data.administrations; track valeur) {
                <mat-option [value]="valeur">{{ administrationLabel(valeur) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Résultat</mat-label>
            <mat-select formControlName="resultat">
              <mat-option value="">Non renseigné</mat-option>
              @for (valeur of data.resultats; track valeur) {
                <mat-option [value]="valeur">{{ resultatLabel(valeur) }}</mat-option>
              }
            </mat-select>
            <mat-hint>{{ resultatAide(form.controls.resultat.value) }}</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="constat__wide">
            <mat-label>Interlocuteur rencontré</mat-label>
            <input matInput formControlName="interlocuteur" placeholder="Nom et fonction" />
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="constat__wide">
          <mat-label>Observations</mat-label>
          <textarea
            matInput
            rows="4"
            formControlName="observations"
            [placeholder]="placeholderObservations"
          ></textarea>
          <mat-hint>Ce texte est repris tel quel dans le rapport remis au client.</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date du constat</mat-label>
          <input matInput type="date" formControlName="realiseeLe" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="annuler()">Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()">
        Enregistrer le constat
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .constat__intro { margin: 0 0 14px; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .constat__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; min-width: min(620px, calc(100vw - 96px)); }
    .constat__wide { grid-column: 1 / -1; }
    @media (max-width: 720px) { .constat__form { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class ConstatDialog {
  private readonly dialogRef =
    inject<MatDialogRef<ConstatDialog, EtapeMissionPayload | undefined>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<ConstatDialogData>(MAT_DIALOG_DATA);

  protected readonly estPhysique = this.data.type === 'verification_physique';
  protected readonly enregistrement = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    titre: [this.data.constat?.titre ?? this.titreParDefaut(), Validators.required],
    observations: [this.data.constat?.observations ?? ''],
    dateVisite: [this.jour(this.data.constat?.dateVisite)],
    latitude: [this.nombre(this.data.constat?.latitude)],
    longitude: [this.nombre(this.data.constat?.longitude)],
    accesDescription: [this.data.constat?.accesDescription ?? ''],
    environnement: [this.data.constat?.environnement ?? ''],
    conformiteApparente: [this.data.constat?.conformiteApparente ?? ''],
    administration: [this.data.constat?.administration ?? this.data.administrations[0] ?? ''],
    interlocuteur: [this.data.constat?.interlocuteur ?? ''],
    resultat: [this.data.constat?.resultat ?? ''],
    realiseeLe: [this.jour(this.data.constat?.realiseeLe) || this.aujourdhui()],
  });

  protected get titreDialogue(): string {
    const action = this.data.constat ? 'Modifier le constat' : 'Nouveau constat';
    return this.estPhysique ? `${action} — visite du terrain` : `${action} — administration`;
  }

  protected get introDialogue(): string {
    return this.estPhysique
      ? 'Ce qui a été vu sur place : état du terrain, accès, environnement, coordonnées relevées.'
      : 'L’administration consultée, l’interlocuteur rencontré et la réponse obtenue.';
  }

  protected get placeholderTitre(): string {
    return this.estPhysique
      ? 'Ex. : visite du terrain et relevé GPS'
      : 'Ex. : consultation du service des Domaines de Mbour';
  }

  protected get placeholderObservations(): string {
    return this.estPhysique
      ? 'Ex. : parcelle libre de toute occupation, bornes visibles aux quatre angles.'
      : 'Ex. : titre confirmé au nom du vendeur, aucune opposition enregistrée.';
  }

  protected conformiteLabel(valeur: string): string {
    return label(CONFORMITES, valeur);
  }

  protected conformiteAide(valeur: string): string {
    return help(CONFORMITES, valeur);
  }

  protected administrationLabel(valeur: string): string {
    return label(ADMINISTRATIONS, valeur);
  }

  protected resultatLabel(valeur: string): string {
    return label(RESULTATS_ADMINISTRATION, valeur);
  }

  protected resultatAide(valeur: string): string {
    return help(RESULTATS_ADMINISTRATION, valeur);
  }

  protected annuler(): void {
    this.dialogRef.close(undefined);
  }

  protected valider(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    const date = (item: string) => (item ? new Date(item).toISOString() : undefined);
    this.dialogRef.close({
      type: this.data.type,
      titre: valeur.titre.trim(),
      observations: texte(valeur.observations),
      realiseeLe: date(valeur.realiseeLe),
      ...(this.estPhysique
        ? {
            dateVisite: date(valeur.dateVisite),
            latitude: valeur.latitude ?? undefined,
            longitude: valeur.longitude ?? undefined,
            accesDescription: texte(valeur.accesDescription),
            environnement: texte(valeur.environnement),
            conformiteApparente: valeur.conformiteApparente || undefined,
          }
        : {
            administration: valeur.administration || undefined,
            interlocuteur: texte(valeur.interlocuteur),
            resultat: valeur.resultat || undefined,
          }),
    });
  }

  private titreParDefaut(): string {
    return this.data.type === 'verification_physique'
      ? 'Visite du terrain'
      : 'Consultation d’une administration';
  }

  private jour(valeur?: string | null): string {
    return valeur ? valeur.slice(0, 10) : '';
  }

  private aujourdhui(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private nombre(valeur?: number | string | null): number | null {
    if (valeur === null || valeur === undefined || valeur === '') return null;
    const converti = Number(valeur);
    return Number.isFinite(converti) ? converti : null;
  }

  static open(
    dialog: MatDialog,
    data: ConstatDialogData,
  ): Observable<EtapeMissionPayload | undefined> {
    return dialog
      .open(ConstatDialog, { width: '680px', maxWidth: 'calc(100vw - 32px)', data })
      .afterClosed() as Observable<EtapeMissionPayload | undefined>;
  }
}
