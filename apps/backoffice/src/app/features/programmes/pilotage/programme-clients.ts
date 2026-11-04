import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LucideChevronRight, LucideUsers } from '@lucide/angular';
import type { LigneClientProgramme, VentesProgramme } from '../../../core/services/api/programmes-api.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { DOSSIER_STATUS, label, pillClass } from '../../ventes/ventes-status';

type FiltreClients = '' | 'retard' | 'avalider' | 'soldes';

/** Les acquéreurs du programme : qui a pris quel lot, ce qu'il a payé, ce qu'il doit encore. */
@Component({
  selector: 'app-programme-clients',
  imports: [DatePipe, MatButtonModule, LucideChevronRight, LucideUsers, MoneyPipe],
  styleUrl: './pilotage.scss',
  template: `
    @if (!ventes().acces) {
      <p class="etat-vide sans-acces">Vous n’avez pas accès aux dossiers de vente : les clients du programme ne s’affichent pas.</p>
    } @else {
      @if (ventes().perimetre === 'les_votres') {
        <p class="perimetre">Vous voyez ici les clients dont vous êtes le commercial responsable.</p>
      }
      <section class="page-card bloc" aria-labelledby="clients-titre">
        <div class="bloc__tete">
          <div>
            <h2 id="clients-titre">Clients du programme</h2>
            <p>Un client par dossier de vente ouvert sur un lot du programme.</p>
          </div>
        </div>

        @if (ventes().clients.length === 0) {
          <div class="empty-state">
            <svg lucideUsers aria-hidden="true"></svg>
            <h3>Aucun client pour l’instant</h3>
            <p>Dès qu’un dossier de vente est ouvert sur un lot, le client apparaît ici avec ses versements.</p>
          </div>
        } @else {
          <div class="filtres">
            <div class="periodes" role="group" aria-label="Filtrer les clients">
              @for (puce of puces(); track puce.code) {
                <button type="button" [class.is-actif]="filtre() === puce.code" [attr.aria-pressed]="filtre() === puce.code" (click)="filtre.set(puce.code)">
                  {{ puce.label }} <span class="discret">{{ puce.n }}</span>
                </button>
              }
            </div>
          </div>
          <div class="table-scroll">
            <table class="data-table data-table--douce tableau">
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Lot</th>
                  <th scope="col">Dossier</th>
                  <th scope="col" class="is-right">Prix</th>
                  <th scope="col" class="is-right">Payé</th>
                  <th scope="col" class="is-right">Reste dû</th>
                  <th scope="col">Prochaine échéance</th>
                  <th scope="col" aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                @for (c of affiches(); track c.dossierId) {
                  <tr class="is-clickable" [class.is-annule]="c.statut === 'annule'" tabindex="0" (click)="ouvrir(c)" (keydown.enter)="ouvrir(c)">
                    <td>
                      <span class="cellule">
                        <strong>{{ c.client.nom }}</strong>
                        <small>{{ c.client.telephone || 'Pas de téléphone' }}@if (c.commercial) { · {{ c.commercial }} }</small>
                      </span>
                    </td>
                    <td class="nowrap">{{ c.lot?.numero || '—' }}</td>
                    <td><span [class]="pillClass(dossierStatus, c.statut)">{{ label(dossierStatus, c.statut) }}</span></td>
                    <td class="is-right">{{ c.prixVente === null ? '—' : (c.prixVente | mtmMoney) }}</td>
                    <td class="is-right">
                      <span class="paye">
                        <span class="positif">{{ c.montantPaye | mtmMoney }}</span>
                        @if (c.tauxPaye !== null) {
                          <span class="jauge" role="img" [attr.aria-label]="c.tauxPaye + ' % payé'"><span [style.width.%]="c.tauxPaye"></span></span>
                        }
                        @if (c.aValider > 0) {
                          <small class="discret">+ {{ c.aValider | mtmMoney }} à valider</small>
                        }
                      </span>
                    </td>
                    <td class="is-right fort">{{ c.soldeRestant === null ? '—' : (c.soldeRestant | mtmMoney) }}</td>
                    <td>
                      @if (c.retard; as r) {
                        <span class="cellule">
                          <strong class="retard">{{ r.montant | mtmMoney }} en retard</strong>
                          <small>{{ r.jours }} jour{{ r.jours > 1 ? 's' : '' }}{{ r.nombre > 1 ? ' · ' + r.nombre + ' échéances' : '' }}</small>
                        </span>
                      } @else if (c.prochaineEcheance; as p) {
                        <span class="cellule">
                          <strong>{{ p.montant | mtmMoney }}</strong>
                          <small>le {{ p.date | date: 'dd/MM/yyyy' }}</small>
                        </span>
                      } @else {
                        <span class="discret">—</span>
                      }
                    </td>
                    <td>
                      <span class="actions-ligne">
                        @if (peutEnregistrer() && c.statut !== 'annule' && c.statut !== 'solde') {
                          <button mat-stroked-button type="button" (click)="versement.emit(c); $event.stopPropagation()">Versement</button>
                        }
                        <svg lucideChevronRight aria-hidden="true"></svg>
                      </span>
                    </td>
                  </tr>
                }
                @empty {
                  <tr><td colspan="8" class="discret">Aucun client dans cette catégorie.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
})
export class ProgrammeClients {
  readonly ventes = input.required<VentesProgramme>();
  readonly peutEnregistrer = input(false);
  readonly versement = output<LigneClientProgramme>();

  protected readonly dossierStatus = DOSSIER_STATUS;
  protected readonly pillClass = pillClass;
  protected readonly label = label;
  protected readonly filtre = signal<FiltreClients>('');

  protected readonly puces = computed(() => {
    const clients = this.ventes().clients;
    return [
      { code: '' as FiltreClients, label: 'Tous', n: clients.length },
      { code: 'retard' as FiltreClients, label: 'En retard', n: clients.filter((c) => c.retard).length },
      { code: 'avalider' as FiltreClients, label: 'À valider', n: clients.filter((c) => c.aValider > 0).length },
      { code: 'soldes' as FiltreClients, label: 'Soldés', n: clients.filter((c) => c.statut === 'solde').length },
    ];
  });

  protected readonly affiches = computed(() => {
    const clients = this.ventes().clients;
    switch (this.filtre()) {
      case 'retard':
        return clients.filter((c) => c.retard);
      case 'avalider':
        return clients.filter((c) => c.aValider > 0);
      case 'soldes':
        return clients.filter((c) => c.statut === 'solde');
      default:
        return clients;
    }
  });

  private readonly router = inject(Router);

  protected ouvrir(client: LigneClientProgramme): void {
    void this.router.navigate(['/ventes', client.dossierId]);
  }
}
