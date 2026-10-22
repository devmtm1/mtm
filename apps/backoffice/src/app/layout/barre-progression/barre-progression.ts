import { Component, inject } from '@angular/core';
import { ActiviteReseau } from '../../core/services/activite-reseau.service';

/**
 * Fine barre de progression en haut de l'écran : elle apparaît quand un changement d'écran ou un
 * chargement dure plus d'un instant, et disparaît dès que c'est fini. Sans elle, un clic ne montre
 * rien pendant l'attente.
 */
@Component({
  selector: 'app-barre-progression',
  standalone: true,
  template: `<div class="barre" [class.is-visible]="activite.visible()" role="presentation" aria-hidden="true"></div>`,
  styles: `
    .barre {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 2000;
      height: 3px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .barre.is-visible {
      opacity: 1;
    }
    .barre::after {
      content: '';
      position: absolute;
      inset: 0;
      width: 40%;
      background: linear-gradient(90deg, transparent, var(--mtm-primary), var(--mtm-accent), transparent);
      animation: avance 1.1s ease-in-out infinite;
    }
    @keyframes avance {
      from {
        transform: translateX(-100%);
      }
      to {
        transform: translateX(260%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .barre::after {
        width: 100%;
        background: var(--mtm-primary);
        animation: none;
      }
    }
  `,
})
export class BarreProgression {
  protected readonly activite = inject(ActiviteReseau);
}
