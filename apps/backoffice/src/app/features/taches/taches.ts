import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideCheck, LucidePlus } from '@lucide/angular';
import { debounceTime } from 'rxjs';
import {
  type Tache,
  type TachesQuery,
  type TachesResume,
  TachesApiService,
} from '../../core/services/api/taches-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { TacheDetailDialog } from './tache-detail-dialog';
import { TacheDialog } from './tache-dialog';
import {
  PRIORITES,
  STATUTS,
  TYPES_DOSSIER_LABELS,
  echeanceDite,
  libelle,
  nomPersonne,
  pastille,
  routeDossier,
} from './taches-status';

type Vue = 'mes' | 'creees' | 'equipe';

/** Filtres de statut proposés : « à traiter » regroupe ce qui reste à faire. */
const FILTRES_STATUT: { valeur: string; label: string }[] = [
  { valeur: 'a_faire,en_cours', label: 'À traiter' },
  { valeur: 'terminee', label: 'Terminées' },
  { valeur: 'annulee', label: 'Annulées' },
  { valeur: '', label: 'Toutes' },
];

const FILTRES_ECHEANCE: { valeur: string; label: string }[] = [
  { valeur: '', label: 'Toutes les échéances' },
  { valeur: 'retard', label: 'En retard' },
  { valeur: 'aujourdhui', label: 'Aujourd’hui' },
  { valeur: 'semaine', label: 'Cette semaine' },
  { valeur: 'sans_date', label: 'Sans date limite' },
];

/**
 * Tâches de l'équipe (section 21) : les miennes, celles que j'ai confiées, et
 * — pour l'encadrement — celles de toute l'équipe. Une notification
 * « /taches?tache=… » ouvre directement la fiche de la tâche.
 */
@Component({
  selector: 'app-taches',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideCheck,
    LucidePlus,
  ],
  templateUrl: './taches.html',
  styleUrl: './taches.scss',
})
export class Taches implements OnInit {
  private readonly api = inject(TachesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly canCreate = this.session.hasPermission('taches:creer');
  protected readonly canAdmin = this.session.hasPermission('taches:administrer');

  protected readonly vue = signal<Vue>('mes');
  protected readonly statut = signal('a_faire,en_cours');
  protected readonly priorite = signal('');
  protected readonly echeance = signal('');
  protected readonly recherche = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);

  protected readonly loading = signal(true);
  protected readonly items = signal<Tache[]>([]);
  protected readonly total = signal(0);
  protected readonly resume = signal<TachesResume | null>(null);

  protected readonly filtresStatut = FILTRES_STATUT;
  protected readonly filtresEcheance = FILTRES_ECHEANCE;
  protected readonly priorites = Object.keys(PRIORITES);
  protected readonly pageSize = 20;
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  protected readonly moi = this.session.user()?.id;

  ngOnInit(): void {
    this.recherche.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.page.set(1);
      this.charger();
    });
    this.charger();
    this.chargerResume();
    const ouverte = this.route.snapshot.queryParamMap.get('tache');
    if (ouverte) this.ouvrir({ id: ouverte });
  }

  protected changerVue(vue: Vue): void {
    this.vue.set(vue);
    this.page.set(1);
    this.charger();
  }

  protected filtrer(champ: 'statut' | 'priorite' | 'echeance', valeur: string): void {
    this[champ].set(valeur);
    this.page.set(1);
    this.charger();
  }

  protected aller(page: number): void {
    this.page.set(page);
    this.charger();
  }

  protected nouvelle(): void {
    TacheDialog.open(this.dialog, {}).subscribe((resultat) => resultat && this.rafraichir());
  }

  protected ouvrir(tache: Pick<Tache, 'id'>): void {
    TacheDetailDialog.open(this.dialog, { id: tache.id }).subscribe((modifie) => {
      // On retire le paramètre de l'adresse : recharger la page ne rouvrirait pas la fiche.
      void this.router.navigate([], { queryParams: { tache: null }, queryParamsHandling: 'merge', replaceUrl: true });
      if (modifie) this.rafraichir();
    });
  }

  /** Coche rapide : termine la tâche sans ouvrir sa fiche. */
  protected terminer(tache: Tache, evenement: Event): void {
    evenement.stopPropagation();
    this.api.update(tache.id, { statut: 'terminee' }).subscribe({
      next: () => {
        this.notify.success('Tâche terminée');
        this.rafraichir();
      },
      error: (error: unknown) => this.notify.error(error, 'Changement impossible'),
    });
  }

  protected ouvrable(tache: Tache): boolean {
    return tache.statut === 'a_faire' || tache.statut === 'en_cours';
  }

  protected routeDossier(tache: Tache): string[] | null {
    return routeDossier(tache.entityType, tache.entityId);
  }

  protected typeDossier(type: string | null): string {
    return (type && TYPES_DOSSIER_LABELS[type]) || '';
  }

  protected libelleStatut = (code: string) => libelle(STATUTS, code);
  protected pastilleStatut = (code: string) => pastille(STATUTS, code);
  protected libellePriorite = (code: string) => libelle(PRIORITES, code);
  protected pastillePriorite = (code: string) => pastille(PRIORITES, code);
  protected echeanceDite = (valeur: string | null) => echeanceDite(valeur);
  protected nom = nomPersonne;

  private rafraichir(): void {
    this.charger();
    this.chargerResume();
  }

  private chargerResume(): void {
    this.api.resume().subscribe({ next: (resume) => this.resume.set(resume), error: () => undefined });
  }

  private charger(): void {
    this.loading.set(true);
    const query: TachesQuery = {
      scope: this.vue(),
      statut: this.statut(),
      priorite: this.priorite(),
      echeance: this.echeance(),
      search: this.recherche.value.trim(),
      page: this.page(),
      pageSize: this.pageSize,
    };
    this.api.list(query).subscribe({
      next: (page) => {
        this.items.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les tâches');
      },
    });
  }
}
