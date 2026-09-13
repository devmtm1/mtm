import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { MandatDetail, MandatOptions } from '../../../core/models/mandat.model';
import type { TerrainListItem } from '../../../core/models/terrain.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { LOT_STATUS, lotLabel, pillClass, statusHelp } from '../mandat-status';

export interface MandatLotDialogData {
  mandat: MandatDetail;
  options: MandatOptions | null;
}

/**
 * Rattacher un terrain au mandat. Le terrain est choisi dans le
 * portefeuille (recherche par référence, nom ou commune) ; les terrains déjà
 * rattachés sont exclus, et ceux d'un autre propriétaire sont signalés.
 */
@Component({
  selector: 'app-mandat-lot-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Rattacher un terrain</h2>
    <mat-dialog-content class="lot-dialog">
      <p class="lot-dialog__intro">
        Un « lot » est un terrain que le propriétaire confie à MTM dans le cadre de ce mandat. Il compte
        ensuite dans le suivi commercial (disponible, réservé, vendu).
      </p>
      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
        <mat-label>Rechercher un terrain</mat-label>
        <input matInput [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Référence, nom, commune…" autocomplete="off" />
      </mat-form-field>
      @if (loading()) {
        <div class="skeleton" style="height: 48px"></div>
        <div class="skeleton" style="height: 48px"></div>
      } @else if (filtered().length === 0) {
        <p class="lot-dialog__empty">Aucun terrain disponible ne correspond. Créez d’abord la fiche terrain.</p>
      } @else {
        <ul class="lot-dialog__list" role="listbox" aria-label="Terrains">
          @for (terrain of filtered(); track terrain.id) {
            <li>
              <button type="button" class="lot-option" [class.is-selected]="form.controls.terrainId.value === terrain.id" (click)="form.controls.terrainId.setValue(terrain.id)" role="option" [attr.aria-selected]="form.controls.terrainId.value === terrain.id">
                <span class="lot-option__main">
                  <strong>{{ terrain.referenceInterne }} — {{ terrain.nom }}</strong>
                  <small>{{ location(terrain) }} · {{ terrain.superficie ? terrain.superficie + ' m²' : 'superficie ?' }} · {{ terrain.prixPublic | mtmMoney }}</small>
                </span>
                @if (isOtherOwner(terrain)) {
                  <span class="status-pill status-pill--warning" title="Ce terrain est enregistré avec un autre propriétaire">Autre propriétaire</span>
                }
              </button>
            </li>
          }
        </ul>
      }
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Avancement du lot</mat-label>
          <mat-select formControlName="statutLot">
            @for (statut of lotStatuses(); track statut) {
              <mat-option [value]="statut">{{ label(statut) }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ help(form.controls.statutLot.value) }}</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">Rattacher</button>
    </mat-dialog-actions>
  `,
  styles: `
    .lot-dialog { display: grid; gap: 12px; min-width: min(500px, calc(100vw - 96px)); }
    .lot-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .lot-dialog__empty { margin: 0; padding: 16px; border-radius: 10px; background: var(--mtm-bg-surface); color: var(--mtm-text-muted); font-size: 0.86rem; text-align: center; }
    .lot-dialog__list { display: grid; gap: 6px; max-height: 260px; margin: 0; padding: 2px; overflow-y: auto; list-style: none; }
    .lot-option {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 8px 12px;
      border: 1px solid var(--mtm-border); border-radius: 10px; background: var(--mtm-card-bg); font: inherit; text-align: left; cursor: pointer;
    }
    .lot-option:hover { border-color: var(--mtm-primary); }
    .lot-option.is-selected { border-color: var(--mtm-primary); background: var(--mtm-primary-subtle); }
    .lot-option__main { display: grid; gap: 2px; min-width: 0; }
    .lot-option__main strong { font-size: 0.86rem; }
    .lot-option__main small { color: var(--mtm-text-muted); font-size: 0.76rem; }
    .w-full { width: 100%; }
  `,
})
export class MandatLotDialog {
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly dialogRef = inject(MatDialogRef<MandatLotDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<MandatLotDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly query = signal('');
  private readonly terrains = signal<TerrainListItem[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    terrainId: ['', Validators.required],
    statutLot: ['Confie'],
  });

  protected readonly lotStatuses = computed(() => this.data.options?.statutLot ?? Object.keys(LOT_STATUS));

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const attached = new Set(this.data.mandat.lots.map((lot) => lot.terrain.id));
    return this.terrains()
      .filter((terrain) => !attached.has(terrain.id))
      .filter((terrain) => !q || `${terrain.referenceInterne} ${terrain.nom} ${terrain.commune ?? ''} ${terrain.region ?? ''}`.toLowerCase().includes(q))
      .slice(0, 50);
  });

  constructor() {
    this.terrainsApi.findAll({ pageSize: 200 }).subscribe({
      next: (page) => {
        this.terrains.set(page.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected location(terrain: TerrainListItem): string {
    return [terrain.commune, terrain.region].filter(Boolean).join(', ') || 'Localisation non renseignée';
  }

  protected isOtherOwner(terrain: TerrainListItem & { proprietaire?: { id: string } | null }): boolean {
    return !!terrain.proprietaire && terrain.proprietaire.id !== this.data.mandat.proprietaire.id;
  }

  protected label(statut: string): string {
    return lotLabel(statut);
  }

  protected help(statut: string): string {
    return statusHelp(LOT_STATUS, statut);
  }

  protected pill(statut: string): string {
    return pillClass(LOT_STATUS, statut);
  }

  protected submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
