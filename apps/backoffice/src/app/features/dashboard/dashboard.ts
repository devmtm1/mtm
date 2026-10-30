import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  LucideArrowRight,
  LucideBadgeCheck,
  LucideBanknote,
  LucideBuilding2,
  LucideCircleCheck,
  LucideClipboardCheck,
  LucideDynamicIcon,
  LucideFileX,
  LucideHardHat,
  LucideLandPlot,
  LucideMail,
  LucideReceipt,
  LucideScrollText,
  LucideTriangleAlert,
  LucideUserSearch,
  type LucideIcon,
} from '@lucide/angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SessionService } from '../../core/services/session.service';
import { NotificationsFeedService, type FeedItem } from '../../core/services/notifications-feed.service';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import { MandatsApiService } from '../../core/services/api/mandats-api.service';
import { TerrainsApiService } from '../../core/services/api/terrains-api.service';
import { CrmApiService } from '../../core/services/api/crm-api.service';
import { LocatifApiService } from '../../core/services/api/locatif-api.service';
import { ConstructionApiService } from '../../core/services/api/construction-api.service';
import type { VenteDashboardStats } from '../../core/models/vente.model';
import type { MandatStats } from '../../core/models/mandat.model';
import type { TerrainStats } from '../../core/models/terrain.model';
import type { ProspectStats } from '../../core/models/prospect.model';
import type { LocatifStats } from '../../core/models/locatif.model';
import type { ChantierStats } from '../../core/models/chantier.model';
import { NavCompteursService } from '../../layout/nav-compteurs.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { donutChart, monthlyBarChart } from '../../shared/charts/mtm-charts';
import { DOSSIER_STATUS, label as venteLabel, pillClass as ventePill } from '../ventes/ventes-status';
import { VueCommercial } from '../pilotage/vue-commercial';
import { VueDirection } from '../pilotage/vue-direction';
import { VueManager } from '../pilotage/vue-manager';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Les vues : l'accueil (ce que je dois faire, mes chiffres) et, selon les droits, mon activité, l'équipe, la direction. */
type Vue = 'accueil' | 'moi' | 'equipe' | 'direction';

/** Un domaine d'activité : de lui dépendent les chiffres et les blocs de l'accueil. */
type Domaine = 'ventes' | 'crm' | 'terrains' | 'mandats' | 'locatif' | 'chantiers' | 'finances';

/** Un chiffre de l'accueil : ce qu'on compte, une ligne d'explication, et où cliquer pour agir. */
interface Indicateur {
  domaine: Domaine;
  libelle: string;
  valeur: string;
  aide: string;
  icone: LucideIcon;
  route: string;
  /** « alerte » : quelque chose demande une action (carte rouge) ; « ok » : rien à faire (carte verte). */
  ton?: 'alerte' | 'ok';
  /** Part en pourcentage, pour l'anneau à côté du chiffre. */
  anneau?: number | null;
}

type Bloc = 'recents' | 'encaissements' | 'pipeline' | 'locatif' | 'chantiers';

/** Combien de points « à traiter » on montre avant de renvoyer vers la page des notifications. */
const POINTS_VISIBLES = 5;
const NOMBRE_INDICATEURS = 4;
const NOMBRE_BLOCS = 2;

