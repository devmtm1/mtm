import { Component, input, output } from '@angular/core';

export type Vue = 'tableau' | 'cartes';

/** Dernière vue choisie sur une liste : une commodité par poste, l'écran marche sans. */
export function lireVue(cle: string, defaut: Vue = 'tableau'): Vue {
  try {
    const valeur = localStorage.getItem(`vue:${cle}`);
    return valeur === 'cartes' || valeur === 'tableau' ? valeur : defaut;
  } catch {
    return defaut;
  }
}

export function ecrireVue(cle: string, vue: Vue): void {
  try {
    localStorage.setItem(`vue:${cle}`, vue);
  } catch {
    /* stockage indisponible : le choix vaut pour la session */
  }
}

/** Bascule entre la vue tableau et la vue cartes d'une liste. */
@Component({
  selector: 'app-vue-toggle',
  template: `
    <div class="bascule" role="group" aria-label="Mode d’affichage">
      <button type="button" [class.is-actif]="valeur() === 'tableau'" [attr.aria-pressed]="valeur() === 'tableau'" (click)="choisir.emit('tableau')">
        Tableau
      </button>
      <button type="button" [class.is-actif]="valeur() === 'cartes'" [attr.aria-pressed]="valeur() === 'cartes'" (click)="choisir.emit('cartes')">
        Cartes
      </button>
    </div>
  `,
  styles: `
    .bascule {
      display: inline-flex;
      padding: 3px;
      border: 1px solid var(--mtm-border);
      border-radius: 10px;
      background: var(--mtm-bg-hover);
    }
    button {
      padding: 6px 14px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--mtm-text-muted);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
    }
    button.is-actif {
      background: var(--mtm-surface);
      color: var(--mtm-text-dark);
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
    }
  `,
})
export class VueToggle {
  readonly valeur = input.required<Vue>();
  readonly choisir = output<Vue>();
}
