import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LucideArrowLeft } from '@lucide/angular';

/**
 * En-tête commun des fiches (prospect, propriétaire, locataire) : un titre (« Fiche du prospect »), l'identification
 * de la personne en dessous, « Retour » et les actions à droite. Les actions et les alertes sont fournies par la fiche,
 * qui est seule à savoir ce qu'on peut faire de cette personne.
 */
@Component({
  selector: 'app-fiche-entete',
  imports: [MatButtonModule, LucideArrowLeft],
  template: `
    <header class="entete">
      <div class="entete__titre">
        <h1>{{ titre() }}</h1>
        @if (sousTitre()) {
          <p class="entete__sous-titre">{{ sousTitre() }}</p>
        }
        <ng-content select="[alertes]" />
      </div>
      <div class="entete__actions">
        <button mat-stroked-button type="button" (click)="retour.emit()">
          <svg class="btn-icon" lucideArrowLeft aria-hidden="true"></svg>Retour
        </button>
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .entete {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px 24px;
      padding: 4px 0 8px;
    }
    .entete__titre {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    h1 {
      margin: 0;
      font-family: var(--mtm-font-display);
      font-size: clamp(1.5rem, 1.25rem + 0.7vw, 2rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .entete__sous-titre {
      margin: 0;
      color: var(--mtm-text-muted);
      font-size: 0.95rem;
      overflow-wrap: anywhere;
    }
    .entete__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    @media (max-width: 640px) {
      .entete__actions {
        width: 100%;
      }
    }
  `,
})
export class FicheEntete {
  readonly titre = input.required<string>();
  /** Identification de la personne : « Alassane Sow · P-2026-0010 · Vérification foncière ». */
  readonly sousTitre = input<string | null>(null);
  readonly retour = output<void>();
}
