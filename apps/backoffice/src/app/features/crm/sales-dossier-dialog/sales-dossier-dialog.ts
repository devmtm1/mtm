import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { TerrainListItem } from '../../../core/models/terrain.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

export interface SalesDossierDialogData {
  prospectId: string;
  prospectName: string;
  budgetMax?: number | null;
}

/**
 * Ouvrir un dossier de vente pour un prospect : on choisit le terrain
 * (parmi les « Disponibles »), le prix prévisionnel se pré-remplit avec le
 * prix public. Le dossier est ensuite suivi dans le module Ventes.
 */
@Component({
  selector: 'app-sales-dossier-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Ouvrir un dossier de vente</h2>
    <mat-dialog-content class="dossier-dialog">
      <p class="dossier-dialog__intro">
        Pour <strong>{{ data.prospectName }}</strong>. Le dossier regroupera réservation, paiements, documents et
        commissions ; il se gère ensuite dans <strong>Ventes</strong>.
      </p>
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Terrain concerné</mat-label>
        <input matInput [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Référence, nom, commune…" autocomplete="off" />
      </mat-form-field>
      @if (loading()) {
        <div class="skeleton" style="height: 48px"></div>
      } @else if (filtered().length === 0) {
        <p class="dossier-dialog__empty">Aucun terrain « Disponible » ne correspond. Seuls les terrains publiés peuvent faire l’objet d’un dossier.</p>
      } @else {
        <ul class="dossier-dialog__list" role="listbox" aria-label="Terrains disponibles">
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
      @if (overBudget()) {
        <p class="dossier-dialog__warn">Le prix public dépasse le budget indiqué par le prospect ({{ data.budgetMax | mtmMoney }}).</p>
      }
      <form [formGroup]="form" class="dossier-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Prix de vente prévisionnel (FCFA)</mat-label>
          <input matInput type="number" min="0" step="1000" formControlName="prixVente" />
          <mat-hint>Pré-rempli avec le prix public ; ajustable si négocié.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="2" formControlName="notes" placeholder="Ex. Paiement en 3 fois demandé"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="creating() || !selected()">
        {{ creating() ? 'Création…' : 'Ouvrir le dossier' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dossier-dialog { display: grid; gap: 12px; min-width: min(520px, calc(100vw - 96px)); }
    .dossier-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .dossier-dialog__empty { margin: 0; padding: 14px; border-radius: 10px; background: var(--mtm-bg-surface); color: var(--mtm-text-muted); font-size: 0.84rem; text-align: center; }
    .dossier-dialog__warn { margin: 0; padding: 10px 12px; border-radius: 8px; background: var(--mtm-warning-bg); color: var(--mtm-warning); font-size: 0.82rem; }
    .dossier-dialog__list { display: grid; gap: 6px; max-height: 240px; margin: 0; padding: 2px; overflow-y: auto; list-style: none; }
    .dossier-dialog__form { display: grid; gap: 4px; }
    .pick-option {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 8px 12px;
      border: 1px solid var(--mtm-border); border-radius: 10px; background: var(--mtm-card-bg); font: inherit; text-align: left; cursor: pointer;
    }
    .pick-option:hover { border-color: var(--mtm-primary); }
    .pick-option.is-selected { border-color: var(--mtm-primary); background: var(--mtm-primary-subtle); }
    .pick-option__main { display: grid; gap: 2px; min-width: 0; }
    .pick-option__main strong { font-size: 0.86rem; }
    .pick-option__main small { color: var(--mtm-text-muted); font-size: 0.76rem; }
    .pick-option__aside { font-size: 0.84rem; font-weight: 700; color: var(--mtm-primary); white-space: nowrap; }
    .w-full { width: 100%; }
  `,
})
export class SalesDossierDialog {
  private readonly dialogRef = inject(MatDialogRef<SalesDossierDialog>);
  private readonly api = inject(VentesApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  readonly data = inject<SalesDossierDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly query = signal('');
  protected readonly selected = signal<TerrainListItem | null>(null);
  private readonly terrains = signal<TerrainListItem[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    prixVente: [null as number | null, [Validators.min(0)]],
    notes: [''],
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.terrains()
      .filter((terrain) => !q || `${terrain.referenceInterne} ${terrain.nom} ${terrain.commune ?? ''} ${terrain.region ?? ''}`.toLowerCase().includes(q))
      .slice(0, 50);
  });

  protected readonly overBudget = computed(() => {
    const prix = Number(this.selected()?.prixPublic ?? 0);
    return !!this.data.budgetMax && prix > this.data.budgetMax;
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
    this.selected.set(terrain);
    if (terrain.prixPublic !== null) this.form.controls.prixVente.setValue(Number(terrain.prixPublic));
  }

  protected location(terrain: TerrainListItem): string {
    return [terrain.commune, terrain.region].filter(Boolean).join(', ') || 'Localisation non renseignée';
  }

  protected submit(): void {
    const terrain = this.selected();
    if (!terrain || this.creating()) return;
    this.creating.set(true);
    const raw = this.form.getRawValue();
    this.api
      .createDossier({
        prospectId: this.data.prospectId,
        terrainId: terrain.id,
        ...(raw.prixVente !== null ? { prixVente: Number(raw.prixVente) } : {}),
        ...(raw.notes.trim() ? { notes: raw.notes.trim() } : {}),
      })
      .subscribe({
        next: (dossier) => this.dialogRef.close(dossier),
        error: (error: unknown) => {
          this.creating.set(false);
          this.notify.error(error, 'Impossible de créer le dossier de vente');
        },
      });
  }
}
