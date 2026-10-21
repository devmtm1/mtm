import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import {
  type RapportQuotidien,
  type RapportQuotidienResume,
  TresorerieApiService,
} from '../../core/services/api/tresorerie-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from './finances-utils';
import { aujourdhuiIso, dateFr, libelleMode, telecharger } from './finances-outils';

const STATUTS: Record<string, { label: string; ton: string }> = {
  apercu: { label: 'Aperçu non enregistré', ton: 'neutral' },
  brouillon: { label: 'Brouillon', ton: 'warning' },
  verifie: { label: 'Vérifié', ton: 'primary' },
  transmis: { label: 'Transmis à la Direction', ton: 'success' },
};

/**
 * Rapport financier du soir : préparé par la comptable, vérifié, puis transmis
 * à la Direction générale. Même un jour sans opération donne un rapport, qui
 * le dit et indique où en est la clôture de caisse.
 */
@Component({
  selector: 'app-rapport-quotidien',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  styleUrl: './finances-pages.scss',
  template: `
    <div class="page-grille">
      <header class="page-header">
        <div>
          <p class="eyebrow">Finances</p>
          <h1 class="page-header__title">Rapport du soir</h1>
          <p class="page-header__subtitle">
            Le compte rendu du soir : caisse, encaissements par moyen de paiement, dépenses et leurs autorisations, ventes,
            reversements, chantiers, créances, pièces manquantes et anomalies. Transmis chaque soir à la Direction, en PDF.
          </p>
        </div>
      </header>

      <section class="page-card filtres">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Jour du rapport</mat-label>
          <input matInput type="date" [max]="aujourdhui" [ngModel]="date()" (ngModelChange)="changerJour($event)" />
        </mat-form-field>
        @if (rapport(); as r) {
          <span [class]="'mtm-badge mtm-badge--' + etat(r.statut).ton">{{ etat(r.statut).label }}</span>
          @if (r.preparePar) {
            <span class="meta">Préparé par {{ r.preparePar }}@if (r.verifiePar) { · vérifié par {{ r.verifiePar }} }</span>
          }
          @if (r.transmisLe) {
            <span class="meta">Transmis le {{ dateFr(r.transmisLe) }}</span>
          }
        }
        <span style="flex: 1"></span>
        @if (rapport(); as r) {
          @if (r.statut !== 'transmis') {
            @if (peutCreer) {
              <button mat-stroked-button type="button" (click)="preparer()">
                {{ r.enregistre ? 'Rafraîchir le brouillon' : 'Préparer le rapport' }}
              </button>
            }
            @if (r.statut === 'brouillon' && peutValider && r.preparePar !== moiNom) {
              <button mat-stroked-button type="button" (click)="verifier()">Marquer comme vérifié</button>
            }
            @if (r.enregistre && peutCreer) {
              <button mat-flat-button color="primary" type="button" (click)="transmettre()">Transmettre à la Direction</button>
            }
          }
          <button mat-stroked-button type="button" (click)="pdf()">Télécharger le PDF</button>
        }
      </section>

      @if (rapport(); as r) {
        @if (r.contenu.aucuneOperation) {
          <aside class="alerte" role="status">
            <strong>Aucune opération enregistrée ce jour</strong>
            Le rapport est quand même transmis, pour le confirmer. L’état des caisses ci-dessous reste à jour.
          </aside>
        }

        @if (r.contenu.anomalies.length > 0) {
          <aside class="alerte" role="status">
            <strong>{{ r.contenu.anomalies.length }} anomalie{{ r.contenu.anomalies.length > 1 ? 's' : '' }} à traiter</strong>
            <ul>
              @for (a of r.contenu.anomalies; track $index) {
                <li>{{ a }}</li>
              }
            </ul>
          </aside>
        }

        <section class="page-card">
          <h2>Caisses et comptes</h2>
          <div class="tableau-defilant">
            <table>
              <thead>
                <tr>
                  <th>Compte</th>
                  <th class="nombre">Solde initial</th>
                  <th class="nombre">Entrées</th>
                  <th class="nombre">Sorties</th>
                  <th class="nombre">Théorique</th>
                  <th class="nombre">Compté</th>
                  <th class="nombre">Écart</th>
                </tr>
              </thead>
              <tbody>
                @for (c of r.contenu.caisses; track c.compte) {
                  <tr>
                    <td>{{ c.compte }}</td>
                    <td class="nombre">{{ fcfa(c.soldeInitial) }}</td>
                    <td class="nombre">{{ fcfa(c.encaissements) }}</td>
                    <td class="nombre">{{ fcfa(c.decaissements) }}</td>
                    <td class="nombre">{{ fcfa(c.soldeTheorique) }}</td>
                    <td class="nombre">{{ c.cloture ? fcfa(c.montantCompte ?? 0) : 'non clôturée' }}</td>
                    <td class="nombre" [class.negatif]="(c.ecart ?? 0) < 0">{{ c.cloture ? fcfa(c.ecart ?? 0) : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <div class="deux-colonnes">
          <section class="page-card">
            <h2>Encaissements par moyen de paiement</h2>
            @if (r.contenu.encaissementsParMode.length === 0) {
              <p class="vide">Aucun encaissement ce jour.</p>
            } @else {
              <div class="tableau-defilant">
                <table>
                  <tbody>
                    @for (m of r.contenu.encaissementsParMode; track m.mode) {
                      <tr>
                        <td>{{ libelleMode(m.mode) }}</td>
                        <td class="nombre">{{ m.nombre }}</td>
                        <td class="nombre">{{ fcfa(m.montant) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
          <section class="page-card">
            <h2>Créances et retards</h2>
            <div class="tableau-defilant">
              <table>
                <tbody>
                  <tr><td>Loyers impayés</td><td class="nombre">{{ fcfa(r.contenu.creances.loyers) }}</td></tr>
                  <tr><td>Ventes en retard</td><td class="nombre">{{ fcfa(r.contenu.creances.ventes) }}</td></tr>
                  <tr><td>Démarches à encaisser</td><td class="nombre">{{ fcfa(r.contenu.creances.missions) }}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section class="page-card">
          <h2>Dépenses payées, autorisations et justificatifs</h2>
          @if (r.contenu.depenses.length === 0) {
            <p class="vide">Aucune dépense payée ce jour.</p>
          } @else {
            <div class="tableau-defilant">
              <table>
                <thead>
                  <tr><th>N°</th><th>Libellé</th><th class="nombre">Montant</th><th>Autorisation</th><th>Pièce</th></tr>
                </thead>
                <tbody>
                  @for (d of r.contenu.depenses; track $index) {
                    <tr>
                      <td>{{ d.numero ?? '—' }}</td>
                      <td>{{ d.libelle }}@if (d.tiers) { — {{ d.tiers }} }</td>
                      <td class="nombre">{{ fcfa(d.montant) }}</td>
                      <td>{{ d.autorisation }}</td>
                      <td>
                        <span [class]="'mtm-badge mtm-badge--' + (d.justifie ? 'success' : 'red')">{{
                          d.justifie ? 'Jointe' : 'Manquante'
                        }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <div class="deux-colonnes">
          <section class="page-card">
            <h2>Ventes de terrains et paiements reçus</h2>
            @if (r.contenu.ventes.length === 0) {
              <p class="vide">Aucun paiement de vente reçu ce jour.</p>
            } @else {
              <ul class="liste">
                @for (v of r.contenu.ventes; track $index) {
                  <li class="element">
                    <span class="element__principal">
                      <strong>{{ v.libelle }}</strong>
                      <span class="meta">{{ v.tiers }} · {{ libelleMode(v.mode) }}@if (v.reference) { · {{ v.reference }} }</span>
                    </span>
                    <span class="montant">{{ fcfa(v.montant) }}</span>
                  </li>
                }
              </ul>
            }
          </section>
          <section class="page-card">
            <h2>Reversements aux propriétaires</h2>
            @if (r.contenu.reversements.payes.length === 0) {
              <p class="vide">Aucun reversement payé ce jour.</p>
            } @else {
              <ul class="liste">
                @for (v of r.contenu.reversements.payes; track $index) {
                  <li class="element">
                    <span class="element__principal">
                      <strong>{{ v.libelle }}</strong>
                      <span class="meta">{{ v.tiers }} · {{ libelleMode(v.mode) }}@if (v.reference) { · {{ v.reference }} }</span>
                    </span>
                    <span class="montant">{{ fcfa(v.montant) }}</span>
                  </li>
                }
              </ul>
            }
            <p class="aide">
              Solde restant dû aux propriétaires : {{ fcfa(r.contenu.reversements.soldeDu) }} · autorisés à payer :
              {{ fcfa(r.contenu.reversements.aPayer) }} · en attente d’autorisation :
              {{ r.contenu.reversements.enAttenteAutorisation }}
            </p>
          </section>
        </div>

        <div class="deux-colonnes">
          <section class="page-card">
            <h2>Chantiers : recettes et dépenses du jour</h2>
            @if (r.contenu.chantiers.recettes.length + r.contenu.chantiers.depenses.length === 0) {
              <p class="vide">Aucun mouvement de chantier ce jour.</p>
            } @else {
              <ul class="liste">
                @for (c of r.contenu.chantiers.recettes; track $index) {
                  <li class="element">
                    <span class="element__principal"><strong>Recette — {{ c.libelle }}</strong></span>
                    <span class="montant">{{ fcfa(c.montant) }}</span>
                  </li>
                }
                @for (c of r.contenu.chantiers.depenses; track $index) {
                  <li class="element">
                    <span class="element__principal"><strong>Dépense — {{ c.libelle }}</strong></span>
                    <span class="montant">{{ fcfa(c.montant) }}</span>
                  </li>
                }
              </ul>
            }
          </section>
          <section class="page-card">
            <h2>Justificatifs manquants et files d’attente</h2>
            @if (r.contenu.justificatifsManquants.length === 0) {
              <p class="vide">Aucun justificatif manquant ce jour.</p>
            } @else {
              <ul class="liste">
                @for (j of r.contenu.justificatifsManquants; track $index) {
                  <li class="element">
                    <span class="element__principal"><strong>{{ j.libelle }}</strong><span class="meta">{{ j.numero }}</span></span>
                    <span class="montant">{{ fcfa(j.montant) }}</span>
                  </li>
                }
              </ul>
            }
            <p class="aide">
              En attente de validation : {{ r.contenu.enAttente.operations }} saisie(s), {{ r.contenu.enAttente.paiementsVente }}
              paiement(s) de vente, {{ r.contenu.enAttente.mouvementsFonds }} mouvement(s) de fonds,
              {{ r.contenu.enAttente.reversements }} reversement(s), {{ r.contenu.enAttente.paiementsChantier }} paiement(s) de
              chantier.
            </p>
          </section>
        </div>
      } @else {
        <div class="skeleton" style="height: 260px"></div>
      }

      <section class="page-card">
        <h2>Rapports précédents</h2>
        @if (historique().length === 0) {
          <p class="vide">Aucun rapport enregistré.</p>
        } @else {
          <div class="tableau-defilant">
            <table>
              <tbody>
                @for (h of historique(); track h.id) {
                  <tr>
                    <td>
                      <a href="#" (click)="$event.preventDefault(); changerJour(h.date)">{{ dateFr(h.date) }}</a>
                    </td>
                    <td>
                      <span [class]="'mtm-badge mtm-badge--' + etat(h.statut).ton">{{ etat(h.statut).label }}</span>
                    </td>
                    <td>{{ h.aucuneOperation ? 'Aucune opération' : '' }}</td>
                    <td>{{ h.preparePar }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
})
export class RapportQuotidienPage implements OnInit {
  private readonly api = inject(TresorerieApiService);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutCreer = this.session.hasPermission('finances:creer');
  protected readonly peutValider = this.session.hasPermission('finances:valider');
  protected readonly moiNom = [this.session.user()?.firstName, this.session.user()?.lastName].filter(Boolean).join(' ');

  protected readonly aujourdhui = aujourdhuiIso();
  protected readonly date = signal(aujourdhuiIso());
  protected readonly rapport = signal<RapportQuotidien | null>(null);
  protected readonly historique = signal<RapportQuotidienResume[]>([]);

  protected fcfa = fcfa;
  protected dateFr = dateFr;
  protected libelleMode = libelleMode;
  protected etat = (code: string) => STATUTS[code] ?? { label: code, ton: 'neutral' };

  ngOnInit(): void {
    this.charger();
  }

  protected changerJour(jour: string): void {
    if (!jour) return;
    this.date.set(jour);
    this.charger();
  }

  protected preparer(): void {
    this.agir(this.api.preparerRapport(this.date()), 'Brouillon préparé');
  }

  protected verifier(): void {
    this.agir(this.api.verifierRapport(this.date()), 'Rapport marqué comme vérifié');
  }

  protected transmettre(): void {
    this.agir(this.api.transmettreRapport(this.date()), 'Rapport transmis à la Direction');
  }

  protected pdf(): void {
    this.api.rapportPdf(this.date()).subscribe({
      next: (blob) => telecharger(blob, `rapport-financier_${this.date()}.pdf`),
      error: (e: unknown) => this.notify.error(e, 'Téléchargement impossible'),
    });
  }

  private agir(obs: Observable<RapportQuotidien>, succes: string): void {
    obs.subscribe({
      next: (r) => {
        this.rapport.set(r);
        this.notify.success(succes);
        this.chargerHistorique();
      },
      error: (e: unknown) => this.notify.error(e, 'Action impossible'),
    });
  }

  private charger(): void {
    this.rapport.set(null);
    this.api.rapportQuotidien(this.date()).subscribe({
      next: (r) => this.rapport.set(r),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger le rapport'),
    });
    this.chargerHistorique();
  }

  private chargerHistorique(): void {
    this.api.historiqueRapports().subscribe({ next: (h) => this.historique.set(h) });
  }
}
