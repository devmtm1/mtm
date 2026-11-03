import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideScrollText } from '@lucide/angular';
import {
  type CommissionProgramme,
  type MandatProgramme,
  ProgrammesApiService,
} from '../../../core/services/api/programmes-api.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { MANDAT_STATUS, pillClass as mandatPill } from '../../mandats/mandat-status';
import { COMMISSION_STATUS, label, pillClass } from '../../ventes/ventes-status';

/** Qui commercialise le programme (mandats) et ce que ces ventes rapportent (commissions). */
@Component({
  selector: 'app-programme-mandats',
  imports: [DatePipe, RouterLink, LucideScrollText, MoneyPipe],
  styleUrl: './pilotage.scss',
  template: `
    @if (donnees(); as d) {
      <section class="page-card bloc" aria-labelledby="mandats-titre">
        <div class="bloc__tete">
          <div>
            <h2 id="mandats-titre">Mandats</h2>
            <p>Les contrats qui confient des lots du programme à l’agence. Le bouton « Confier un programme » est sur la fiche du mandat.</p>
          </div>
        </div>
        @if (!d.acces) {
          <p class="etat-vide">Vous n’avez pas accès aux mandats.</p>
        } @else if (d.mandats.length === 0) {
          <div class="empty-state">
            <svg lucideScrollText aria-hidden="true"></svg>
            <h3>Aucun mandat sur ce programme</h3>
            <p>Confiez le programme à un mandat depuis la fiche du mandat : tous ses lots lui sont rattachés d’un coup.</p>
          </div>
        } @else {
          <div class="table-scroll">
            <table class="data-table data-table--douce tableau">
              <thead>
                <tr>
                  <th scope="col">Mandat</th>
                  <th scope="col">Propriétaire</th>
                  <th scope="col">Responsable</th>
                  <th scope="col">Statut</th>
                  <th scope="col" class="is-right">Lots du programme</th>
                  <th scope="col">Période</th>
                </tr>
              </thead>
              <tbody>
                @for (m of d.mandats; track m.id) {
                  <tr>
                    <td>
                      <span class="cellule">
                        <a [routerLink]="['/mandats', m.id]">{{ m.reference }}</a>
                        <small>{{ m.typeMandat }}{{ m.exclusivite ? ' · exclusif' : '' }}</small>
                      </span>
                    </td>
                    <td>{{ m.proprietaire }}</td>
                    <td>{{ m.commercial || '—' }}</td>
                    <td><span [class]="mandatPill(mandatStatus, m.statut)">{{ m.statut }}</span></td>
                    <td class="is-right fort">{{ m.lotsDuProgramme }}</td>
                    <td>{{ m.dateDebut | date: 'dd/MM/yyyy' }} → {{ m.dateFin | date: 'dd/MM/yyyy' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    } @else {
      <div class="skeleton" style="height: 120px; border-radius: 14px"></div>
    }

    @if (commissions().length > 0) {
      <section class="page-card bloc" aria-labelledby="commissions-titre">
        <div class="bloc__tete">
          <div>
            <h2 id="commissions-titre">Commissions sur les ventes du programme</h2>
            <p>Une commission est estimée à l’ouverture du dossier, validée par un responsable, puis payée une fois le dossier soldé.</p>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table data-table--douce tableau">
            <thead>
              <tr>
                <th scope="col">Commercial</th>
                <th scope="col">Client</th>
                <th scope="col">Lot</th>
                <th scope="col" class="is-right">Estimée</th>
                <th scope="col" class="is-right">Validée</th>
                <th scope="col" class="is-right">Payée</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              @for (c of commissions(); track c.id) {
                <tr>
                  <td>{{ c.commercial }}</td>
                  <td><a [routerLink]="['/ventes', c.dossierId]">{{ c.client }}</a></td>
                  <td class="nowrap">{{ c.lot || '—' }}</td>
                  <td class="is-right">{{ c.montantEstime | mtmMoney }}</td>
                  <td class="is-right">{{ c.montantValide === null ? '—' : (c.montantValide | mtmMoney) }}</td>
                  <td class="is-right">{{ c.montantPaye === null ? '—' : (c.montantPaye | mtmMoney) }}</td>
                  <td><span [class]="pillClass(commissionStatus, c.statut)">{{ label(commissionStatus, c.statut) }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class ProgrammeMandats implements OnInit {
  private readonly api = inject(ProgrammesApiService);

  readonly programmeId = input.required<string>();
  /** Les commissions viennent des dossiers de vente, déjà chargés par la fiche. */
  readonly commissions = input<CommissionProgramme[]>([]);

  protected readonly donnees = signal<{ acces: boolean; mandats: MandatProgramme[] } | null>(null);
  protected readonly mandatStatus = MANDAT_STATUS;
  protected readonly commissionStatus = COMMISSION_STATUS;
  protected readonly mandatPill = mandatPill;
  protected readonly pillClass = pillClass;
  protected readonly label = label;

  ngOnInit(): void {
    this.api.mandats(this.programmeId()).subscribe({
      next: (donnees) => this.donnees.set(donnees),
      error: () => this.donnees.set({ acces: false, mandats: [] }),
    });
  }
}
