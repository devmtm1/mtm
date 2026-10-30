import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { type Etat, type EtatCatalogue, TresorerieApiService } from '../../core/services/api/tresorerie-api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa, presets } from './finances-utils';
import { telecharger } from './finances-outils';
import { nombreFr } from '../../core/utils/format';

/**
 * États à la demande de la Direction : journaux de caisse et de banques,
 * dépenses par catégorie, recettes par activité, ventes, créances, commissions,
 * sommes dues aux propriétaires, rentabilité des chantiers, opérations sans
 * justificatif, journal des corrections et validations.
 */
@Component({
  selector: 'app-etats-financiers',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  styleUrl: './finances-pages.scss',
  template: `
    <div class="page-grille">
      <header class="page-header">
        <div>
          <p class="eyebrow">Comptabilité</p>
          <h1 class="page-header__title">États financiers</h1>
          <p class="page-header__subtitle">
            Les états que la Direction demande à la comptable : chacun se lit à l’écran et se télécharge en CSV, ouvrable
            dans Excel. Les rapports mensuels et la comptabilité générale détaillée viendront dans une phase ultérieure.
          </p>
        </div>
      </header>

      <section class="page-card filtres" aria-label="Choix de l’état">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" style="min-width: 300px">
          <mat-label>État</mat-label>
          <mat-select [ngModel]="code()" (ngModelChange)="choisir($event)">
            @for (e of catalogue(); track e.code) {
              <mat-option [value]="e.code">{{ e.titre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (courant()?.parPeriode) {
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Du</mat-label>
            <input matInput type="date" [ngModel]="du()" (ngModelChange)="du.set($event); charger()" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Au</mat-label>
            <input matInput type="date" [ngModel]="au()" (ngModelChange)="au.set($event); charger()" />
          </mat-form-field>
        }
        <button mat-stroked-button type="button" (click)="exporter()" [disabled]="!etat() || etat()!.lignes.length === 0">
          Télécharger en CSV
        </button>
      </section>

      @if (courant(); as c) {
        <p class="aide">{{ c.description }}</p>
      }

      @if (chargement()) {
        <div class="skeleton" style="height: 200px"></div>
      } @else if (etat(); as e) {
        <section class="page-card">
          <h2>{{ e.titre }}</h2>
          @if (e.lignes.length === 0) {
            <p class="vide">Rien à afficher pour cet état sur cette période.</p>
          } @else {
            <div class="tableau-defilant">
              <table>
                <thead>
                  <tr>
                    @for (col of e.colonnes; track col.cle) {
                      <th [class.nombre]="col.type === 'montant' || col.type === 'nombre'">{{ col.libelle }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (ligne of e.lignes; track $index) {
                    <tr>
                      @for (col of e.colonnes; track col.cle) {
                        <td [class.nombre]="col.type === 'montant' || col.type === 'nombre'">{{ cellule(ligne[col.cle], col.type) }}</td>
                      }
                    </tr>
                  }
                </tbody>
                @if (e.totaux; as t) {
                  <tfoot>
                    <tr>
                      @for (col of e.colonnes; track col.cle; let i = $index) {
                        <td [class.nombre]="col.type === 'montant' || col.type === 'nombre'">
                          {{ i === 0 ? 'Total' : t[col.cle] === undefined ? '' : cellule(t[col.cle], col.type) }}
                        </td>
                      }
                    </tr>
                  </tfoot>
                }
              </table>
            </div>
            <p class="aide">{{ e.lignes.length }} ligne{{ e.lignes.length > 1 ? 's' : '' }}</p>
          }
        </section>
      }
    </div>
  `,
})
export class EtatsFinanciers implements OnInit {
  private readonly api = inject(TresorerieApiService);
  private readonly notify = inject(NotificationService);

  protected readonly catalogue = signal<EtatCatalogue[]>([]);
  protected readonly code = signal('journal-caisse');
  protected readonly etat = signal<Etat | null>(null);
  protected readonly chargement = signal(false);
  protected readonly du = signal(presets()[0].du);
  protected readonly au = signal(presets()[0].au);

  ngOnInit(): void {
    this.api.etats().subscribe({
      next: (liste) => {
        this.catalogue.set(liste);
        this.charger();
      },
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les états'),
    });
  }

  protected courant(): EtatCatalogue | undefined {
    return this.catalogue().find((e) => e.code === this.code());
  }

  protected choisir(code: string): void {
    this.code.set(code);
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.api.etat(this.code(), { du: this.du(), au: this.au() }).subscribe({
      next: (etat) => {
        this.etat.set(etat);
        this.chargement.set(false);
      },
      error: (e: unknown) => {
        this.chargement.set(false);
        this.notify.error(e, 'Impossible de produire cet état');
      },
    });
  }

  protected exporter(): void {
    this.api.etatCsv(this.code(), { du: this.du(), au: this.au() }).subscribe({
      next: (blob) => telecharger(blob, `${this.code()}.csv`),
      error: (e: unknown) => this.notify.error(e, 'Téléchargement impossible'),
    });
  }

  protected cellule(valeur: string | number | null | undefined, type: 'texte' | 'montant' | 'date' | 'nombre'): string {
    if (valeur === null || valeur === undefined || valeur === '') return '—';
    if (type === 'montant') return fcfa(Number(valeur));
    if (type === 'nombre') return nombreFr(Number(valeur));
    if (type === 'date') return new Date(`${String(valeur).slice(0, 10)}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
    return String(valeur);
  }
}
