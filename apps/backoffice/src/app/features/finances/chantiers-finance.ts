import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import {
  type PaiementChantier,
  type RentabiliteChantier,
  TresorerieApiService,
} from '../../core/services/api/tresorerie-api.service';
import { SessionService } from '../../core/services/session.service';
import { JustificationDialog } from '../../shared/dialogs/justification-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from './finances-utils';
import { dateFr, libelleMode, nomPersonne } from './finances-outils';
import { pageDe } from '../../core/utils/pagination';
import { Pagination } from '../../shared/components/pagination/pagination';

/**
 * Rentabilité de chaque chantier : prix, recettes confirmées du client, coût
 * réel, marge réelle et coût final estimé. Les paiements du client attendent
 * ici la validation de la comptabilité avant de compter.
 */
@Component({
  selector: 'app-chantiers-finance',
  standalone: true,
  imports: [Pagination, RouterLink, MatButtonModule],
  styleUrl: './finances-pages.scss',
  template: `
    <div class="page-grille">
      <header class="page-header">
        <div>
          <p class="eyebrow">Comptabilité</p>
          <h1 class="page-header__title">Rentabilité des chantiers</h1>
          <p class="page-header__subtitle">
            Chaque chantier a sa fiche financière : budget, paiements du client, dépenses engagées, marge prévisionnelle et
            marge réelle. Les matériaux achetés directement par le client sont suivis à part et ne comptent jamais comme une
            sortie de trésorerie de MTM.
          </p>
        </div>
      </header>

      @if (chantiers(); as liste) {
        <section class="tuiles" aria-label="Totaux des chantiers">
          <article class="tuile">
            <span>Recettes confirmées</span>
            <strong>{{ fcfa(totaux().recettes) }}</strong>
          </article>
          <article class="tuile">
            <span>Coût réel (payé par MTM)</span>
            <strong>{{ fcfa(totaux().cout) }}</strong>
          </article>
          <article class="tuile" [class.tuile--danger]="totaux().marge < 0">
            <span>Marge réelle</span>
            <strong [class.negatif]="totaux().marge < 0">{{ fcfa(totaux().marge) }}</strong>
          </article>
          <article class="tuile" [class.tuile--attention]="totaux().depassements > 0">
            <span>Budgets dépassés</span>
            <strong>{{ totaux().depassements }}</strong>
            <small>sur {{ liste.length }} chantier{{ liste.length > 1 ? 's' : '' }}</small>
          </article>
        </section>

        @if (aValider().length > 0) {
          <section class="page-card">
            <h2>Paiements de clients à valider ({{ aValider().length }})</h2>
            <ul class="liste">
              @for (p of aValider(); track p.id) {
                <li class="element">
                  <div class="element__principal">
                    <strong>{{ p.projet.referenceInterne }} — {{ p.projet.intitule }}</strong>
                    <span class="meta">
                      {{ dateFr(p.date) }} · {{ libelleMode(p.mode) }}@if (p.reference) { · réf. {{ p.reference }} } · saisi
                      par {{ nom(p.recordedBy) }}@if (p.echeance) { · {{ p.echeance.libelle }} }
                    </span>
                    @if (p.justificatifUrl) {
                      <span class="meta"><a [href]="p.justificatifUrl" target="_blank" rel="noopener">Pièce jointe</a></span>
                    }
                  </div>
                  <div class="element__droite">
                    <span class="montant">{{ fcfa(p.montant) }}</span>
                    @if (peutValider && p.recordedById !== moi) {
                      <div class="actions">
                        <button mat-flat-button color="primary" type="button" (click)="valider(p)">Valider</button>
                        <button mat-stroked-button type="button" (click)="rejeter(p)">Rejeter</button>
                      </div>
                    }
                  </div>
                </li>
              }
            </ul>
          </section>
        }

        <section class="page-card">
          <h2>Chantiers</h2>
          @if (liste.length === 0) {
            <p class="vide">Aucun chantier en cours.</p>
          } @else {
            <div class="tableau-defilant">
              <table>
                <thead>
                  <tr>
                    <th>Chantier</th>
                    <th class="nombre">Avancement</th>
                    <th class="nombre">Prix</th>
                    <th class="nombre">Budget</th>
                    <th class="nombre">Recettes</th>
                    <th class="nombre">Coût réel</th>
                    <th class="nombre">Marge réelle</th>
                    <th class="nombre">Coût final estimé</th>
                    <th class="nombre">Résultat estimé</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of chantiersPage(liste); track c.id) {
                    <tr>
                      <td>
                        <a [routerLink]="['/finances/chantiers', c.id]"
                          ><strong>{{ c.referenceInterne }}</strong> — {{ c.intitule }}</a
                        >
                        <br /><span class="meta">{{ c.client }}</span>
                        @if (c.depassementBudget) {
                          <span class="mtm-badge mtm-badge--red">Budget dépassé</span>
                        }
                      </td>
                      <td class="nombre">{{ c.avancement }} %</td>
                      <td class="nombre">{{ fcfa(c.prixTotal) }}</td>
                      <td class="nombre">{{ fcfa(c.budgetPrevu) }}</td>
                      <td class="nombre">{{ fcfa(c.recettesConfirmees) }}</td>
                      <td class="nombre">{{ fcfa(c.coutReel) }}</td>
                      <td class="nombre" [class.negatif]="c.margeReelle < 0">
                        <strong>{{ fcfa(c.margeReelle) }}</strong>
                      </td>
                      <td class="nombre">{{ fcfa(c.coutFinalEstime) }}</td>
                      <td class="nombre" [class.negatif]="c.resultatEstime < 0">{{ fcfa(c.resultatEstime) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pagination
              [page]="page()"
              [pageSize]="pageSize()"
              [total]="liste.length"
              nom="chantier"
              (pageChange)="page.set($event)"
              (pageSizeChange)="changerTaille($event)"
            />
          }
        </section>
      } @else {
        <div class="skeleton" style="height: 220px"></div>
      }
    </div>
  `,
})
export class ChantiersFinance implements OnInit {
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);

  /** Les chantiers de la page affichée : les totaux du haut portent sur toute la liste, le tableau est découpé. */
  protected chantiersPage<T>(liste: T[]): T[] {
    return pageDe(liste, this.page(), this.pageSize());
  }

  protected changerTaille(taille: number): void {
    this.pageSize.set(taille);
    this.page.set(1);
  }

  private readonly api = inject(TresorerieApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutValider = this.session.hasPermission('finances:valider');
  protected readonly moi = this.session.user()?.id;

  protected readonly chantiers = signal<RentabiliteChantier[] | null>(null);
  protected readonly aValider = signal<PaiementChantier[]>([]);

  protected readonly totaux = computed(() => {
    const liste = this.chantiers() ?? [];
    return {
      recettes: liste.reduce((t, c) => t + c.recettesConfirmees, 0),
      cout: liste.reduce((t, c) => t + c.coutReel, 0),
      marge: liste.reduce((t, c) => t + c.margeReelle, 0),
      depassements: liste.filter((c) => c.depassementBudget).length,
    };
  });

  protected fcfa = fcfa;
  protected dateFr = dateFr;
  protected nom = nomPersonne;
  protected libelleMode = libelleMode;

  ngOnInit(): void {
    this.charger();
  }

  protected valider(p: PaiementChantier): void {
    this.api.validerPaiementChantier(p.id).subscribe({
      next: () => {
        this.notify.success('Paiement validé : il compte dans les recettes du chantier');
        this.charger();
      },
      error: (e: unknown) => this.notify.error(e, 'Validation impossible'),
    });
  }

  protected rejeter(p: PaiementChantier): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Rejeter le paiement',
      description: `Le paiement de ${fcfa(p.montant)} repart chez ${p.recordedBy.firstName} avec votre motif.`,
      confirmLabel: 'Rejeter',
    }).subscribe((motif) => {
      if (!motif) return;
      this.api.rejeterPaiementChantier(p.id, motif).subscribe({
        next: () => {
          this.notify.success('Paiement rejeté');
          this.charger();
        },
        error: (e: unknown) => this.notify.error(e, 'Rejet impossible'),
      });
    });
  }

  private charger(): void {
    this.api.rentabilite().subscribe({
      next: (c) => this.chantiers.set(c),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les chantiers'),
    });
    this.api.paiementsChantier({ statut: 'en_attente', pageSize: 50 }).subscribe({
      next: (p) => this.aValider.set(p.items),
    });
  }
}
