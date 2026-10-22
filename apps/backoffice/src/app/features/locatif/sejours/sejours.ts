import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideBedDouble, LucideCalendarCheck, LucideInbox, LucidePlus, LucideSearch, LucideShieldAlert } from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SejoursApiService } from '../../../core/services/api/sejours-api.service';
import { SessionService } from '../../../core/services/session.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import type { SejourListItem, SejourStats, StatutSejour } from '../../../core/models/sejour.model';
import { SejourDialog } from './sejour-dialog';
import {
  SOURCES_SEJOUR,
  STATUTS_CAUTION_SEJOUR,
  STATUTS_REGLEMENT,
  STATUTS_SEJOUR,
  formatJour,
  libelle,
  nomBien,
  nomVoyageur,
  periodeSejour,
} from './sejour-status';

const VUES = [
  { value: '', label: 'Tous' },
  { value: 'a_traiter', label: 'Demandes à traiter' },
  { value: 'a_venir', label: 'À venir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'caution_a_regler', label: 'Caution à régler' },
  { value: 'termines', label: 'Terminés ou annulés' },
];

/**
 * Séjours de courte durée (location type Airbnb) : les demandes reçues du site,
 * les réservations à venir, les clients sur place, et les cautions à rendre.
 */
@Component({
  selector: 'app-sejours',
  imports: [
    DatePipe,
    MoneyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideBedDouble,
    LucideCalendarCheck,
    LucideInbox,
    LucidePlus,
    LucideSearch,
    LucideShieldAlert,
  ],
  templateUrl: './sejours.html',
  styleUrl: './sejours.scss',
})
export class Sejours implements OnInit {
  private readonly api = inject(SejoursApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canCreate = computed(() => this.session.hasPermission('locatif:creer'));

  protected readonly vues = VUES;
  protected readonly statuts = STATUTS_SEJOUR;
  protected readonly statutsListe: StatutSejour[] = ['demande', 'confirmee', 'en_cours', 'terminee', 'annulee'];
  protected readonly reglements = STATUTS_REGLEMENT;
  protected readonly cautions = STATUTS_CAUTION_SEJOUR;
  protected readonly sources = SOURCES_SEJOUR;

  protected readonly loading = signal(true);
  protected readonly items = signal<SejourListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 25;
  protected readonly stats = signal<SejourStats | null>(null);
  protected readonly vue = signal('');
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly statut = new FormControl('', { nonNullable: true });

  protected readonly pages = computed(() => Math.max(Math.ceil(this.total() / this.pageSize), 1));

  protected readonly jour = formatJour;
  protected readonly periode = periodeSejour;
  protected readonly voyageur = nomVoyageur;
  protected readonly bien = nomBien;
  protected readonly libelle = libelle;

  ngOnInit(): void {
    this.charger();
    this.chargerStats();
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.reinitialiserPage());
    this.statut.valueChanges.subscribe(() => this.reinitialiserPage());
  }

  protected choisirVue(valeur: string): void {
    this.vue.set(valeur);
    // Une vue rapide fixe déjà le statut : le filtre manuel ne s'y ajoute pas.
    if (valeur) this.statut.setValue('', { emitEvent: false });
    this.reinitialiserPage();
  }

  protected ouvrir(sejour: SejourListItem): void {
    void this.router.navigate(['/locatif/sejours', sejour.id]);
  }

  protected nouveau(): void {
    SejourDialog.open(this.dialog, {}).subscribe((sejour) => {
      if (!sejour) return;
      this.notify.success(`Séjour ${sejour.referenceInterne} enregistré`);
      void this.router.navigate(['/locatif/sejours', sejour.id]);
    });
  }

  protected pagePrecedente(): void {
    if (this.page() > 1) {
      this.page.update((valeur) => valeur - 1);
      this.charger();
    }
  }

  protected pageSuivante(): void {
    if (this.page() < this.pages()) {
      this.page.update((valeur) => valeur + 1);
      this.charger();
    }
  }

  private reinitialiserPage(): void {
    this.page.set(1);
    this.charger();
  }

  private chargerStats(): void {
    this.api.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.stats.set(null),
    });
  }

  private charger(): void {
    this.loading.set(true);
    this.api
      .findAll({
        search: this.search.value.trim() || undefined,
        statut: this.statut.value || undefined,
        vue: this.vue() || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (resultat) => {
          this.items.set(resultat.items);
          this.total.set(resultat.total);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.notify.error(error, 'Impossible de charger les séjours');
        },
      });
  }
}
