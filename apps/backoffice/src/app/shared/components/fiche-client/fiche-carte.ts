import { Component, input } from '@angular/core';
import { LucideClipboardCheck, LucideHardHat, LucideReceipt, LucideRoute } from '@lucide/angular';

export type IconeCarte = 'mission' | 'chantier' | 'dossier' | 'parcours';

/**
 * Carte d'une fiche, au même gabarit que celles de l'identité : une icône et un titre (avec, dessous, une ligne
 * d'explication), les actions à droite de l'en-tête, un filet, puis le contenu. Les actions se passent dans un élément
 * marqué `actions`, le reste est le contenu de la carte.
 */
@Component({
  selector: 'app-fiche-carte',
  imports: [LucideClipboardCheck, LucideHardHat, LucideReceipt, LucideRoute],
  template: `
    <section class="carte">
      <header>
        @switch (icone()) {
          @case ('mission') {
            <svg lucideClipboardCheck aria-hidden="true"></svg>
          }
          @case ('chantier') {
            <svg lucideHardHat aria-hidden="true"></svg>
          }
          @case ('dossier') {
            <svg lucideReceipt aria-hidden="true"></svg>
          }
          @case ('parcours') {
            <svg lucideRoute aria-hidden="true"></svg>
          }
        }
        <div class="titre">
          <h2>{{ titre() }}</h2>
          @if (description()) {
            <p>{{ description() }}</p>
          }
        </div>
        <div class="actions"><ng-content select="[actions]" /></div>
      </header>
      <div class="contenu"><ng-content /></div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .carte {
      padding: 20px 24px 22px;
      border: 1px solid var(--mtm-border);
      border-radius: 12px;
      background: var(--mtm-surface, #fff);
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 16px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--mtm-border);
    }
    header > svg {
      flex: none;
      width: 22px;
      height: 22px;
      color: var(--mtm-primary);
    }
    .titre {
      flex: 1 1 240px;
      min-width: 0;
    }
    h2 {
      margin: 0;
      font-family: inherit;
      font-size: 1.02rem;
      font-weight: 600;
    }
    .titre p {
      margin: 2px 0 0;
      color: var(--mtm-text-muted);
      font-size: 0.86rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .actions:empty {
      display: none;
    }
    .contenu {
      min-width: 0;
    }
  `,
})
export class FicheCarte {
  readonly titre = input.required<string>();
  readonly icone = input<IconeCarte>('dossier');
  /** Une ligne d'explication sous le titre. */
  readonly description = input<string | null>(null);
}
