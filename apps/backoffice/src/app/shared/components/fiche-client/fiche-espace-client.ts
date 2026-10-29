import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { LucideKeyRound } from '@lucide/angular';
import type { CompteEspaceClient } from '../../../core/models/fiche-client';

/**
 * Onglet « Espace client » : le client peut-il déjà se connecter, depuis quand, et que verra-t-il ? C'est ici qu'on
 * lui ouvre ses identifiants. L'accès s'envoie par e-mail : sans adresse, on propose de la renseigner d'abord.
 * Même présentation que les cartes de l'identité.
 */
@Component({
  selector: 'app-fiche-espace-client',
  imports: [DatePipe, MatButtonModule, LucideKeyRound],
  template: `
    <section class="carte" aria-label="Espace client">
      <header>
        <svg lucideKeyRound aria-hidden="true"></svg>
        <h2>Espace client</h2>
        <span class="etat" [class.etat--actif]="!!compte()">{{
          compte() ? 'Accès ouvert' : 'Pas encore d’accès'
        }}</span>
      </header>
      @if (compte(); as c) {
        <dl>
          <div>
            <dt>Ouvert le</dt>
            <dd>{{ c.createdAt | date: 'dd/MM/yyyy' }}</dd>
          </div>
          <div>
            <dt>Dernière connexion</dt>
            <dd [class.vide]="!c.lastLoginAt">
              {{ c.lastLoginAt ? (c.lastLoginAt | date: 'dd/MM/yyyy à HH:mm') : 'Jamais connecté' }}
            </dd>
          </div>
          <div>
            <dt>Adresse de connexion</dt>
            <dd>{{ email() }}</dd>
          </div>
        </dl>
        <p class="texte">Le client voit {{ description() }}.</p>
      } @else {
        <p class="texte">
          Une fois l’accès ouvert, le client pourra se connecter pour voir {{ description() }}.
          L’invitation et un mot de passe provisoire lui sont envoyés par e-mail.
        </p>
        @if (peutOuvrir()) {
          @if (email()) {
            <div class="action">
              <button mat-flat-button color="primary" type="button" (click)="ouvrir.emit()">
                Ouvrir l’espace client
              </button>
              <span class="aide">L’invitation part à {{ email() }}</span>
            </div>
          } @else if (peutModifier()) {
            <p class="alerte">
              Pas d’adresse e-mail sur cette fiche : l’accès s’envoie par e-mail.
            </p>
            <div class="action">
              <button mat-stroked-button type="button" (click)="ajouterEmail.emit()">
                Ajouter son e-mail
              </button>
            </div>
          } @else {
            <p class="alerte">
              Pas d’adresse e-mail sur cette fiche : l’accès ne peut pas encore être ouvert.
            </p>
          }
        } @else {
          <p class="aide">Seules les personnes habilitées peuvent ouvrir un accès.</p>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .carte {
      display: grid;
      gap: 14px;
      max-width: 720px;
      padding: 20px 24px 24px;
      border: 1px solid var(--mtm-border);
      border-radius: 12px;
      background: var(--mtm-surface, #fff);
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--mtm-border);
    }
    header svg {
      width: 22px;
      height: 22px;
      color: var(--mtm-primary);
    }
    h2 {
      flex: 1;
      margin: 0;
      font-family: inherit;
      font-size: 1.02rem;
      font-weight: 600;
    }
    .etat {
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--mtm-surface-muted, #eef0f3);
      color: var(--mtm-text-muted);
      font-size: 0.78rem;
      font-weight: 600;
    }
    .etat--actif {
      background: #dcf3e5;
      color: #14653a;
    }
    dl {
      display: grid;
      gap: 12px;
      margin: 0;
    }
    dl div {
      display: grid;
      grid-template-columns: minmax(110px, 38%) minmax(0, 1fr);
      gap: 12px;
      align-items: baseline;
    }
    dt {
      font-size: 0.74rem;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--mtm-text-muted);
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .vide {
      font-style: italic;
      color: var(--mtm-text-muted);
    }
    .texte,
    .aide,
    .alerte {
      margin: 0;
    }
    .texte,
    .aide {
      color: var(--mtm-text-muted);
    }
    .alerte {
      color: var(--mtm-warning, #a34a07);
    }
    .aide {
      font-size: 0.86rem;
    }
    .action {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
    }
    @media (max-width: 560px) {
      dl div {
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
      }
    }
  `,
})
export class FicheEspaceClient {
  readonly compte = input<CompteEspaceClient | null | undefined>(null);
  readonly email = input<string | null | undefined>(null);
  readonly peutOuvrir = input(false);
  readonly peutModifier = input(false);
  /** Ce que le client verra, à la suite de « Le client voit » : « ses dossiers, ses paiements et ses documents ». */
  readonly description = input('ses dossiers, ses paiements et ses documents');
  readonly ouvrir = output<void>();
  readonly ajouterEmail = output<void>();
}
