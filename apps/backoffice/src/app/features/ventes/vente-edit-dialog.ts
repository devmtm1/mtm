import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import { TerrainsApiService } from '../../core/services/api/terrains-api.service';
import type { TerrainListItem } from '../../core/models/terrain.model';
import type { CommercialSummary } from '../../core/models/prospect.model';
import type { VenteDetail } from '../../core/models/vente.model';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

export interface VenteEditDialogData {
  dossier: VenteDetail;
  commercials: CommercialSummary[];
}

export interface VenteEditDialogResult {
  terrainId?: string;
  prixVente?: number;
  commercialResponsableId?: string;
  notes?: string;
}

/**
 * Compléter un dossier de vente : choisir le terrain (parmi les
 * « Disponibles »), fixer le prix, affecter le commercial. Le statut se
 * change à part, avec ses règles.
 */
@Component({
  selector: 'app-vente-edit-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Compléter le dossier</h2>
    <mat-dialog-content class="edit-dialog">
      <p class="edit-dialog__intro">
        Dossier <strong>{{ data.dossier.referenceInterne }}</strong>. Le terrain et le prix conditionnent la réservation,
        l’échéancier et les documents générés.
      </p>

      <h3>Terrain vendu</h3>
      @if (data.dossier.terrain) {
        <p class="edit-dialog__current">Actuellement : <strong>{{ data.dossier.terrain.referenceInterne }} — {{ data.dossier.terrain.nom }}</strong>. Choisissez-en un autre ci-dessous pour le remplacer.</p>
      }
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Rechercher un terrain disponible</mat-label>
        <input matInput [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Référence, nom, commune…" autocomplete="off" />
      </mat-form-field>
      @if (loading()) {
        <div class="skeleton" style="height: 48px"></div>
      } @else if (filtered().length === 0) {
        <p class="edit-dialog__empty">Aucun terrain « Disponible » ne correspond.</p>
      } @else {
        <ul class="edit-dialog__list" role="listbox" aria-label="Terrains disponibles">
          @for (terrain of filtered(); track terrain.id) {
            <li>
              <button type="button" class="pick-option" [class.is-selected]="selected()?.id === terrain.id" (click)="pick(terrain)" role="option" [attr.aria-selected]="selected()?.id === terrain.id">
                <span class="pick-option__main">
                  <strong>{{ terrain.referenceInterne }} — {{ terrain.nom }}</strong>
                  <small>{{ location(terrain) }} · {{ terrain.superficie ? terrain.superficie + ' m²' : 'superficie ?' }}</small>
                </span>
                <span class="pick-option__aside">{{ terrain.prixPublic | mtmMoney }}</span>
              </button>
            </li>
          }
        </ul>
      }

      <form [formGroup]="form" class="edit-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Prix de vente (FCFA)</mat-label>
          <input matInput type="number" min="0" step="1000" formControlName="prixVente" />
          <mat-hint>Changer le prix recalcule l’échéancier tant qu’aucune échéance n’est réglée.</mat-hint>
        </mat-form-field>
        @if (data.commercials.length) {
          <mat-form-field appearance="outline">
            <mat-label>Commercial responsable</mat-label>
            <mat-select formControlName="commercialResponsableId">
              @for (commercial of data.commercials; track commercial.id) {
                <mat-option [value]="commercial.id">{{ commercial.firstName }} {{ commercial.lastName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <mat-form-field appearance="outline" class="edit-dialog__wide">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .edit-dialog { display: grid; gap: 10px; min-width: min(560px, calc(100vw - 96px)); }
    .edit-dialog h3 { margin: 4px 0 0; font-size: 0.9rem; font-weight: 700; }
    .edit-dialog__intro, .edit-dialog__current { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .edit-dialog__empty { margin: 0; padding: 12px; border-radius: 10px; background: var(--mtm-bg-surface); color: var(--mtm-text-muted); font-size: 0.84rem; text-align: center; }
    .edit-dialog__list { display: grid; gap: 6px; max-height: 200px; margin: 0; padding: 2px; overflow-y: auto; list-style: none; }
    .edit-dialog__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; margin-top: 6px; }
    .edit-dialog__wide { grid-column: 1 / -1; }
    .pick-option { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 8px 12px; border: 1px solid var(--mtm-border); border-radius: 10px; background: var(--mtm-card-bg); font: inherit; text-align: left; cursor: pointer; }
    .pick-option:hover { border-color: var(--mtm-primary); }
    .pick-option.is-selected { border-color: var(--mtm-primary); background: var(--mtm-primary-subtle); }
    .pick-option__main { display: grid; gap: 2px; min-width: 0; }
    .pick-option__main strong { font-size: 0.86rem; }
    .pick-option__main small { color: var(--mtm-text-muted); font-size: 0.76rem; }
    .pick-option__aside { font-size: 0.84rem; font-weight: 700; color: var(--mtm-primary); white-space: nowrap; }
    .w-full { width: 100%; }
    @media (max-width: 560px) { .edit-dialog__form { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class VenteEditDialog {
  private readonly dialogRef = inject(MatDialogRef<VenteEditDialog>);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<VenteEditDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly query = signal('');
  protected readonly selected = signal<TerrainListItem | null>(null);
  private readonly terrains = signal<TerrainListItem[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    prixVente: [this.data.dossier.prixVente === null ? null : Number(this.data.dossier.prixVente), Validators.min(0)],
    commercialResponsableId: [this.data.dossier.commercialResponsable?.id ?? ''],
    notes: [''],
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.terrains()
      .filter((terrain) => terrain.id !== this.data.dossier.terrain?.id)
      .filter((terrain) => !q || `${terrain.referenceInterne} ${terrain.nom} ${terrain.commune ?? ''} ${terrain.region ?? ''}`.toLowerCase().includes(q))
      .slice(0, 50);
  });

  constructor() {
    this.terrainsApi.findAll({ statutCommercial: 'Disponible', pageSize: 200 }).subscribe({
      next: (page) => {
        this.terrains.set(page.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected pick(terrain: TerrainListItem): void {
    this.selected.set(this.selected()?.id === terrain.id ? null : terrain);
    if (this.selected() && terrain.prixPublic !== null && this.form.controls.prixVente.value === null) this.form.controls.prixVente.setValue(Number(terrain.prixPublic));
  }

  protected location(terrain: TerrainListItem): string {
    return [terrain.commune, terrain.region].filter(Boolean).join(', ') || 'Localisation non renseignée';
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const result: VenteEditDialogResult = {};
    if (this.selected()) result.terrainId = this.selected()!.id;
    if (raw.prixVente !== null && Number(raw.prixVente) !== Number(this.data.dossier.prixVente ?? -1)) result.prixVente = Number(raw.prixVente);
    if (raw.commercialResponsableId && raw.commercialResponsableId !== this.data.dossier.commercialResponsable?.id) result.commercialResponsableId = raw.commercialResponsableId;
    if (raw.notes.trim()) result.notes = raw.notes.trim();
    this.dialogRef.close(result);
  }

  static open(dialog: MatDialog, data: VenteEditDialogData): Observable<VenteEditDialogResult | undefined> {
    return dialog.open(VenteEditDialog, { width: '600px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
