import { Component, input, output } from '@angular/core';
import { LucideMail, LucidePhone } from '@lucide/angular';

/** Une personne (prospect, propriétaire…) présentée en carte. */
export interface ContactCard {
  id: string;
  titre: string;
  /** Sous le nom : référence, rôle… */
  sousTitre?: string | null;
  telephone?: string | null;
  email?: string | null;
  /** Pastilles de statut : `classe` est une classe `status-pill` existante. */
  pastilles?: { label: string; classe: string; aide?: string }[];
  /** Ligne libre en bas de carte (prochaine action, commercial…). */
  pied?: string | null;
}

/** Paires fond / texte, pour que deux personnes voisines ne partagent pas la même couleur d'avatar. */
const AVATARS = [
  ['#E3F1E8', '#1F6B3F'],
  ['#E4ECF8', '#2A4F8F'],
  ['#FBEFD9', '#8A5A12'],
  ['#F6E3EA', '#8F2D52'],
  ['#E8E5F7', '#4B3E99'],
  ['#E0F1F3', '#1D6A73'],
];

function initiales(titre: string): string {
  const mots = titre.trim().split(/\s+/).filter(Boolean);
  const lettres = (mots.length > 1 ? [mots[0], mots[mots.length - 1]] : mots).map((m) => m[0]);
  return lettres.join('').toUpperCase().slice(0, 2) || '?';
}

function couleurs(id: string): string[] {
  let somme = 0;
  for (const c of id) somme = (somme + c.charCodeAt(0)) % 9973;
  return AVATARS[somme % AVATARS.length];
}

/**
 * Liste de personnes en cartes : avatar à initiales, nom, téléphone, e-mail
 * et pastilles de statut. Toute la carte est un bouton qui ouvre la fiche.
 */
@Component({
  selector: 'app-contact-cards',
  imports: [LucideMail, LucidePhone],
  template: `
    <ul class="cartes" [class.cartes--chargement]="chargement()">
      @for (carte of cartes(); track carte.id) {
        <li>
          <button type="button" class="carte" (click)="ouvrir.emit(carte.id)" [attr.aria-label]="'Ouvrir la fiche de ' + carte.titre">
            <span class="carte__tete">
              <span class="avatar" [style.background]="couleur(carte.id)[0]" [style.color]="couleur(carte.id)[1]" aria-hidden="true">
                {{ initiales(carte.titre) }}
              </span>
              <span class="carte__identite">
                <strong>{{ carte.titre }}</strong>
                @if (carte.sousTitre) {
                  <small>{{ carte.sousTitre }}</small>
                }
              </span>
            </span>
            <span class="carte__contact">
              <span [class.carte__absent]="!carte.telephone">
                <svg lucidePhone aria-hidden="true"></svg>{{ carte.telephone || 'Pas de téléphone' }}
              </span>
              <span [class.carte__absent]="!carte.email">
                <svg lucideMail aria-hidden="true"></svg>{{ carte.email || 'Pas d’e-mail' }}
              </span>
            </span>
            @if (carte.pastilles?.length) {
              <span class="carte__pastilles">
                @for (p of carte.pastilles; track p.label) {
                  <span [class]="p.classe" [attr.title]="p.aide ?? null">{{ p.label }}</span>
                }
              </span>
            }
            @if (carte.pied) {
              <small class="carte__pied">{{ carte.pied }}</small>
            }
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    .cartes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .cartes--chargement {
      opacity: 0.6;
    }
    .carte {
      display: grid;
      gap: 12px;
      width: 100%;
      height: 100%;
      align-content: start;
      padding: 16px;
      border: 1px solid var(--mtm-border);
      border-radius: 14px;
      background: var(--mtm-surface);
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition:
        box-shadow 0.15s ease,
        transform 0.15s ease,
        border-color 0.15s ease;
    }
    .carte:hover,
    .carte:focus-visible {
      border-color: var(--mtm-primary);
      box-shadow: 0 6px 18px rgba(16, 24, 40, 0.1);
      transform: translateY(-1px);
    }
    .carte__tete {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .avatar {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .carte__identite {
      display: grid;
      min-width: 0;
    }
    .carte__identite strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.95rem;
    }
    .carte__identite small,
    .carte__pied {
      color: var(--mtm-text-muted);
      font-size: 0.78rem;
    }
    .carte__contact {
      display: grid;
      gap: 6px;
      padding-top: 10px;
      border-top: 1px solid var(--mtm-border);
      font-size: 0.85rem;
    }
    .carte__contact > span {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .carte__contact svg {
      flex: none;
      width: 15px;
      height: 15px;
      color: var(--mtm-text-muted);
    }
    .carte__absent {
      color: var(--mtm-text-muted);
      font-style: italic;
    }
    .carte__pastilles {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    @media (max-width: 640px) {
      .cartes {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ContactCards {
  readonly cartes = input.required<ContactCard[]>();
  readonly chargement = input(false);
  readonly ouvrir = output<string>();

  protected initiales = initiales;
  protected couleur = couleurs;
}
