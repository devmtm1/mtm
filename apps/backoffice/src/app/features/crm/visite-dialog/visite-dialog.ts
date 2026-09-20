import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { CommercialSummary, ProspectOptions, VisiteProspectItem, VisiteProspectPayload } from '../../../core/models/prospect.model';
import type { TerrainCatalogueItem } from '../../../core/models/terrain.model';
import { OBJECTIONS, PRICE_FEEDBACK, VISITE_CANCEL_REASONS, VISITE_FEEDBACK, VISITE_STATUS, help, label } from '../crm-status';

export interface VisiteDialogData {
  prospectName: string;
  /** Visite à modifier ; absente quand on propose un nouveau terrain. */
  visite?: VisiteProspectItem;
  commercials: CommercialSummary[];
  /** Ouvre directement la partie « retour après la visite ». */
  focusRetour?: boolean;
}

export type VisiteDialogResult = VisiteProspectPayload;

/**
 * Proposer un terrain à un prospect, fixer la visite et enregistrer le
 * retour du client — les trois moments de la fiche de suivi MTM, dans un
 * seul écran, parce qu'ils concernent le même terrain.
 */
@Component({
  selector: 'app-visite-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.visite ? 'Visite et retour client' : 'Proposer un terrain' }}</h2>
    <mat-dialog-content class="visite-dialog">
      <p class="visite-dialog__intro">
        Pour <strong>{{ data.prospectName }}</strong>. Chaque terrain proposé garde sa propre visite et son
        propre retour : c'est l'historique des propositions faites au client.
      </p>

      <form [formGroup]="form" class="visite-dialog__form">
        <mat-form-field appearance="outline" class="visite-dialog__wide">
          <mat-label>Terrain proposé</mat-label>
          <mat-select formControlName="terrainId">
            @for (terrain of terrains(); track terrain.id) {
              <mat-option [value]="terrain.id">
                {{ terrain.referenceInterne }} · {{ terrain.nom }}
                @if (terrain.commune) {
                  <span class="visite-dialog__option-meta">{{ terrain.commune }}</span>
                }
              </mat-option>
            }
          </mat-select>
          <mat-hint>{{ terrainHint() }}</mat-hint>
          <mat-error>Choisissez le terrain concerné.</mat-error>
        </mat-form-field>

        <p class="visite-dialog__section">Rendez-vous</p>
        <mat-form-field appearance="outline">
          <mat-label>Date proposée</mat-label>
          <input matInput type="date" formControlName="dateProposee" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date confirmée</mat-label>
          <input matInput type="date" formControlName="dateConfirmee" />
          <mat-hint>Une date confirmée passe la visite en « programmée ».</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Heure</mat-label>
          <input matInput type="time" formControlName="heure" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Lieu de rendez-vous</mat-label>
          <input matInput formControlName="lieuRendezVous" placeholder="Devant la mairie, station Total…" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Frais de visite (FCFA)</mat-label>
          <input matInput type="number" min="0" step="1000" formControlName="fraisVisite" />
        </mat-form-field>
        <div class="visite-dialog__check">
          <mat-checkbox formControlName="fraisPayes">Frais de visite payés</mat-checkbox>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Commercial accompagnateur</mat-label>
          <mat-select formControlName="accompagnateurId">
            <mat-option value="">Non précisé</mat-option>
            @for (commercial of data.commercials; track commercial.id) {
              <mat-option [value]="commercial.id">{{ commercial.firstName }} {{ commercial.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Si la visite n’a pas eu lieu</mat-label>
          <mat-select formControlName="motifNonEffectuee">
            <mat-option value="">La visite a eu lieu ou reste prévue</mat-option>
            @for (motif of motifs(); track motif) {
              <mat-option [value]="motif">{{ cancelLabel(motif) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <p class="visite-dialog__section">Retour après la visite</p>
        <mat-form-field appearance="outline">
          <mat-label>Date du retour</mat-label>
          <input matInput type="date" formControlName="dateRetour" />
          <mat-hint>Saisir un retour passe la visite en « effectuée ».</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Le terrain plaît ?</mat-label>
          <mat-select formControlName="terrainPlait">
            <mat-option value="">Pas encore de retour</mat-option>
            @for (avis of appreciations(); track avis) {
              <mat-option [value]="avis">{{ feedbackLabel(avis) }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ feedbackHelp(form.controls.terrainPlait.value) }}</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Prix</mat-label>
          <mat-select formControlName="prixAccepte">
            <mat-option value="">Non abordé</mat-option>
            @for (avis of prixOptions(); track avis) {
              <mat-option [value]="avis">{{ priceLabel(avis) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Objection principale</mat-label>
          <mat-select formControlName="objectionPrincipale">
            <mat-option value="">Aucune</mat-option>
            @for (objection of objections(); track objection) {
              <mat-option [value]="objection">{{ objectionLabel(objection) }}</mat-option>
            }
          </mat-select>
          <mat-hint>Sert à comprendre ce qui bloque, terrain par terrain.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="visite-dialog__wide">
          <mat-label>Commentaires du client</mat-label>
          <textarea matInput rows="2" formControlName="commentaireClient" placeholder="Ses mots à lui : ce qui plaît, ce qui gêne…"></textarea>
        </mat-form-field>
        <div class="visite-dialog__check visite-dialog__wide">
          <mat-checkbox formControlName="souhaiteAutreTerrain">Souhaite voir un autre terrain</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">
        {{ data.visite ? 'Enregistrer' : 'Ajouter la proposition' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .visite-dialog { display: grid; gap: 12px; min-width: min(620px, calc(100vw - 96px)); }
    .visite-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .visite-dialog__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; }
    .visite-dialog__wide { grid-column: 1 / -1; }
    .visite-dialog__section { grid-column: 1 / -1; margin: 10px 0 0; font-weight: 600; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mtm-text-muted); }
    .visite-dialog__check { display: flex; align-items: center; min-height: 56px; }
    .visite-dialog__option-meta { margin-left: 8px; color: var(--mtm-text-muted); font-size: 0.8rem; }
    @media (max-width: 620px) { .visite-dialog__form { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class VisiteDialog {
  private readonly dialogRef = inject(MatDialogRef<VisiteDialog, VisiteDialogResult | undefined>);
  private readonly api = inject(CrmApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<VisiteDialogData>(MAT_DIALOG_DATA);

  protected readonly terrains = signal<TerrainCatalogueItem[]>([]);
  protected readonly motifs = signal<string[]>(Object.keys(VISITE_CANCEL_REASONS));
  protected readonly appreciations = signal<string[]>(Object.keys(VISITE_FEEDBACK));
  protected readonly prixOptions = signal<string[]>(Object.keys(PRICE_FEEDBACK));
  protected readonly objections = signal<string[]>(Object.keys(OBJECTIONS));

  protected readonly cancelLabel = (value: string) => label(VISITE_CANCEL_REASONS, value);
  protected readonly feedbackLabel = (value: string) => label(VISITE_FEEDBACK, value);
  protected readonly feedbackHelp = (value: string) => help(VISITE_FEEDBACK, value);
  protected readonly priceLabel = (value: string) => label(PRICE_FEEDBACK, value);
  protected readonly objectionLabel = (value: string) => label(OBJECTIONS, value);
  protected readonly statutLabel = (value: string) => label(VISITE_STATUS, value);

  protected readonly form = this.formBuilder.nonNullable.group({
    terrainId: [this.data.visite?.terrain.id ?? '', Validators.required],
    dateProposee: [this.day(this.data.visite?.dateProposee)],
    dateConfirmee: [this.day(this.data.visite?.dateConfirmee)],
    heure: [this.data.visite?.heure ?? ''],
    lieuRendezVous: [this.data.visite?.lieuRendezVous ?? ''],
    fraisVisite: [this.data.visite?.fraisVisite ?? (null as number | null)],
    fraisPayes: [this.data.visite?.fraisPayes ?? false],
    accompagnateurId: [this.data.visite?.accompagnateur?.id ?? ''],
    motifNonEffectuee: [this.data.visite?.motifNonEffectuee ?? ''],
    dateRetour: [this.day(this.data.visite?.dateRetour)],
    terrainPlait: [this.data.visite?.terrainPlait ?? ''],
    prixAccepte: [this.data.visite?.prixAccepte ?? ''],
    objectionPrincipale: [this.data.visite?.objectionPrincipale ?? ''],
    commentaireClient: [this.data.visite?.commentaireClient ?? ''],
    souhaiteAutreTerrain: [this.data.visite?.souhaiteAutreTerrain ?? false],
  });

  constructor() {
    // Le terrain déjà proposé reste sélectionnable même s'il n'est plus
    // disponible (il a pu être réservé entre-temps).
    this.terrainsApi.catalogueProposition().subscribe({
      next: (items) => this.terrains.set(this.withCurrent(items)),
      error: () => this.terrains.set(this.withCurrent([])),
    });
    this.api.getOptions().subscribe({
      next: (options: ProspectOptions) => {
        if (options.motifsNonVisite?.length) this.motifs.set(options.motifsNonVisite);
        if (options.appreciationsTerrain?.length) this.appreciations.set(options.appreciationsTerrain);
        if (options.prixAccepte?.length) this.prixOptions.set(options.prixAccepte);
        if (options.objections?.length) this.objections.set(options.objections);
      },
    });
  }

  protected terrainHint(): string {
    const terrain = this.terrains().find((item) => item.id === this.form.controls.terrainId.value);
    if (!terrain) return 'Le terrain montré ou à montrer au client.';
    const superficie = terrain.superficie ? `${terrain.superficie} m²` : null;
    return [terrain.commune, superficie, terrain.statutCommercial].filter(Boolean).join(' · ');
  }

  /**
   * Un terrain déjà proposé doit rester affiché même s'il est sorti du
   * catalogue entre-temps (vendu à un autre client, par exemple).
   */
  private withCurrent(items: TerrainCatalogueItem[]): TerrainCatalogueItem[] {
    const courant = this.data.visite?.terrain;
    if (!courant || items.some((item) => item.id === courant.id)) return items;
    return [
      {
        id: courant.id,
        referenceInterne: courant.referenceInterne,
        nom: courant.nom,
        commune: courant.commune ?? null,
        region: courant.region ?? null,
        superficie: courant.superficie ?? null,
        prixPublic: courant.prixPublic ?? null,
        statutCommercial: courant.statutCommercial ?? 'Hors catalogue',
      },
      ...items,
    ];
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const text = (item: string) => (item.trim() ? item.trim() : undefined);
    const date = (item: string) => (item ? new Date(item).toISOString() : undefined);
    this.dialogRef.close({
      terrainId: value.terrainId,
      dateProposee: date(value.dateProposee),
      dateConfirmee: date(value.dateConfirmee),
      heure: text(value.heure),
      lieuRendezVous: text(value.lieuRendezVous),
      fraisVisite: value.fraisVisite ?? undefined,
      fraisPayes: value.fraisPayes,
      accompagnateurId: value.accompagnateurId || undefined,
      motifNonEffectuee: text(value.motifNonEffectuee),
      dateRetour: date(value.dateRetour),
      terrainPlait: text(value.terrainPlait),
      prixAccepte: text(value.prixAccepte),
      objectionPrincipale: text(value.objectionPrincipale),
      commentaireClient: text(value.commentaireClient),
      souhaiteAutreTerrain: value.souhaiteAutreTerrain,
    });
  }

  private day(value?: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  static open(dialog: MatDialog, data: VisiteDialogData): Observable<VisiteDialogResult | undefined> {
    return dialog
      .open(VisiteDialog, { width: '660px', maxWidth: 'calc(100vw - 32px)', data })
      .afterClosed() as Observable<VisiteDialogResult | undefined>;
  }
}
