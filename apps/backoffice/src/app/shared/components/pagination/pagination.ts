import { Component, computed, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { fenetrePages, plageAffichee } from '../../../core/utils/pagination';

/** Tailles de page proposées par défaut. */
export const TAILLES_PAGE: readonly number[] = [10, 25, 50, 100];

/**
 * La barre de pagination de toutes les listes : « 26–50 sur 132 relances », le choix du nombre de lignes par page et les
 * numéros de page (avec « … » pour les pages sautées). La liste garde son état (page, taille) et lui dit où elle en est ;
 * la barre dit à la liste ce que la personne a demandé.
 *
 *   <app-pagination
 *     [page]="page()" [pageSize]="pageSize()" [total]="total()" nom="relance"
 *     (pageChange)="aller($event)" (pageSizeChange)="changerTaille($event)" />
 *
 * Dans une carte qui a déjà son propre retrait, `--pagination-gutter: 0` supprime le retrait de la barre.
 *
 * La barre n'apparaît pas quand la liste est vide. Les numéros n'apparaissent qu'à partir de deux pages, et le choix de
 * la taille seulement quand la liste dépasse la plus petite taille proposée.
 */
@Component({
  selector: 'app-pagination',
  imports: [MatFormFieldModule, MatSelectModule, LucideChevronLeft, LucideChevronRight],
  template: `
    @if (total() > 0) {
      <nav class="pagination" [attr.aria-label]="'Pagination : ' + pluriel()">
        <p class="pagination__etat">
          {{ plage().debut }}–{{ plage().fin }} sur {{ total() }} {{ total() > 1 ? pluriel() : nom() }}
        </p>
        @if (tailles().length && total() > tailles()[0]) {
          <div class="pagination__taille">
            <span id="pagination-taille-libelle">Lignes par page</span>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-select
                aria-labelledby="pagination-taille-libelle"
                [value]="pageSize()"
                (valueChange)="pageSizeChange.emit($event)"
              >
                @for (taille of tailles(); track taille) {
                  <mat-option [value]="taille">{{ taille }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }
        @if (pages() > 1) {
          <div class="pagination__pages">
            <button
              type="button"
              class="pagination__bouton"
              [disabled]="pageCourante() === 1"
              (click)="pageChange.emit(pageCourante() - 1)"
              aria-label="Page précédente"
            >
              <svg lucideChevronLeft aria-hidden="true"></svg>
            </button>
            @for (numero of numeros(); track $index) {
              @if (numero === '…') {
                <span class="pagination__points" aria-hidden="true">…</span>
              } @else {
                <button
                  type="button"
                  class="pagination__bouton"
                  [class.pagination__bouton--courante]="numero === pageCourante()"
                  [attr.aria-current]="numero === pageCourante() ? 'page' : null"
                  [attr.aria-label]="'Page ' + numero"
                  (click)="pageChange.emit(numero)"
                >
                  {{ numero }}
                </button>
              }
            }
            <button
              type="button"
              class="pagination__bouton"
              [disabled]="pageCourante() === pages()"
              (click)="pageChange.emit(pageCourante() + 1)"
              aria-label="Page suivante"
            >
              <svg lucideChevronRight aria-hidden="true"></svg>
            </button>
          </div>
        }
      </nav>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px 24px;
      padding: 14px var(--pagination-gutter, 20px);
      border-top: 1px solid var(--mtm-border);
    }
    .pagination__etat {
      margin: 0;
      color: var(--mtm-text-muted);
      font-size: 0.86rem;
    }
    .pagination__taille {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--mtm-text-muted);
      font-size: 0.86rem;
    }
    .pagination__taille .mat-mdc-form-field {
      width: 84px;
      --mat-form-field-container-height: 38px;
      --mat-form-field-container-vertical-padding: 7px;
    }
    .pagination__pages {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .pagination__bouton {
      display: inline-grid;
      place-items: center;
      min-width: 36px;
      height: 36px;
      padding: 0 8px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: none;
      color: var(--mtm-text-dark, inherit);
      font: inherit;
      font-size: 0.88rem;
      cursor: pointer;
    }
    .pagination__bouton svg {
      width: 18px;
      height: 18px;
    }
    .pagination__bouton:hover:not(:disabled):not(.pagination__bouton--courante) {
      background: var(--mtm-bg-hover);
    }
    .pagination__bouton:focus-visible {
      outline: 2px solid var(--mtm-primary);
      outline-offset: 1px;
    }
    .pagination__bouton:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .pagination__bouton--courante {
      border-color: var(--mtm-primary);
      background: var(--mtm-primary-subtle);
      color: var(--mtm-primary);
      font-weight: 600;
    }
    .pagination__points {
      min-width: 24px;
      text-align: center;
      color: var(--mtm-text-muted);
    }
    @media (max-width: 720px) {
      .pagination {
        justify-content: center;
      }
      .pagination__etat {
        width: 100%;
        text-align: center;
      }
    }
  `,
})
export class Pagination {
  /** Page affichée, à partir de 1. */
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  /** Nombre total d'éléments de la liste, toutes pages confondues. */
  readonly total = input.required<number>();
  /** Ce que la liste contient, au singulier (« relance »). */
  readonly nom = input('élément');
  /** Le même au pluriel, quand il ne suffit pas d'ajouter un « s » (« personnes » : oui ; « travaux » : à donner). */
  readonly nomPluriel = input<string | null>(null);
  /** Tailles proposées ; une liste vide masque le choix. */
  readonly tailles = input<readonly number[]>(TAILLES_PAGE);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly pluriel = computed(() => this.nomPluriel() ?? `${this.nom()}s`);
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / Math.max(1, this.pageSize()))));
  /** La page demandée, ramenée dans les bornes : une liste qui rétrécit ne laisse pas une page fantôme. */
  protected readonly pageCourante = computed(() => Math.min(Math.max(1, this.page()), this.pages()));
  protected readonly plage = computed(() => plageAffichee(this.pageCourante(), this.pageSize(), this.total()));
  protected readonly numeros = computed(() => fenetrePages(this.pageCourante(), this.pages()));
}
