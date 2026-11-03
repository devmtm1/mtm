import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCalendarDays } from '@lucide/angular';
import { type VisiteProgramme, ProgrammesApiService } from '../../../core/services/api/programmes-api.service';
import { VISITE_STATUS, label, pillClass } from '../../crm/crm-status';

/** Les visites des prospects sur les lots du programme, et ce qu'ils en ont pensé. */
@Component({
  selector: 'app-programme-visites',
  imports: [DatePipe, RouterLink, LucideCalendarDays],
  styleUrl: './pilotage.scss',
  template: `
    @if (donnees(); as d) {
      @if (!d.acces) {
        <p class="etat-vide sans-acces">Vous n’avez pas accès au suivi des prospects : les visites du programme ne s’affichent pas.</p>
      } @else {
        <section class="page-card bloc" aria-labelledby="visites-titre">
          <div class="bloc__tete">
            <div>
              <h2 id="visites-titre">Visites du programme</h2>
              <p>Les biens proposés aux prospects, leurs rendez-vous et leurs retours. Une visite se programme depuis la fiche du prospect.</p>
            </div>
          </div>
          @if (d.visites.length === 0) {
            <div class="empty-state">
              <svg lucideCalendarDays aria-hidden="true"></svg>
              <h3>Aucune visite pour l’instant</h3>
              <p>Quand un prospect se verra proposer un lot de ce programme, sa visite apparaîtra ici.</p>
            </div>
          } @else {
            <div class="table-scroll">
              <table class="data-table data-table--douce tableau">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Prospect</th>
                    <th scope="col">Lot</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Accompagnateur</th>
                    <th scope="col">Retour du client</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of d.visites; track v.id) {
                    <tr>
                      <td>
                        @if (v.dateConfirmee) {
                          {{ v.dateConfirmee | date: 'dd/MM/yyyy' }}{{ v.heure ? ' · ' + v.heure : '' }}
                        } @else {
                          <span class="discret">Pas de date</span>
                        }
                      </td>
                      <td>
                        <span class="cellule">
                          <a [routerLink]="['/crm/prospects', v.client.id]">{{ v.client.nom }}</a>
                          <small>{{ v.client.telephone || 'Pas de téléphone' }}</small>
                        </span>
                      </td>
                      <td><a [routerLink]="['/terrains', v.lot.id]">{{ v.lot.numero }}</a></td>
                      <td><span [class]="pillClass(visiteStatus, v.statut)">{{ label(visiteStatus, v.statut) }}</span></td>
                      <td>{{ v.accompagnateur || '—' }}</td>
                      <td>
                        @if (v.terrainPlait || v.objectionPrincipale || v.prixAccepte) {
                          <span class="cellule">
                            @if (v.terrainPlait) { <strong>Le bien plaît : {{ v.terrainPlait }}</strong> }
                            @if (v.prixAccepte) { <small>Prix : {{ v.prixAccepte }}</small> }
                            @if (v.objectionPrincipale) { <small>Objection : {{ v.objectionPrincipale }}</small> }
                          </span>
                        } @else {
                          <span class="discret">Pas encore de retour</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    } @else {
      <div class="skeleton" style="height: 120px; border-radius: 14px"></div>
    }
  `,
})
export class ProgrammeVisites implements OnInit {
  private readonly api = inject(ProgrammesApiService);

  readonly programmeId = input.required<string>();

  protected readonly donnees = signal<{ acces: boolean; visites: VisiteProgramme[] } | null>(null);
  protected readonly visiteStatus = VISITE_STATUS;
  protected readonly pillClass = pillClass;
  protected readonly label = label;

  ngOnInit(): void {
    this.api.visites(this.programmeId()).subscribe({
      next: (donnees) => this.donnees.set(donnees),
      error: () => this.donnees.set({ acces: false, visites: [] }),
    });
  }
}