/**
 * Tableau de bord. L'accueil dit d'abord ce qu'il y a à faire, puis quatre chiffres choisis selon le métier de la
 * personne, puis deux blocs de détail au plus. Les autres vues (mon activité, équipe, direction) restent des onglets
 * pour ceux qui y ont droit.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    VueCommercial,
    VueDirection,
    VueManager,
    MoneyPipe,
    DatePipe,
    MatButtonModule,
    NgxEchartsDirective,
    LucideArrowRight,
    LucideCircleCheck,
    LucideDynamicIcon,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly feed = inject(NotificationsFeedService);
  private readonly ventesApi = inject(VentesApiService);
  private readonly mandatsApi = inject(MandatsApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly locatifApi = inject(LocatifApiService);
  private readonly constructionApi = inject(ConstructionApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly compteursService = inject(NavCompteursService);

  protected readonly user = this.session.user;

  protected readonly vues = computed(() => {
    const liste: { code: Vue; label: string }[] = [{ code: 'accueil', label: 'Accueil' }];
    if (this.session.hasPermission('crm:consulter')) liste.push({ code: 'moi', label: 'Mon activité' });
    if (this.session.hasPermission('rapports:consulter')) liste.push({ code: 'equipe', label: 'Équipe' });
    if (this.session.hasPermission('rapports:administrer')) liste.push({ code: 'direction', label: 'Direction' });
    return liste;
  });
  protected readonly vue = signal<Vue>('accueil');
  /** Tableau d'un autre commercial, ouvert depuis la vue Équipe. */
  protected readonly commercialId = signal<string | undefined>(undefined);

  private readonly canViewVentes = this.session.hasPermission('ventes:consulter');
  private readonly canViewMandats = this.session.hasPermission('mandats:consulter');
  private readonly canViewTerrains = this.session.hasPermission('terrains:consulter');
  private readonly canViewCrm = this.session.hasPermission('crm:consulter');
  private readonly canViewLocatif = this.session.hasPermission('locatif:consulter');
  private readonly canViewConstruction = this.session.hasPermission('construction:consulter');
  private readonly canViewFinances = this.session.hasPermission('finances:consulter');
  private readonly canViewFinancials = this.session.hasPermission('ventes:consulter_financier') || this.session.hasSupervisionScope('ventes');

  protected readonly today = new Date();
  protected readonly monthLabel = `${MONTHS[this.today.getMonth()]} ${this.today.getFullYear()}`;
  protected readonly hasAnyModule =
    this.canViewVentes || this.canViewMandats || this.canViewTerrains || this.canViewCrm || this.canViewLocatif || this.canViewConstruction || this.canViewFinances;

  protected readonly feedItems = signal<FeedItem[] | null>(null);
  private readonly ventesStats = signal<VenteDashboardStats | null>(null);
  private readonly mandatStats = signal<MandatStats | null>(null);
  private readonly terrainStats = signal<TerrainStats | null>(null);
  private readonly crmStats = signal<ProspectStats | null>(null);
  protected readonly locatifStats = signal<LocatifStats | null>(null);
  protected readonly chantierStats = signal<ChantierStats | null>(null);
  protected readonly loadingVentes = signal(this.canViewVentes);
  private readonly compteurs = this.compteursService.compteurs;

  /** Domaines dont les chiffres sont arrivés (ou ont échoué) : tant qu'il en manque, on montre des emplacements vides. */
  private readonly domainesPrets = signal<ReadonlySet<Domaine>>(new Set());

  /** Les domaines de la personne, du plus important au moins important pour son métier, limités à ses droits. */
  private readonly domaines = computed<Domaine[]>(() => {
    const roles = this.session.hasPermission('rapports:administrer')
      ? (['ventes', 'locatif', 'chantiers', 'crm', 'mandats', 'terrains', 'finances'] as Domaine[])
      : this.session.hasRole('comptable')
        ? (['finances', 'ventes', 'locatif', 'chantiers'] as Domaine[])
        : this.session.hasRole('responsable_gestion_locative')
          ? (['locatif', 'mandats', 'finances'] as Domaine[])
          : this.session.hasRole('commercial')
            ? (['crm', 'ventes', 'terrains', 'mandats'] as Domaine[])
            : (['ventes', 'crm', 'mandats', 'terrains', 'locatif', 'chantiers', 'finances'] as Domaine[]);
    const permis: Record<Domaine, boolean> = {
      ventes: this.canViewVentes,
      crm: this.canViewCrm,
      terrains: this.canViewTerrains,
      mandats: this.canViewMandats,
      locatif: this.canViewLocatif,
      chantiers: this.canViewConstruction,
      finances: this.canViewFinances,
    };
    return roles.filter((domaine) => permis[domaine]);
  });

  /**
   * Les chiffres de chaque domaine, du plus utile au moins utile ; l'accueil en prend un par domaine à tour de rôle
   * jusqu'à quatre, pour mélanger les métiers au lieu de tout prendre dans le premier.
   */
  private candidats(domaine: Domaine): Indicateur[] {
    const compteurs = this.compteurs();
    const plurielS = (n: number) => (n > 1 ? 's' : '');
    switch (domaine) {
      case 'ventes': {
        const s = this.ventesStats();
        if (!s) return [];
        const liste: Indicateur[] = [];
        if (this.canViewFinancials)
          liste.push({
            domaine,
            libelle: 'Encaissé (validé)',
            valeur: new MoneyPipe().transform(s.totalPaiementsValides),
            aide: `Commissions payées : ${new MoneyPipe().transform(s.totalCommissionsPayees)}`,
            icone: LucideBanknote,
            route: '/ventes',
          });
        const enCours = Object.entries(s.dossiersParStatut)
          .filter(([statut]) => !['solde', 'annule'].includes(statut))
          .reduce((somme, [, nombre]) => somme + (nombre ?? 0), 0);
        const soldes = s.dossiersParStatut['solde'] ?? 0;
        liste.push({
          domaine,
          libelle: 'Dossiers de vente en cours',
          valeur: String(enCours),
          aide: `${soldes} soldé${plurielS(soldes)} sur ${s.totalDossiers}`,
          icone: LucideReceipt,
          route: '/ventes',
        });
        return liste;
      }
      case 'crm': {
        const s = this.crmStats();
        if (!s) return [];
        return [
          {
            domaine,
            libelle: 'Prospects suivis',
            valeur: String(s.totalProspects),
            aide: `${s.nouveaux} nouveau${s.nouveaux > 1 ? 'x' : ''} · ${s.upcomingTasksCount} action${plurielS(s.upcomingTasksCount)} à venir`,
            icone: LucideUserSearch,
            route: '/crm/prospects',
          },
        ];
      }
      case 'terrains': {
        const s = this.terrainStats();
        if (!s) return [];
        const aCompleter = s.sansGps + s.sansPhotoPublique;
        return [
          {
            domaine,
            libelle: 'Biens disponibles',
            valeur: String(s.parStatut['Disponible'] ?? 0),
            aide: aCompleter > 0 ? `${aCompleter} fiche${plurielS(aCompleter)} à compléter` : `sur ${s.total} bien${plurielS(s.total)}`,
            icone: LucideLandPlot,
            route: '/terrains',
          },
        ];
      }
      case 'mandats': {
        const s = this.mandatStats();
        if (!s) return [];
        return [
          {
            domaine,
            libelle: 'Mandats actifs',
            valeur: String(s.actifs),
            aide: s.expirant30Jours > 0 ? `${s.expirant30Jours} à renouveler sous 30 jours` : 'Aucune échéance proche',
            icone: LucideScrollText,
            route: '/mandats',
            ton: s.expirant30Jours > 0 ? 'alerte' : undefined,
          },
        ];
      }
      case 'locatif': {
        const s = this.locatifStats();
        if (!s) return [];
        const liste: Indicateur[] = [
          {
            domaine,
            libelle: 'Loyers en retard',
            valeur: String(s.echeancesEnRetard),
            aide: s.echeancesEnRetard > 0 ? `${s.biensEnRetard} bien${plurielS(s.biensEnRetard)} concerné${plurielS(s.biensEnRetard)}` : 'Tout est à jour',
            icone: LucideTriangleAlert,
            route: '/locatif/biens',
            ton: s.echeancesEnRetard > 0 ? 'alerte' : 'ok',
          },
          {
            domaine,
            libelle: 'Biens loués',
            valeur: String(s.loues),
            aide: `sur ${s.total} bien${plurielS(s.total)}`,
            icone: LucideBuilding2,
            route: '/locatif/biens',
            anneau: s.total > 0 ? Math.round((s.loues / s.total) * 100) : null,
          },
        ];
        const resiliations = compteurs.resiliations ?? 0;
        const relances = compteurs.relancesLocatives ?? 0;
        liste.push({
          domaine,
          libelle: 'Résiliations à traiter',
          valeur: String(resiliations),
          aide: resiliations > 0 ? 'Demandes de locataires en attente' : 'Aucune demande en attente',
          icone: LucideFileX,
          route: '/locatif/resiliations',
          ton: resiliations > 0 ? 'alerte' : undefined,
        });
        liste.push({
          domaine,
          libelle: 'Relances à envoyer',
          valeur: relances > 99 ? '99+' : String(relances),
          aide: relances > 0 ? 'Impayés à relancer' : 'Aucune relance en attente',
          icone: LucideMail,
          route: '/locatif/relances',
          ton: relances > 0 ? 'alerte' : undefined,
        });
        return liste;
      }
      case 'chantiers': {
        const s = this.chantierStats();
        if (!s) return [];
        const alertes = this.chantiersEnAlerte();
        return [
          {
            domaine,
            libelle: 'Chantiers actifs',
            valeur: String(s.chantiersActifs),
            aide: alertes > 0 ? `${alertes} en retard ou hors budget` : `${s.avancementMoyen} % d’avancement moyen`,
            icone: LucideHardHat,
            route: '/construction/chantiers',
            ton: alertes > 0 ? 'alerte' : undefined,
          },
        ];
      }
      case 'finances': {
        const saisies = compteurs.saisiesFinancieres ?? 0;
        const paiements = compteurs.paiementsAValider ?? 0;
        return [
          {
            domaine,
            libelle: 'Saisies à contrôler',
            valeur: String(saisies),
            aide: saisies > 0 ? 'Écritures en attente de contrôle' : 'Rien à contrôler',
            icone: LucideClipboardCheck,
            route: '/finances/operations',
            ton: saisies > 0 ? 'alerte' : undefined,
          },
          {
            domaine,
            libelle: 'Paiements à valider',
            valeur: String(paiements),
            aide: paiements > 0 ? 'Encaissements en attente' : 'Aucun paiement en attente',
            icone: LucideBadgeCheck,
            route: '/ventes',
            ton: paiements > 0 ? 'alerte' : undefined,
          },
        ];
      }
    }
  }

  /** Les quatre chiffres de l'accueil, ou `null` tant que les données des domaines concernés n'ont pas toutes répondu. */
  protected readonly indicateurs = computed<Indicateur[] | null>(() => {
    const domaines = this.domaines();
    const prets = this.domainesPrets();
    if (!domaines.every((domaine) => prets.has(domaine))) return null;
    const parDomaine = domaines.map((domaine) => this.candidats(domaine));
    const retenus: Indicateur[] = [];
    for (let rang = 0; retenus.length < NOMBRE_INDICATEURS; rang++) {
      let ajoute = false;
      for (const liste of parDomaine) {
        if (liste[rang] && retenus.length < NOMBRE_INDICATEURS) {
          retenus.push(liste[rang]);
          ajoute = true;
        }
      }
      if (!ajoute) break;
    }
    return retenus;
  });

  /** Chantiers qui dérapent, toutes natures d'alerte confondues : c'est ce chiffre qui appelle une action. */
  protected readonly chantiersEnAlerte = computed(() => {
    const parAlerte = this.chantierStats()?.parAlerte ?? {};
    return Object.entries(parAlerte)
      .filter(([code]) => code !== 'aucune')
      .reduce((somme, nombre) => somme + nombre[1], 0);
  });

  /** Les blocs de détail, deux au plus, dans l'ordre d'importance du métier. */
  protected readonly blocs = computed<Bloc[]>(() => {
    const retenus: Bloc[] = [];
    for (const domaine of this.domaines()) {
      const candidats: Bloc[] =
        domaine === 'ventes'
          ? this.canViewFinancials
            ? ['recents', 'encaissements']
            : ['recents']
          : domaine === 'crm'
            ? ['pipeline']
            : domaine === 'locatif'
              ? ['locatif']
              : domaine === 'chantiers'
                ? ['chantiers']
                : [];
      for (const bloc of candidats) if (!retenus.includes(bloc)) retenus.push(bloc);
    }
    return retenus.slice(0, NOMBRE_BLOCS);
  });

  /** Les points à traiter : l'urgent d'abord, puis le reste, cinq au plus. */
  protected readonly aTraiter = computed(() => {
    const items = this.feedItems() ?? [];
    return items.filter((i) => i.severity === 'danger').concat(items.filter((i) => i.severity !== 'danger'));
  });
  protected readonly urgents = computed(() => (this.feedItems() ?? []).filter((item) => item.severity === 'danger').length);
  protected readonly pointsVisibles = computed(() => this.aTraiter().slice(0, POINTS_VISIBLES));

  /** Encaissements validés des 6 derniers mois (vide sans droit financier). */
  protected readonly encaissementsChart = computed(() => {
    const series = this.ventesStats()?.encaissementsParMois ?? [];
    return series.some((point) => point.valeur > 0) ? monthlyBarChart(series, { unit: 'FCFA' }) : null;
  });

  /** Pipeline des prospects par étape : un anneau n'a de sens qu'avec au moins deux étapes. */
  protected readonly pipelineChart = computed(() => {
    const pipeline = this.crmStats()?.pipeline ?? {};
    return Object.values(pipeline).filter((value) => (value ?? 0) > 0).length > 1 ? donutChart(pipeline) : null;
  });
  protected readonly pipelineTotal = computed(() => Object.values(this.crmStats()?.pipeline ?? {}).reduce<number>((somme, valeur) => somme + (valeur ?? 0), 0));
  protected readonly crmPret = computed(() => this.crmStats() !== null);

  /** Ventes récentes : les cinq dernières. */
  protected readonly ventesRecentes = computed(() => (this.ventesStats()?.ventesRecentes ?? []).slice(0, 5));

  /** Blocs « gestion locative » et « chantiers » : quelques lignes de chiffres, sans graphique. */
  protected readonly lignesLocatif = computed(() => {
    const s = this.locatifStats();
    if (!s) return [];
    return [
      { libelle: 'Loyers encaissés ce mois', valeur: s.loyersEncaissesMois },
      { libelle: 'Encaissements à valider', valeur: s.encaissementsEnAttente },
      { libelle: 'Impayés au total', valeur: s.impayesTotal },
      { libelle: 'Dont impayés prolongés', valeur: s.impayesProlonges },
    ];
  });
  protected readonly lignesChantiers = computed(() => {
    const s = this.chantierStats();
    if (!s) return [];
    return [
      { libelle: 'Budget prévu', valeur: s.budgetPrevu },
      { libelle: 'Engagé', valeur: s.montantEngage },
      { libelle: 'Dépensé', valeur: s.montantDepense },
    ];
  });

  ngOnInit(): void {
    const demande = this.route.snapshot.queryParamMap.get('commercial');
    if (demande && this.session.hasPermission('rapports:consulter')) {
      this.commercialId.set(demande);
      this.vue.set('moi');
    } else {
      this.vue.set(this.vueInitiale());
    }
    this.feed
      .load()
      .pipe(catchError(() => of([] as FeedItem[])))
      .subscribe((items) => this.feedItems.set(items));

    const pret = (domaine: Domaine) => this.domainesPrets.update((ensemble) => new Set(ensemble).add(domaine));
    if (this.canViewVentes) {
      this.ventesApi.getDashboardStats().subscribe({
        next: (stats) => {
          this.ventesStats.set(stats);
          this.loadingVentes.set(false);
          pret('ventes');
        },
        error: () => {
          this.loadingVentes.set(false);
          pret('ventes');
        },
      });
    }
    if (this.canViewMandats) this.mandatsApi.getStats().subscribe({ next: (s) => { this.mandatStats.set(s); pret('mandats'); }, error: () => pret('mandats') });
    if (this.canViewTerrains) this.terrainsApi.getStats().subscribe({ next: (s) => { this.terrainStats.set(s); pret('terrains'); }, error: () => pret('terrains') });
    if (this.canViewCrm) this.crmApi.getStats().subscribe({ next: (s) => { this.crmStats.set(s); pret('crm'); }, error: () => pret('crm') });
    if (this.canViewLocatif) this.locatifApi.getStats().subscribe({ next: (s) => { this.locatifStats.set(s); pret('locatif'); }, error: () => pret('locatif') });
    if (this.canViewConstruction) this.constructionApi.getStats().subscribe({ next: (s) => { this.chantierStats.set(s); pret('chantiers'); }, error: () => pret('chantiers') });
    // Les chiffres des finances viennent des compteurs du menu, déjà chargés : rien à attendre.
    if (this.canViewFinances) pret('finances');
  }

  protected open(item: FeedItem): void {
    void this.router.navigate(item.route, { queryParams: item.queryParams });
  }

  protected goTo(path: string): void {
    void this.router.navigate([path]);
  }

  protected openVente(id: string): void {
    void this.router.navigate(['/ventes', id]);
  }

  protected venteStatusLabel(statut: string): string {
    return venteLabel(DOSSIER_STATUS, statut);
  }

  protected venteStatusPill(statut: string): string {
    return ventePill(DOSSIER_STATUS, statut);
  }

  protected greeting(): string {
    const hour = this.today.getHours();
    return hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  }

  protected ouvrirCommercial(id: string): void {
    this.commercialId.set(id);
    this.vue.set('moi');
  }

  protected choisirVue(vue: Vue): void {
    this.vue.set(vue);
    this.commercialId.set(undefined);
    try {
      localStorage.setItem('mtm.dashboard.vue', vue);
    } catch {
      /* stockage indisponible : le choix n'est simplement pas retenu */
    }
  }

  private vueInitiale(): Vue {
    const disponibles = this.vues().map((v) => v.code);
    try {
      const retenue = localStorage.getItem('mtm.dashboard.vue') as Vue | null;
      if (retenue && disponibles.includes(retenue)) return retenue;
    } catch {
      /* stockage indisponible */
    }
    return disponibles[0];
  }
}
