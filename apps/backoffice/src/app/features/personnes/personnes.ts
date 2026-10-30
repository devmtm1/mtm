import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  LucideContact,
  LucideCopy,
  LucideKeyRound,
  LucideSearch,
  LucideUserSearch,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { Subject, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs';
import {
  PersonnesApiService,
  type CompteursPersonnes,
  type FichePersonne,
  type FiltrePersonnes,
  type Personne,
  type RolePersonne,
} from '../../core/services/api/personnes-api.service';
import { Pagination } from '../../shared/components/pagination/pagination';
import { NotificationService } from '../../shared/services/notification.service';
import { PARCOURS_CLIENT } from '../crm/crm-status';

/** Tailles de page proposées ; la première est celle d'ouverture. */
const TAILLES_PAGE = [25, 50, 100];

const LIBELLES_ROLE: Record<RolePersonne, string> = {
  prospect: 'Client',
  proprietaire: 'Propriétaire',
  locataire: 'Locataire',
};

/**
 * Répertoire des personnes : une même personne peut être client, propriétaire et locataire. Cette page les réunit
 * (même e-mail ou même téléphone) pour retrouver tout ce que MTM sait d'elle, et signale les doublons. Elle ne montre
 * que le nom, les contacts et les rôles : l'identité complète est dans chaque fiche.
 */
@Component({
  selector: 'app-personnes',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    Pagination,
    LucideContact,
    LucideCopy,
    LucideKeyRound,
    LucideSearch,
    LucideUserSearch,
    LucideUsers,
    LucideX,
  ],
  template: `
    <div class="personnes-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Commercial</p>
          <h1 class="page-header__title">Répertoire des personnes</h1>
          <p class="page-header__subtitle">
            Retrouvez une personne et toutes ses fiches : client, propriétaire, locataire. Les
            fiches qui partagent le même e-mail ou le même téléphone sont réunies sur une seule
            ligne.
          </p>
        </div>
      </header>

      <section class="kpi-row" aria-label="Synthèse du répertoire">
        @if (chargement() && !personnes().length) {
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="kpi skeleton" aria-hidden="true"></div>
          }
        } @else {
          <button
            type="button"
            class="kpi"
            [attr.aria-pressed]="filtre() === 'tous'"
            (click)="choisir('tous')"
          >
            <span class="kpi__icon"><svg lucideUsers aria-hidden="true"></svg></span>
            <span class="kpi__body">
              <strong>{{ compteurs().total }}</strong>
              <span>Personnes</span>
              <small>Toutes les fiches réunies</small>
            </span>
          </button>
          @if (accessible('prospect')) {
            <button
              type="button"
              class="kpi kpi--primary"
              [attr.aria-pressed]="filtre() === 'prospect'"
              (click)="choisir('prospect')"
            >
              <span class="kpi__icon"><svg lucideUserSearch aria-hidden="true"></svg></span>
              <span class="kpi__body">
                <strong>{{ compteurs().prospect }}</strong>
                <span>Clients</span>
                <small>Acheteurs et services</small>
              </span>
            </button>
          }
          @if (accessible('proprietaire')) {
            <button
              type="button"
              class="kpi"
              [attr.aria-pressed]="filtre() === 'proprietaire'"
              (click)="choisir('proprietaire')"
            >
              <span class="kpi__icon"><svg lucideContact aria-hidden="true"></svg></span>
              <span class="kpi__body">
                <strong>{{ compteurs().proprietaire }}</strong>
                <span>Propriétaires</span>
                <small>Biens confiés à MTM</small>
              </span>
            </button>
          }
          @if (accessible('locataire')) {
            <button
              type="button"
              class="kpi kpi--success"
              [attr.aria-pressed]="filtre() === 'locataire'"
              (click)="choisir('locataire')"
            >
              <span class="kpi__icon"><svg lucideKeyRound aria-hidden="true"></svg></span>
              <span class="kpi__body">
                <strong>{{ compteurs().locataire }}</strong>
                <span>Locataires</span>
                <small>Baux et locations</small>
              </span>
            </button>
          }
          <button
            type="button"
            class="kpi"
            [class.kpi--warning]="compteurs().doublon > 0"
            [class.kpi--muted]="compteurs().doublon === 0"
            [attr.aria-pressed]="filtre() === 'doublon'"
            (click)="choisir('doublon')"
          >
            <span class="kpi__icon"><svg lucideCopy aria-hidden="true"></svg></span>
            <span class="kpi__body">
              <strong>{{ compteurs().doublon }}</strong>
              <span>À vérifier</span>
              <small>Doublons possibles</small>
            </span>
          </button>
        }
      </section>

      <section class="page-section" aria-labelledby="personnes-titre">
        <div class="list-toolbar">
          <div class="list-toolbar__title">
            <h2 id="personnes-titre">Personnes</h2>
            <p>
              @if (chargement()) {
                Chargement…
              } @else {
                {{ total() }} personne{{ total() > 1 ? 's' : '' }}
                @if (filtre() !== 'tous' || recherche.value) {
                  correspondant à votre sélection
                }
              }
            </p>
          </div>
          <form class="list-filters" (submit)="$event.preventDefault()">
            <mat-form-field
              appearance="outline"
              class="list-filters__search"
              subscriptSizing="dynamic"
            >
              <mat-label>Rechercher</mat-label>
              <svg matPrefix class="list-filters__icon" lucideSearch aria-hidden="true"></svg>
              <input
                matInput
                [formControl]="recherche"
                placeholder="Nom, téléphone, e-mail, référence…"
                autocomplete="off"
              />
            </mat-form-field>
            @if (filtre() !== 'tous' || recherche.value) {
              <button mat-button type="button" class="list-filters__reset" (click)="effacer()">
                <svg class="btn-icon" lucideX aria-hidden="true"></svg>Effacer
              </button>
            }
          </form>
        </div>

        @if (chargement() && !personnes().length) {
          <div class="personnes-page__attente" aria-busy="true">
            <div class="skeleton" style="height: 56px"></div>
            <div class="skeleton" style="height: 56px"></div>
            <div class="skeleton" style="height: 56px"></div>
          </div>
        } @else if (!personnes().length) {
          <div class="empty-state">
            <svg lucideUsers aria-hidden="true"></svg>
            @if (filtre() !== 'tous' || recherche.value) {
              <h3>Aucune personne ne correspond</h3>
              <p>Modifiez la recherche ou effacez la sélection pour revoir tout le répertoire.</p>
              <button mat-stroked-button type="button" (click)="effacer()">
                Effacer la sélection
              </button>
            } @else {
              <h3>Le répertoire est vide</h3>
              <p>
                Les personnes apparaissent ici dès qu'une fiche client, propriétaire ou locataire
                est créée.
              </p>
            }
          </div>
        } @else {
          <div class="table-scroll" [class.table-scroll--attente]="chargement()">
            <table class="data-table personnes-table">
              <thead>
                <tr>
                  <th scope="col">Personne</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Fiches</th>
                  <th scope="col">Contrôle</th>
                </tr>
              </thead>
              <tbody>
                @for (personne of personnes(); track personne.cle) {
                  <tr>
                    <td data-label="Personne">
                      <div class="identite">
                        <span class="identite__avatar" aria-hidden="true">{{
                          initiales(personne)
                        }}</span>
                        <div class="identite__texte">
                          <strong>{{ nomComplet(personne) }}</strong>
                          <small>{{ resume(personne) }}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Contact">
                      <div class="contact">
                        @if (personne.telephone) {
                          <a [href]="'tel:' + personne.telephone">{{ personne.telephone }}</a>
                        }
                        @if (personne.email) {
                          <a [href]="'mailto:' + personne.email">{{ personne.email }}</a>
                        }
                        @if (!personne.telephone && !personne.email) {
                          <span class="muet">Aucun contact visible</span>
                        }
                      </div>
                    </td>
                    <td data-label="Fiches">
                      <ul class="fiches" aria-label="Fiches de cette personne">
                        @for (fiche of personne.fiches; track fiche.role + fiche.id) {
                          <li>
                            <a
                              class="status-pill"
                              [class]="classeRole(fiche)"
                              [routerLink]="lien(fiche)"
                            >
                              {{ libelleFiche(fiche) }}
                              @if (fiche.reference) {
                                <small>{{ fiche.reference }}</small>
                              }
                            </a>
                          </li>
                        }
                      </ul>
                    </td>
                    <td data-label="Contrôle">
                      @if (personne.doublon) {
                        <span
                          class="status-pill status-pill--warning"
                          title="Plusieurs fiches de même type pour cette personne : vérifiez s'il s'agit d'un doublon"
                          >Doublon possible</span
                        >
                      } @else {
                        <span class="muet">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination
            [page]="page()"
            [pageSize]="pageSize()"
            [total]="total()"
            [tailles]="tailles"
            nom="personne"
            (pageChange)="aller($event)"
            (pageSizeChange)="changerTaille($event)"
          />
          @if (tronque()) {
            <p class="personnes-page__astuce">
              La recherche est très large : seules les premières fiches de chaque type sont lues.
              Affinez-la pour être sûr de ne rien manquer.
            </p>
          }
        }
      </section>
    </div>
  `,
  styles: `
    .personnes-page {
      display: grid;
      gap: 20px;
      min-width: 0;
    }
    .kpi[aria-pressed='true'] {
      border-color: var(--mtm-primary);
      box-shadow: 0 0 0 1px var(--mtm-primary) inset;
    }
    .personnes-page__attente {
      display: grid;
      gap: 10px;
      padding: 16px 20px;
    }
    .personnes-page__astuce {
      margin: 0;
      padding: 12px 20px 16px;
      color: var(--mtm-text-muted);
      font-size: 0.82rem;
    }
    .table-scroll--attente {
      opacity: 0.55;
      transition: opacity 0.15s;
    }
    .personnes-table td {
      padding-block: 14px;
      vertical-align: top;
    }
    .personnes-table {
      table-layout: fixed;
      min-width: 880px;
    }
    .personnes-table th:nth-child(1) {
      width: 27%;
    }
    .personnes-table th:nth-child(2) {
      width: 27%;
    }
    .personnes-table th:nth-child(4) {
      width: 150px;
    }
    .contact a {
      overflow-wrap: anywhere;
    }
    .identite {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .identite__avatar {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--mtm-primary-subtle);
      color: var(--mtm-primary);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .identite__texte {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .identite__texte strong {
      font-weight: 600;
    }
    .identite__texte small,
    .muet {
      color: var(--mtm-text-muted);
      font-size: 0.82rem;
    }
    .contact {
      display: grid;
      gap: 3px;
      font-size: 0.86rem;
    }
    .contact a,
    .fiches a {
      color: inherit;
      text-decoration: none;
    }
    .contact a:hover {
      color: var(--mtm-primary);
      text-decoration: underline;
    }
    .fiches {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .fiches a.status-pill {
      gap: 6px;
      padding: 4px 11px;
      font-size: 0.78rem;
    }
    .fiches a.status-pill:hover {
      filter: brightness(0.96);
      text-decoration: underline;
    }
    .fiches small {
      font-weight: 500;
      opacity: 0.75;
    }
    @media (max-width: 720px) {
      .personnes-table thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
      }
      .personnes-table {
        min-width: 0;
        table-layout: auto;
      }
      .personnes-table,
      .personnes-table tbody,
      .personnes-table tr,
      .personnes-table td {
        display: block;
        width: 100%;
      }
      .personnes-table tr {
        padding: 14px 16px;
        border-bottom: 1px solid var(--mtm-border);
      }
      .personnes-table td {
        padding: 4px 0;
        border: 0;
      }
      .personnes-table td[data-label='Contrôle']:has(.muet) {
        display: none;
      }
      .personnes-table td:not(:first-child)::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 2px;
        color: var(--mtm-text-muted);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
    }
  `,
})
export class Personnes implements OnInit {
  private readonly api = inject(PersonnesApiService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tailles = TAILLES_PAGE;
  protected readonly recherche = new FormControl('', { nonNullable: true });
  protected readonly personnes = signal<Personne[]>([]);
  protected readonly sources = signal<RolePersonne[]>([]);
  protected readonly filtre = signal<FiltrePersonnes>('tous');
  protected readonly chargement = signal(true);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(TAILLES_PAGE[0]);
  protected readonly total = signal(0);
  protected readonly pages = signal(1);
  protected readonly tronque = signal(false);
  /** Les chiffres de l'en-tête : toute la recherche, rôle par rôle, quelle que soit la page affichée. */
  protected readonly compteurs = signal<CompteursPersonnes>({
    total: 0,
    prospect: 0,
    proprietaire: 0,
    locataire: 0,
    doublon: 0,
  });


  /** Chaque changement de recherche, de filtre, de page ou de taille relance une lecture ; la plus récente l'emporte. */
  private readonly lecture$ = new Subject<void>();

  ngOnInit(): void {
    this.lecture$
      .pipe(
        startWith(undefined),
        tap(() => this.chargement.set(true)),
        switchMap(() =>
          this.api.rechercher({
            search: this.recherche.value.trim(),
            filtre: this.filtre(),
            page: this.page(),
            pageSize: this.pageSize(),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultat) => {
          this.personnes.set(resultat.items);
          this.sources.set(resultat.sourcesAccessibles);
          this.compteurs.set(resultat.compteurs);
          this.total.set(resultat.total);
          this.pages.set(resultat.pages);
          this.tronque.set(resultat.tronque);
          // Le serveur ramène à la dernière page si la recherche a rétréci pendant qu'on tournait les pages.
          this.page.set(resultat.page);
          this.chargement.set(false);
        },
        error: (error: unknown) => {
          this.chargement.set(false);
          this.notify.error(error, 'Impossible de charger le répertoire');
        },
      });

    // Une nouvelle recherche repart de la première page ; on attend la fin de la frappe.
    this.recherche.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.relancer(1));
  }

  private relancer(page: number): void {
    this.page.set(page);
    this.lecture$.next();
  }

  protected aller(page: number): void {
    if (page < 1 || page > this.pages() || page === this.page()) return;
    this.relancer(page);
  }

  protected changerTaille(taille: number): void {
    this.pageSize.set(taille);
    this.relancer(1);
  }

  protected accessible(role: RolePersonne): boolean {
    return this.sources().includes(role);
  }

  protected choisir(filtre: FiltrePersonnes): void {
    this.filtre.set(this.filtre() === filtre ? 'tous' : filtre);
    this.relancer(1);
  }

  protected effacer(): void {
    this.filtre.set('tous');
    // Sans événement de frappe, rien d'autre ne relance : on relance nous-mêmes, une seule fois.
    if (this.recherche.value) this.recherche.setValue('', { emitEvent: false });
    this.relancer(1);
  }

  protected nomComplet(personne: Personne): string {
    return [personne.prenom, personne.nom].filter(Boolean).join(' ');
  }

  protected initiales(personne: Personne): string {
    return ((personne.prenom?.[0] ?? '') + (personne.nom?.[0] ?? '')).toUpperCase() || '?';
  }

  /** « 2 fiches · Client, Locataire » sous le nom : de quoi juger d'un coup d'œil avant de lire les pastilles. */
  protected resume(personne: Personne): string {
    const roles = [...new Set(personne.fiches.map((fiche) => LIBELLES_ROLE[fiche.role]))];
    const nombre = personne.fiches.length;
    return `${nombre} fiche${nombre > 1 ? 's' : ''} · ${roles.join(', ')}`;
  }

  /** « Client · Vérification foncière », « Propriétaire »… : ce que cette fiche représente pour MTM. */
  protected libelleFiche(fiche: FichePersonne): string {
    if (fiche.role === 'prospect' && fiche.parcours && fiche.parcours !== 'acheteur') {
      return `Client · ${PARCOURS_CLIENT[fiche.parcours]?.label ?? fiche.parcours}`;
    }
    return fiche.role === 'prospect' ? 'Client · Acheteur' : LIBELLES_ROLE[fiche.role];
  }

  protected classeRole(fiche: FichePersonne): string {
    switch (fiche.role) {
      case 'prospect':
        return 'status-pill--primary';
      case 'proprietaire':
        return 'status-pill--info';
      case 'locataire':
        return 'status-pill--success';
    }
  }

  protected lien(fiche: FichePersonne): string[] {
    switch (fiche.role) {
      case 'prospect':
        return ['/crm/prospects', fiche.id];
      case 'proprietaire':
        return ['/proprietaires', fiche.id];
      case 'locataire':
        return ['/locatif/locataires', fiche.id];
    }
  }
}
