import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideFileText } from '@lucide/angular';
import { type DocumentsProgramme, ProgrammesApiService } from '../../../core/services/api/programmes-api.service';
import { humaniserCode } from '../../../shared/utils/humaniser';

/** Les pièces du programme : celles de chaque lot (titre, plan…) et celles des ventes (contrat, reçus…). */
@Component({
  selector: 'app-programme-documents',
  imports: [DatePipe, RouterLink, LucideFileText],
  styleUrl: './pilotage.scss',
  template: `
    @if (donnees(); as d) {
      <section class="page-card bloc" aria-labelledby="docs-lots-titre">
        <div class="bloc__tete">
          <div>
            <h2 id="docs-lots-titre">Documents des lots</h2>
            <p>Titre foncier, plan, bornage… Ouvrez le lot pour consulter ou ajouter une pièce.</p>
          </div>
        </div>
        @if (d.lots.length === 0) {
          <div class="empty-state">
            <svg lucideFileText aria-hidden="true"></svg>
            <h3>Aucun document sur les lots</h3>
            <p>Ajoutez les pièces depuis la fiche d’un lot.</p>
          </div>
        } @else {
          <div class="table-scroll">
            <table class="data-table data-table--douce tableau">
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Type</th>
                  <th scope="col">Lot</th>
                  <th scope="col">Visibilité</th>
                  <th scope="col">Ajouté le</th>
                </tr>
              </thead>
              <tbody>
                @for (doc of d.lots; track doc.id) {
                  <tr>
                    <td class="fort">{{ doc.title || humaniser(doc.type) }}</td>
                    <td>{{ humaniser(doc.type) }}</td>
                    <td><a [routerLink]="['/terrains', doc.lotId]">{{ doc.lot }}</a></td>
                    <td>
                      <span class="status-pill" [class.status-pill--success]="doc.isPublic">{{ doc.isPublic ? 'Public' : 'Interne' }}</span>
                    </td>
                    <td>{{ doc.createdAt | date: 'dd/MM/yyyy' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      @if (d.ventes.length > 0) {
        <section class="page-card bloc" aria-labelledby="docs-ventes-titre">
          <div class="bloc__tete">
            <div>
              <h2 id="docs-ventes-titre">Documents des ventes</h2>
              <p>Bons de réservation, reçus, contrats : ouvrez le dossier pour les télécharger.</p>
            </div>
          </div>
          <div class="table-scroll">
            <table class="data-table data-table--douce tableau">
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Client</th>
                  <th scope="col">Lot</th>
                  <th scope="col">Origine</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                @for (doc of d.ventes; track doc.id) {
                  <tr>
                    <td class="fort">{{ doc.title || humaniser(doc.type) }}</td>
                    <td><a [routerLink]="['/ventes', doc.dossierId]">{{ doc.client }}</a></td>
                    <td>{{ doc.lot || '—' }}</td>
                    <td>{{ doc.isGenerated ? 'Généré par MTM' : 'Ajouté' }}</td>
                    <td>{{ doc.createdAt | date: 'dd/MM/yyyy' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    } @else {
      <div class="skeleton" style="height: 120px; border-radius: 14px"></div>
    }
  `,
})
export class ProgrammeDocuments implements OnInit {
  private readonly api = inject(ProgrammesApiService);

  readonly programmeId = input.required<string>();

  protected readonly donnees = signal<DocumentsProgramme | null>(null);
  protected readonly humaniser = humaniserCode;

  ngOnInit(): void {
    this.api.documents(this.programmeId()).subscribe({
      next: (donnees) => this.donnees.set(donnees),
      error: () => this.donnees.set({ lots: [], ventes: [] }),
    });
  }
}
