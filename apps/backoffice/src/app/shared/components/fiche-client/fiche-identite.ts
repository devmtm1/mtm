import { Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  LucideFileText,
  LucideIdCard,
  LucideLock,
  LucideMessageCircle,
  LucidePencil,
  LucidePhone,
  LucideTriangleAlert,
  LucideUser,
} from '@lucide/angular';
import {
  completudeFiche,
  validitePiece,
  type DonneesFiche,
} from '../../../core/models/fiche-client';
import { libellePiece } from '../../../core/models/piece-identite';

/** Un bloc d'informations propre à la fiche (origine d'un prospect, dossier d'un propriétaire…), ajouté à la suite. */
export interface ComplementFiche {
  titre: string;
  lignes: { libelle: string; valeur: string | null | undefined }[];
}

/**
 * Onglet « Identité » : la même fiche pour un prospect, un propriétaire ou un locataire. Une carte de complétude, puis
 * une carte par rubrique — état civil, pièce d'identité, coordonnées, personne à prévenir — avec son icône et son
 * crayon de modification, puis les blocs propres à chaque fiche en pleine largeur. Une information absente est écrite
 * « Non renseigné » en gris italique ; seule une pièce expirée ou bientôt expirée prend une couleur.
 */
@Component({
  selector: 'app-fiche-identite',
  imports: [
    DatePipe,
    LucideFileText,
    LucideIdCard,
    LucideLock,
    LucideMessageCircle,
    LucidePencil,
    LucidePhone,
    LucideTriangleAlert,
    LucideUser,
  ],
  template: `
    @if (!identiteReservee()) {
      <section class="carte completude" aria-label="Complétude de la fiche">
        <h2>Fiche complétée à {{ completude().pourcentage }} %</h2>
        <div
          class="completude__barre"
          role="progressbar"
          aria-label="Complétude de la fiche"
          aria-valuemin="0"
          aria-valuemax="100"
          [attr.aria-valuenow]="completude().pourcentage"
        >
          <span [style.width.%]="completude().pourcentage"></span>
        </div>
        <p>
          @if (completude().manquants.length) {
            À demander : {{ completude().manquants.join(', ') }}.
          } @else {
            Toutes les informations sont renseignées.
          }
        </p>
      </section>
    } @else {
      <p class="reservee carte"><svg lucideLock aria-hidden="true"></svg>{{ messageIdentite() }}</p>
    }

    <div class="grille">
      @if (!identiteReservee()) {
        <section class="carte">
          <header>
            <svg lucideUser aria-hidden="true"></svg>
            <h2>État civil</h2>
            @if (modifiable()) {
              <button
                type="button"
                class="crayon"
                aria-label="Modifier l’état civil"
                (click)="modifier.emit()"
              >
                <svg lucidePencil aria-hidden="true"></svg>
              </button>
            }
          </header>
          <dl>
            <div>
              <dt>Prénom</dt>
              <dd [class.vide]="!donnees().prenom">{{ donnees().prenom || 'Non renseigné' }}</dd>
            </div>
            <div>
              <dt>Nom</dt>
              <dd [class.vide]="!donnees().nom">{{ donnees().nom || 'Non renseigné' }}</dd>
            </div>
            <div>
              <dt>Naissance</dt>
              @if (donnees().dateNaissance) {
                <dd>
                  Le {{ donnees().dateNaissance | date: 'dd/MM/yyyy' }}
                  @if (donnees().lieuNaissance) {
                    à {{ donnees().lieuNaissance }}
                  }
                </dd>
              } @else {
                <dd class="vide">Non renseignée</dd>
              }
            </div>
            <div>
              <dt>Nationalité</dt>
              <dd [class.vide]="!donnees().nationalite">
                {{ donnees().nationalite || 'Non renseignée' }}
              </dd>
            </div>
            <div>
              <dt>Profession</dt>
              <dd [class.vide]="!donnees().profession">
                {{ donnees().profession || 'Non renseignée' }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="carte">
          <header>
            <svg lucideIdCard aria-hidden="true"></svg>
            <h2>Pièce d’identité</h2>
            @if (modifiable()) {
              <button
                type="button"
                class="crayon"
                aria-label="Modifier la pièce d’identité"
                (click)="modifier.emit()"
              >
                <svg lucidePencil aria-hidden="true"></svg>
              </button>
            }
          </header>
          <dl>
            <div>
              <dt>Type</dt>
              <dd [class.vide]="!donnees().typePiece">{{ typePiece() || 'Non renseigné' }}</dd>
            </div>
            <div>
              <dt>Numéro</dt>
              <dd [class.vide]="!donnees().numeroPiece">
                {{ donnees().numeroPiece || 'Non renseigné' }}
              </dd>
            </div>
            <div>
              <dt>Valable jusqu’au</dt>
              @if (donnees().pieceValiditeLe) {
                <dd>
                  {{ donnees().pieceValiditeLe | date: 'dd/MM/yyyy' }}
                  @switch (validite().etat) {
                    @case ('expiree') {
                      <span class="pastille pastille--danger">Expirée depuis {{ jours() }} j</span>
                    }
                    @case ('bientot') {
                      <span class="pastille pastille--warning">Expire dans {{ jours() }} j</span>
                    }
                  }
                </dd>
              } @else {
                <dd class="vide">Non renseignée</dd>
              }
            </div>
            @if (avecCopiePdf()) {
              <div>
                <dt>Copie (PDF)</dt>
                @if (donnees().pieceUrl) {
                  <dd>
                    <a [href]="donnees().pieceUrl" target="_blank" rel="noopener">Ouvrir le PDF</a>
                  </dd>
                } @else {
                  <dd class="vide">Aucune copie déposée</dd>
                }
              </div>
            }
          </dl>
        </section>
      }

      <section class="carte">
        <header>
          <svg lucidePhone aria-hidden="true"></svg>
          <h2>Coordonnées</h2>
          @if (modifiable() && !coordonneesReservees()) {
            <button
              type="button"
              class="crayon"
              aria-label="Modifier les coordonnées"
              (click)="modifier.emit()"
            >
              <svg lucidePencil aria-hidden="true"></svg>
            </button>
          }
        </header>
        @if (coordonneesReservees()) {
          <p class="reservee">
            <svg lucideLock aria-hidden="true"></svg>Téléphone et e-mail réservés à
            l’administrateur.
          </p>
        } @else {
          <dl>
            <div>
              <dt>Téléphone</dt>
              @if (donnees().telephone) {
                <dd>
                  <a [href]="'tel:' + donnees().telephone">{{ donnees().telephone }}</a>
                  @if (donnees().whatsapp) {
                    <span class="discret">· WhatsApp</span>
                    <svg class="whatsapp" lucideMessageCircle aria-hidden="true"></svg>
                  }
                </dd>
              } @else {
                <dd class="vide">Non renseigné</dd>
              }
            </div>
            <div>
              <dt>E-mail</dt>
              @if (donnees().email) {
                <dd>
                  <a [href]="'mailto:' + donnees().email">{{ donnees().email }}</a>
                </dd>
              } @else {
                <dd class="vide">Non renseigné</dd>
              }
            </div>
            @if (!identiteReservee()) {
              <div>
                <dt>Adresse</dt>
                <dd [class.vide]="!donnees().adresse">
                  {{ donnees().adresse || 'Non renseignée' }}
                </dd>
              </div>
            }
            <div>
              <dt>Ville, pays</dt>
              <dd [class.vide]="!residence()">{{ residence() || 'Non renseignés' }}</dd>
            </div>
          </dl>
        }
      </section>

      @if (!identiteReservee()) {
        <section class="carte">
          <header>
            <svg lucideTriangleAlert aria-hidden="true"></svg>
            <h2>En cas d’urgence</h2>
            @if (modifiable()) {
              <button
                type="button"
                class="crayon"
                aria-label="Modifier la personne à prévenir"
                (click)="modifier.emit()"
              >
                <svg lucidePencil aria-hidden="true"></svg>
              </button>
            }
          </header>
          <dl>
            <div>
              <dt>Personne à prévenir</dt>
              <dd [class.vide]="!donnees().urgenceNom">
                {{ donnees().urgenceNom || 'Non renseignée' }}
              </dd>
            </div>
            <div>
              <dt>Lien</dt>
              <dd [class.vide]="!donnees().urgenceLien">
                {{ donnees().urgenceLien || 'Non renseigné' }}
              </dd>
            </div>
            <div>
              <dt>Téléphone</dt>
              @if (donnees().urgenceTelephone) {
                <dd>
                  <a [href]="'tel:' + donnees().urgenceTelephone">{{
                    donnees().urgenceTelephone
                  }}</a>
                </dd>
              } @else {
                <dd class="vide">Non renseigné</dd>
              }
            </div>
          </dl>
        </section>
      }
    </div>

    @for (complement of complements(); track complement.titre) {
      <section class="carte">
        <header>
          <svg lucideFileText aria-hidden="true"></svg>
          <h2>{{ complement.titre }}</h2>
          @if (modifiable()) {
            <button type="button" class="modifier" (click)="modifier.emit()">
              <svg lucidePencil aria-hidden="true"></svg>Modifier
            </button>
          }
        </header>
        <dl class="large">
          @for (ligne of complement.lignes; track ligne.libelle) {
            <div>
              <dt>{{ ligne.libelle }}</dt>
              <dd class="texte" [class.vide]="!ligne.valeur">
                {{ ligne.valeur || 'Non renseigné' }}
              </dd>
            </div>
          }
        </dl>
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 16px;
      min-width: 0;
    }
    .carte {
      padding: 20px 24px 22px;
      border: 1px solid var(--mtm-border);
      border-radius: 12px;
      background: var(--mtm-surface, #fff);
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }
    .grille {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: stretch;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--mtm-border);
    }
    header > svg {
      flex: none;
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
    .crayon,
    .modifier {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px;
      border: 0;
      border-radius: 6px;
      background: none;
      color: var(--mtm-primary);
      font: inherit;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .crayon:hover,
    .modifier:hover {
      background: var(--mtm-primary-subtle, #e4edf6);
    }
    .crayon svg,
    .modifier svg {
      width: 16px;
      height: 16px;
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
    dl.large div {
      grid-template-columns: minmax(110px, 220px) minmax(0, 1fr);
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
    a {
      color: var(--mtm-primary);
    }
    .vide {
      font-style: italic;
      color: var(--mtm-text-muted);
    }
    .discret {
      margin-left: 6px;
      color: var(--mtm-text-muted);
    }
    .texte {
      white-space: pre-line;
    }
    .whatsapp {
      width: 16px;
      height: 16px;
      margin-left: 6px;
      color: #1d9b52;
      vertical-align: -3px;
    }
    .pastille {
      margin-left: 10px;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 600;
    }
    .pastille--warning {
      background: #fdeccd;
      color: #7a3a05;
    }
    .pastille--danger {
      background: #fbe4e6;
      color: #8f1d28;
    }
    .completude h2 {
      margin-bottom: 12px;
      font-size: 1.05rem;
    }
    .completude__barre {
      height: 8px;
      border-radius: 999px;
      background: var(--mtm-border);
      overflow: hidden;
    }
    .completude__barre span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--mtm-primary);
    }
    .completude p {
      margin: 10px 0 0;
      font-size: 0.88rem;
      color: var(--mtm-text-muted);
    }
    .reservee {
      margin: 0;
      color: var(--mtm-text-muted);
      font-size: 0.9rem;
    }
    .reservee svg {
      width: 14px;
      height: 14px;
      margin-right: 6px;
      vertical-align: -2px;
    }
    @media (max-width: 900px) {
      .grille {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 560px) {
      dl div {
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
      }
    }
  `,
})
export class FicheIdentite {
  readonly donnees = input.required<DonneesFiche>();
  /** L'utilisateur n'a pas le droit de lire l'identité (état civil, pièce, adresse, urgence). */
  readonly identiteReservee = input(false);
  readonly messageIdentite = input('Identité réservée aux personnes habilitées.');
  /** Téléphone et e-mail réservés (propriétaires, pour qui n'est pas administrateur). */
  readonly coordonneesReservees = input(false);
  readonly modifiable = input(false);
  /** La copie PDF de la pièce se dépose sur la fiche elle-même (propriétaire, locataire). */
  readonly avecCopiePdf = input(false);
  readonly complements = input<ComplementFiche[]>([]);
  readonly modifier = output<void>();

  protected readonly completude = computed(() =>
    completudeFiche(this.donnees(), this.avecCopiePdf()),
  );
  protected readonly validite = computed(() => validitePiece(this.donnees().pieceValiditeLe));
  protected readonly jours = computed(() => {
    const validite = this.validite();
    return validite.etat === 'inconnue' ? 0 : validite.jours;
  });
  protected readonly typePiece = computed(() => libellePiece(this.donnees().typePiece));
  protected readonly residence = computed(() =>
    [this.donnees().ville, this.donnees().pays].filter(Boolean).join(', '),
  );
}
