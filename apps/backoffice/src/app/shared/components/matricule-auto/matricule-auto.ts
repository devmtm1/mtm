import { Component, input } from '@angular/core';
import { LucideLock, LucideSparkles } from '@lucide/angular';

/**
 * Matricule d'un bien ou d'un mandat, attribué par le système : on ne le saisit jamais. À la
 * création, il montre celui que le dossier recevra à l'enregistrement (c'est une prévision :
 * si un collègue crée un dossier entre-temps, le numéro suivant est pris) ; à la modification,
 * le matricule réel, qui ne change plus.
 */
@Component({
  selector: 'app-matricule-auto',
  standalone: true,
  imports: [LucideLock, LucideSparkles],
  template: `
    <div class="matricule" role="group" [attr.aria-label]="libelle()">
      <span class="matricule__label">{{ libelle() }}</span>
      <div class="matricule__corps">
        <span class="matricule__valeur" [class.is-attente]="!valeur()">
          @if (edition()) {
            <svg lucideLock aria-hidden="true"></svg>
          } @else {
            <svg lucideSparkles aria-hidden="true"></svg>
          }
          <code>{{ valeur() || 'Calcul en cours…' }}</code>
        </span>
        <small class="matricule__aide">
          {{ edition() ? 'Attribué à la création : il ne change plus.' : 'Attribué automatiquement à l’enregistrement.' }}
        </small>
      </div>
    </div>
  `,
  styles: `
    .matricule {
      display: grid;
      gap: 6px;
      padding: 10px 14px 12px;
      border: 1px solid var(--mtm-border);
      border-radius: var(--mtm-radius-md);
      background: var(--mtm-bg-surface);
    }
    /* Valeur et explication sur une ligne quand la place le permet, l'une sous l'autre sinon. */
    .matricule__corps {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 16px;
    }
    .matricule__label {
      color: var(--mtm-text-muted);
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .matricule__valeur {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--mtm-text-dark);
    }
    .matricule__valeur svg {
      width: 16px;
      height: 16px;
      color: var(--mtm-primary);
    }
    .matricule__valeur code {
      padding: 0;
      background: transparent;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .matricule__valeur.is-attente code {
      color: var(--mtm-text-muted);
      font-weight: 500;
      letter-spacing: 0;
    }
    .matricule__aide {
      color: var(--mtm-text-muted);
      font-size: 0.8rem;
    }
  `,
})
export class MatriculeAuto {
  readonly libelle = input('Matricule');
  readonly valeur = input<string | null>(null);
  /** `true` : un dossier existant (verrou) ; `false` : un dossier à créer (prévision). */
  readonly edition = input(false);
}
