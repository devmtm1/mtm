import { Component, effect, inject, input, model } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideBanknote,
  LucideCalendarDays,
  LucideCircleCheck,
  LucideClipboardList,
  LucideClock,
  LucideFileText,
  LucideFolderOpen,
  LucideHistory,
  LucideImage,
  LucideKeyRound,
  LucideLandPlot,
  LucideScrollText,
  LucideTriangleAlert,
  LucideUser,
} from '@lucide/angular';

/** Icône d'un onglet : un nom court, pour que les fiches n'aient pas à importer chaque icône. */
export type IconeOnglet =
  | 'identite'
  | 'dossiers'
  | 'documents'
  | 'espace'
  | 'suivi'
  | 'baux'
  | 'paiements'
  | 'biens'
  | 'conditions'
  | 'photos'
  | 'etapes'
  | 'agenda'
  | 'alerte'
  | 'horloge';

export interface OngletFiche {
  id: string;
  libelle: string;
  icone?: IconeOnglet;
  /** Nombre affiché dans une pastille à côté du libellé (dossiers, documents…) ; rien si vide ou nul. */
  pastille?: string | number | null;
  /** Le nombre demande de l'attention (actions en retard) : la pastille prend la couleur d'alerte. */
  alerte?: boolean;
}

/**
 * Onglets d'une fiche (identité, dossiers, documents, espace client, suivi) : une icône, le libellé, une pastille de
 * compte, un trait sous l'onglet ouvert. L'onglet ouvert se retient dans l'adresse (`?onglet=documents`) : on peut
 * renvoyer quelqu'un directement sur « Espace client » et le rechargement ne ramène pas au premier onglet. Le contenu de
 * chaque onglet est affiché par la fiche, selon `actif`.
 */
@Component({
  selector: 'app-fiche-onglets',
  imports: [
    LucideBanknote,
    LucideCalendarDays,
    LucideCircleCheck,
    LucideClipboardList,
    LucideClock,
    LucideFileText,
    LucideFolderOpen,
    LucideHistory,
    LucideImage,
    LucideKeyRound,
    LucideLandPlot,
    LucideScrollText,
    LucideTriangleAlert,
    LucideUser,
  ],
  template: `
    <!-- Les touches fléchées montent des onglets (focusables) jusqu'à la liste : elle n'a pas à l'être. -->
    <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
    <div
      class="onglets"
      role="tablist"
      aria-label="Sections de la fiche"
      (keydown)="clavier($event)"
    >
      @for (onglet of onglets(); track onglet.id) {
        <button
          type="button"
          role="tab"
          class="onglet"
          [class.onglet--actif]="onglet.id === actif()"
          [attr.id]="'onglet-' + onglet.id"
          [attr.aria-selected]="onglet.id === actif()"
          [attr.tabindex]="onglet.id === actif() ? 0 : -1"
          (click)="choisir(onglet.id)"
        >
          @switch (onglet.icone) {
            @case ('identite') {
              <svg lucideUser aria-hidden="true"></svg>
            }
            @case ('dossiers') {
              <svg lucideFolderOpen aria-hidden="true"></svg>
            }
            @case ('documents') {
              <svg lucideFileText aria-hidden="true"></svg>
            }
            @case ('espace') {
              <svg lucideKeyRound aria-hidden="true"></svg>
            }
            @case ('suivi') {
              <svg lucideHistory aria-hidden="true"></svg>
            }
            @case ('baux') {
              <svg lucideScrollText aria-hidden="true"></svg>
            }
            @case ('paiements') {
              <svg lucideBanknote aria-hidden="true"></svg>
            }
            @case ('biens') {
              <svg lucideLandPlot aria-hidden="true"></svg>
            }
            @case ('conditions') {
              <svg lucideClipboardList aria-hidden="true"></svg>
            }
            @case ('photos') {
              <svg lucideImage aria-hidden="true"></svg>
            }
            @case ('etapes') {
              <svg lucideCircleCheck aria-hidden="true"></svg>
            }
            @case ('agenda') {
              <svg lucideCalendarDays aria-hidden="true"></svg>
            }
            @case ('alerte') {
              <svg lucideTriangleAlert aria-hidden="true"></svg>
            }
            @case ('horloge') {
              <svg lucideClock aria-hidden="true"></svg>
            }
          }
          {{ onglet.libelle }}
          @if (affiche(onglet)) {
            <span class="onglet__compte" [class.onglet__compte--alerte]="onglet.alerte">{{
              onglet.pastille
            }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .onglets {
      display: flex;
      gap: 32px;
      overflow-x: auto;
      overflow-y: hidden;
      border-bottom: 1px solid var(--mtm-border);
      scrollbar-width: thin;
    }
    .onglet {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      margin-bottom: -1px;
      padding: 14px 4px;
      border: 0;
      border-bottom: 2px solid transparent;
      background: none;
      color: var(--mtm-text-muted);
      font: inherit;
      font-size: 0.95rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
    }
    .onglet svg {
      width: 18px;
      height: 18px;
    }
    .onglet:hover {
      color: var(--mtm-primary);
    }
    .onglet--actif {
      border-bottom-color: var(--mtm-primary);
      color: var(--mtm-primary);
      font-weight: 600;
    }
    .onglet:focus-visible {
      outline: 2px solid var(--mtm-primary);
      outline-offset: 2px;
    }
    .onglet__compte {
      min-width: 20px;
      padding: 0 7px;
      border-radius: 999px;
      background: var(--mtm-primary-subtle, #e4edf6);
      color: var(--mtm-primary);
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 20px;
      text-align: center;
    }
    .onglet__compte--alerte {
      background: #fbe4e6;
      color: #8f1d28;
    }
  `,
})
export class FicheOnglets {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly onglets = input.required<OngletFiche[]>();
  /** Identifiant de l'onglet ouvert, lié à la fiche (`[(actif)]`). */
  readonly actif = model.required<string>();

  /** Onglet demandé par l'adresse. Certains onglets n'existent qu'une fois la fiche chargée (le bail, par exemple) : on l'ouvre dès qu'il paraît. */
  private demande = this.route.snapshot.queryParamMap.get('onglet');

  constructor() {
    effect(() => {
      const present = this.onglets().some((onglet) => onglet.id === this.demande);
      if (!this.demande || !present) return;
      this.actif.set(this.demande);
      this.demande = null;
    });
  }

  protected affiche(onglet: OngletFiche): boolean {
    return (
      onglet.pastille !== null &&
      onglet.pastille !== undefined &&
      onglet.pastille !== '' &&
      onglet.pastille !== 0
    );
  }

  protected choisir(id: string): void {
    this.demande = null;
    this.actif.set(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Flèches, Début et Fin : la navigation au clavier d'une liste d'onglets. */
  protected clavier(evenement: KeyboardEvent): void {
    const ids = this.onglets().map((onglet) => onglet.id);
    const courant = ids.indexOf(this.actif());
    const cible =
      evenement.key === 'ArrowRight'
        ? (courant + 1) % ids.length
        : evenement.key === 'ArrowLeft'
          ? (courant - 1 + ids.length) % ids.length
          : evenement.key === 'Home'
            ? 0
            : evenement.key === 'End'
              ? ids.length - 1
              : -1;
    if (cible < 0) return;
    evenement.preventDefault();
    this.choisir(ids[cible]);
    queueMicrotask(() => document.getElementById('onglet-' + ids[cible])?.focus());
  }
}
