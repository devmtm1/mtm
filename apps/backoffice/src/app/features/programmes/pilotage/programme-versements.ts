import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBanknote } from '@lucide/angular';
import type { VentesProgramme } from '../../../core/services/api/programmes-api.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PAYMENT_STATUS, label, modeLabel, pillClass } from '../../ventes/ventes-status';

/** L'argent du programme : ce qu'il reste à encaisser, puis tout ce qui a été versé. */
@Component({
  selector: 'app-programme-versements',
  imports: [DatePipe, RouterLink, LucideBanknote, MoneyPipe],
  styleUrl: './pilotage.scss',
  template: `
    @if (!ventes().acces) {
      <p class="etat-vide sans-acces">Vous n’avez pas accès aux dossiers de vente : les versements du programme ne s’affichent pas.</p>
    } @else {
      @if (ventes().perimetre === 'les_votres') {
        <p class="perimetre">Vous voyez ici les versements de vos propres dossiers.</p>
      }

      @if (ventes().compta; as c) {
        <section class="page-card bloc" aria-labelledby="compta-titre">
          <div class="bloc__tete">
            <div>
              <h2 id="compta-titre">Comptabilité du programme</h2>
              <p>Les mêmes calculs que le journal comptable et la situation des propriétaires : les chiffres se recoupent.</p>
            </div>
            <span class="liens-compta">
              <a [routerLink]="['/finances/journal']">Journal</a>
              <a [routerLink]="['/finances/reversements']">Reversements</a>
            </span>
          </div>
          @if (c.dossiersSansBase > 0) {
            <p class="alerte-ligne">
              {{ c.dossiersSansBase }} dossier{{ c.dossiersSansBase > 1 ? 's portent' : ' porte' }} sur un lot sans commission ni marge :
              leur revenu compte pour zéro dans les comptes. Renseignez-la sur le programme, puis « Appliquer aux lots ».
            </p>
          }
          <dl class="compta">
            <div><dt>Encaissé (paiements validés)</dt><dd class="positif">{{ c.encaisseJournal | mtmMoney }}</dd></div>
            <div><dt>Revenu acquis par MTM</dt><dd>{{ c.revenuAcquis | mtmMoney }}</dd></div>
            <div><dt>Part des propriétaires</dt><dd>{{ c.partProprietaires | mtmMoney }}</dd></div>
            <div><dt>Déjà reversé</dt><dd>{{ c.reverse | mtmMoney }}</dd></div>
            <div><dt>Reversements en cours</dt><dd>{{ c.enCoursReversement | mtmMoney }}</dd></div>
            <div><dt>Reste à reverser</dt><dd class="fort">{{ c.resteAReverser | mtmMoney }}</dd></div>
            @if (c.encaisseSurAnnules > 0) {
              <div class="compta__large">
                <dt>Dont argent de dossiers annulés</dt>
                <dd>{{ c.encaisseSurAnnules | mtmMoney }} encaissés, dont {{ c.revenuSurAnnules | mtmMoney }} de revenu : à rembourser aux clients, hors part retenue</dd>
              </div>
            }
          </dl>
        </section>
      }

      <section class="page-card bloc" aria-labelledby="echeances-titre">
        <div class="bloc__tete">
          <div>
            <h2 id="echeances-titre">Échéances à régler</h2>
            <p>Les sommes attendues des clients, les plus en retard d’abord.</p>
          </div>
        </div>
        @if (ventes().echeances.length === 0) {
          <p class="etat-ok etat-vide">Aucune échéance en attente : tout est à jour.</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table data-table--douce tableau">
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Lot</th>
                  <th scope="col">Échéance</th>
                  <th scope="col">Date prévue</th>
                  <th scope="col" class="is-right">Reste à payer</th>
                  <th scope="col">Situation</th>
                </tr>
              </thead>
              <tbody>
                @for (e of ventes().echeances; track e.dossierId + '-' + e.numero) {
                  <tr>
                    <td><a [routerLink]="['/ventes', e.dossierId]">{{ e.client }}</a></td>
                    <td class="nowrap">{{ e.lot || '—' }}</td>
                    <td>n° {{ e.numero }}</td>
                    <td>{{ e.dateEcheance | date: 'dd/MM/yyyy' }}</td>
                    <td class="is-right fort">{{ e.reste | mtmMoney }}</td>
                    <td>
                      @if (e.joursRetard > 0) {
                        <span class="status-pill status-pill--danger">{{ e.joursRetard }} jour{{ e.joursRetard > 1 ? 's' : '' }} de retard</span>
                      } @else {
                        <span class="status-pill status-pill--info">À venir</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <section class="page-card bloc" aria-labelledby="versements-titre">
        <div class="bloc__tete">
          <div>
            <h2 id="versements-titre">Historique des versements</h2>
            <p>Tous les paiements enregistrés sur les lots du programme. Un paiement « à valider » ne compte pas encore.</p>
          </div>
        </div>
        @if (ventes().versements.length === 0) {
          <div class="empty-state">
            <svg lucideBanknote aria-hidden="true"></svg>
            <h3>Aucun versement pour l’instant</h3>
            <p>Les paiements apparaîtront ici dès qu’un client versera un acompte ou une échéance.</p>
          </div>
        } @else {
          <div class="table-scroll">
            <table class="data-table data-table--douce tableau">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Client</th>
                  <th scope="col">Lot</th>
                  <th scope="col" class="is-right">Montant</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Référence</th>
                </tr>
              </thead>
              <tbody>
                @for (v of ventes().versements; track v.id) {
                  <tr>
                    <td>{{ v.datePaiement | date: 'dd/MM/yyyy' }}</td>
                    <td><a [routerLink]="['/ventes', v.dossierId]">{{ v.client }}</a></td>
                    <td class="nowrap">{{ v.lot || '—' }}</td>
                    <td class="is-right fort">{{ v.montant | mtmMoney }}</td>
                    <td>{{ modeLabel(v.mode) }}</td>
                    <td><span [class]="pillClass(paiementStatus, v.statut)">{{ label(paiementStatus, v.statut) }}</span></td>
                    <td class="discret">{{ v.reference || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
})
export class ProgrammeVersements {
  readonly ventes = input.required<VentesProgramme>();

  protected readonly paiementStatus = PAYMENT_STATUS;
  protected readonly pillClass = pillClass;
  protected readonly label = label;
  protected readonly modeLabel = modeLabel;
}
