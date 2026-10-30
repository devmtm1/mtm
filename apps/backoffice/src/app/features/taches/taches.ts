import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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
  urgenceEcheance,
  libelle,
  nomPersonne,
  pastille,
  routeDossier,
} from './taches-status';
import { Pagination } from '../../shared/components/pagination/pagination';

type Vue = 'mes' | 'creees' | 'equipe';

/** Une puce de filtre : ce qu'elle règle (statut et échéance) et ce qu'elle compte. */
interface Puce {
  code: string;
  label: string;
  statut: string;
  echeance: string;
  compte: number | null;
  danger?: boolean;
}

/** Les périodes dans lesquelles la liste est découpée, dans l'ordre où elles s'affichent. */
const PERIODES: { code: string; titre: string }[] = [
  { code: 'retard', titre: 'En retard' },
  { code: 'aujourdhui', titre: 'Aujourd’hui' },
  { code: 'semaine', titre: 'Cette semaine' },
  { code: 'plus_tard', titre: 'Plus tard' },
  { code: 'sans', titre: 'Sans date limite' },
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
    DatePipe,
    Pagination,
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

  protected readonly priorites = Object.keys(PRIORITES);
  protected readonly pageSize = 20;
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  protected readonly moi = this.session.user()?.id;

  /** Les filtres rapides : à faire, en retard, aujourd'hui… avec ce que chacun compte quand on le sait. */
  protected readonly puces = computed<Puce[]>(() => {
    const r = this.resume();
    const afaire = 'a_faire,en_cours';
    return [
      { code: 'a_faire', label: 'À faire', statut: afaire, echeance: '', compte: r?.aFaire ?? null },
      { code: 'retard', label: 'En retard', statut: afaire, echeance: 'retard', compte: r?.enRetard ?? null, danger: (r?.enRetard ?? 0) > 0 },
      { code: 'aujourdhui', label: 'Aujourd’hui', statut: afaire, echeance: 'aujourdhui', compte: r?.aujourdhui ?? null },
      { code: 'semaine', label: 'Cette semaine', statut: afaire, echeance: 'semaine', compte: null },
      { code: 'sans_date', label: 'Sans date', statut: afaire, echeance: 'sans_date', compte: null },
      { code: 'terminees', label: 'Terminées', statut: 'terminee', echeance: '', compte: null },
      { code: 'annulees', label: 'Annulées', statut: 'annulee', echeance: '', compte: null },
    ];
  });

  /** La puce qui correspond aux filtres appliqués ; aucune si la combinaison ne ressemble à aucune puce. */
  protected readonly puceActive = computed(
    () => this.puces().find((puce) => puce.statut === this.statut() && puce.echeance === this.echeance())?.code ?? null,
  );

  /**
   * La liste découpée par période (en retard, aujourd'hui, cette semaine, plus tard) tant qu'on regarde ce qui reste à
   * faire ; les tâches terminées ou annulées restent en une seule liste.
   */
  protected readonly groupes = computed(() => {
    const taches = this.items();
    if (this.statut() !== 'a_faire,en_cours') return [{ code: 'toutes', titre: '', taches }];
    const maintenant = new Date();
    const periode = (tache: Tache): string => {
      if (!tache.dateLimite) return 'sans';
      const urgence = urgenceEcheance(tache.dateLimite, maintenant);
      if (tache.enRetard || urgence === 'retard') return 'retard';
      if (urgence === 'aujourdhui') return 'aujourdhui';
      const jours = (new Date(tache.dateLimite).getTime() - maintenant.getTime()) / 86_400_000;
      return jours <= 7 ? 'semaine' : 'plus_tard';
    };
    return PERIODES.map((p) => ({ code: p.code, titre: p.titre, taches: taches.filter((tache) => periode(tache) === p.code) })).filter(
      (g) => g.taches.length > 0,
    );
  });

  ngOnInit(): void {
    this.recherche.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.page.set(1);
      this.charger();
    });
    this.charger();
    this.chargerResume();
    const ouverte = this.route.snapshot.queryParamMap.get('tache');
    if (ouverte) this.ouvrir({ id: ouverte });
    // « + Nouveau › Tâche » dans la barre du haut arrive ici avec ?nouvelle=1 : on ouvre le formulaire, puis on retire le paramètre.
    if (this.route.snapshot.queryParamMap.get('nouvelle') && this.canCreate) {
      void this.router.navigate([], { queryParams: { nouvelle: null }, queryParamsHandling: 'merge', replaceUrl: true });
      this.nouvelle();
    }
  }

  protected changerVue(vue: Vue): void {
    this.vue.set(vue);
    this.page.set(1);
    this.charger();
  }

  protected choisirPuce(puce: Puce): void {
    this.statut.set(puce.statut);
    this.echeance.set(puce.echeance);
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
  protected urgence = (valeur: string | null) => urgenceEcheance(valeur);
  protected nom = nomPersonne;

  private rafraichir(): void {
    this.charger();
    this.chargerResume();
  }

  private chargerResume(): void {
    this.api.resume().subscribe({ next: (resume) => this.resume.set(resume), error: () => undefined });
  }

  private charger(): void {
    if (!this.chargementInitialFait) this.loading.set(true);
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
        this.finChargement();
      },
      error: (error: unknown) => {
        this.finChargement();
        this.notify.error(error, 'Impossible de charger les tâches');
      },
    });
  }

  /** Le squelette ne s'affiche qu'au premier chargement : ensuite l'écran se met à jour en place, sans clignoter ni remonter. */
  private chargementInitialFait = false;

  private finChargement(): void {
    this.loading.set(false);
    this.chargementInitialFait = true;
  }
}
