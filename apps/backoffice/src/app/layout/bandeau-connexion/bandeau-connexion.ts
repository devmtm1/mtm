import { Component, DestroyRef, inject, signal } from '@angular/core';
import { LucideCircleCheck, LucideWifiOff } from '@lucide/angular';

/** Durée d'affichage du message « connexion rétablie ». */
export const DUREE_RETABLIE_MS = 3000;

/**
 * Prévient quand la connexion est perdue (les enregistrements échoueraient) et quand elle revient.
 * Sans ce message, un clic sans effet laisse croire à un bogue.
 */
@Component({
  selector: 'app-bandeau-connexion',
  standalone: true,
  imports: [LucideWifiOff, LucideCircleCheck],
  template: `
    @if (etat() !== 'normal') {
      <div class="bandeau" [class.is-ok]="etat() === 'retablie'" role="status" aria-live="polite">
        @if (etat() === 'perdue') {
          <svg lucideWifiOff aria-hidden="true"></svg>
          <span><strong>Connexion perdue.</strong> Vos modifications ne seront pas enregistrées tant qu’elle n’est pas rétablie.</span>
        } @else {
          <svg lucideCircleCheck aria-hidden="true"></svg>
          <span><strong>Connexion rétablie.</strong></span>
        }
      </div>
    }
  `,
  styles: `
    .bandeau {
      position: fixed;
      top: 12px;
      left: 50%;
      z-index: 1999;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: calc(100vw - 32px);
      padding: 10px 16px;
      transform: translateX(-50%);
      border: 1px solid var(--mtm-warning);
      border-radius: 12px;
      background: var(--mtm-warning-bg, #fdf0d9);
      color: var(--mtm-text-dark);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      font-size: 0.88rem;
    }
    .bandeau.is-ok {
      border-color: var(--mtm-success);
      background: var(--mtm-success-bg, #ecfdf5);
    }
    .bandeau svg {
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
    }
  `,
})
export class BandeauConnexion {
  protected readonly etat = signal<'normal' | 'perdue' | 'retablie'>(typeof navigator !== 'undefined' && navigator.onLine === false ? 'perdue' : 'normal');
  private minuteur: number | undefined;

  constructor() {
    const perdue = () => {
      window.clearTimeout(this.minuteur);
      this.etat.set('perdue');
    };
    const retablie = () => {
      if (this.etat() !== 'perdue') return;
      this.etat.set('retablie');
      this.minuteur = window.setTimeout(() => this.etat.set('normal'), DUREE_RETABLIE_MS);
    };
    window.addEventListener('offline', perdue);
    window.addEventListener('online', retablie);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('offline', perdue);
      window.removeEventListener('online', retablie);
      window.clearTimeout(this.minuteur);
    });
  }
}
