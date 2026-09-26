import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  LucideArrowRight,
  LucideBanknote,
  LucideBuilding2,
  LucideCircleCheck,
  LucideHardHat,
  LucideLandPlot,
  LucideReceipt,
  LucideScrollText,
  LucideTarget,
  LucideUserSearch,
} from '@lucide/angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SessionService } from '../../core/services/session.service';
import { NotificationsFeedService, type FeedItem } from '../../core/services/notifications-feed.service';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import { MandatsApiService } from '../../core/services/api/mandats-api.service';
import { TerrainsApiService } from '../../core/services/api/terrains-api.service';
import { CrmApiService } from '../../core/services/api/crm-api.service';
import { ObjectifsApiService } from '../../core/services/api/objectifs-api.service';
import { LocatifApiService } from '../../core/services/api/locatif-api.service';
import { ConstructionApiService } from '../../core/services/api/construction-api.service';
import type { VenteDashboardStats } from '../../core/models/vente.model';
import type { MandatStats } from '../../core/models/mandat.model';
import type { TerrainStats } from '../../core/models/terrain.model';
import type { ProspectStats } from '../../core/models/prospect.model';
import type { LocatifStats } from '../../core/models/locatif.model';
import type { ChantierStats } from '../../core/models/chantier.model';
import { currentPeriode, type ObjectifProgress } from '../../core/models/objectif.model';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { donutChart, monthlyBarChart } from '../../shared/charts/mtm-charts';
import { DOSSIER_STATUS, label as venteLabel, pillClass as ventePill } from '../ventes/ventes-status';

export interface CommercialPerformance {
  commercialId: string;
  totalDossiers: number;
  dossiersParStatut: Record<string, number>;
  totalPaiements: number;
  totalCommissionsPayees: number;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * Tableau de bord : ce qu'il y a à faire aujourd'hui, l'état de chaque
 * module selon les droits, l'évolution de l'activité commerciale et la
 * performance personnelle du commercial connecté.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    MoneyPipe,
    DatePipe,
    MatButtonModule,
    MatTooltipModule,
    NgxEchartsDirective,
    LucideArrowRight,
    LucideBanknote,
    LucideBuilding2,
    LucideCircleCheck,
    LucideHardHat,
    LucideLandPlot,
    LucideReceipt,
    LucideScrollText,
    LucideTarget,
    LucideUserSearch,
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
  private readonly objectifsApi = inject(ObjectifsApiService);
  private readonly locatifApi = inject(LocatifApiService);
  private readonly constructionApi = inject(ConstructionApiService);

  protected readonly user = this.session.user;
  protected readonly canViewVentes = this.session.hasPermission('ventes:consulter');
  protected readonly canViewMandats = this.session.hasPermission('mandats:consulter');
  protected readonly canViewTerrains = this.session.hasPermission('terrains:consulter');
  protected readonly canViewCrm = this.session.hasPermission('crm:consulter');
  protected readonly canViewLocatif = this.session.hasPermission('locatif:consulter');
  protected readonly canViewConstruction = this.session.hasPermission('construction:consulter');
  protected readonly canViewFinancials = this.session.hasPermission('ventes:consulter_financier') || this.session.hasSupervisionScope('ventes');
  protected readonly isCommercial = this.session.hasRole('commercial') || this.session.hasRole('responsable_commercial') || this.session.hasRole('manager');

  protected readonly today = new Date();
  protected readonly monthLabel = `${MONTHS[this.today.getMonth()]} ${this.today.getFullYear()}`;
  protected readonly hasAnyModule = this.canViewVentes || this.canViewMandats || this.canViewTerrains || this.canViewCrm || this.canViewLocatif || this.canViewConstruction;

  protected readonly feedItems = signal<FeedItem[] | null>(null);
  protected readonly ventesStats = signal<VenteDashboardStats | null>(null);
  protected readonly mandatStats = signal<MandatStats | null>(null);
  protected readonly terrainStats = signal<TerrainStats | null>(null);
  protected readonly crmStats = signal<ProspectStats | null>(null);
  protected readonly locatifStats = signal<LocatifStats | null>(null);
  protected readonly chantierStats = signal<ChantierStats | null>(null);
  protected readonly myPerformance = signal<CommercialPerformance | null>(null);
  protected readonly myObjectif = signal<ObjectifProgress | null>(null);
  protected readonly loadingVentes = signal(this.canViewVentes);

  /**
   * Chantiers qui dérapent, toutes natures d'alerte confondues : c'est ce
   * chiffre qui appelle une action, pas le nombre de chantiers ouverts.
   */
  protected readonly chantiersEnAlerte = computed(() => {
    const parAlerte = this.chantierStats()?.parAlerte ?? {};
    return Object.entries(parAlerte)
      .filter(([code]) => code !== 'aucune')
      .reduce((somme, nombre) => somme + nombre[1], 0);
  });

  protected readonly urgent = computed(() => (this.feedItems() ?? []).filter((item) => item.severity === 'danger'));
  protected readonly others = computed(() => (this.feedItems() ?? []).filter((item) => item.severity !== 'danger'));
  protected readonly dossiersEnCours = computed(() => {
    const stats = this.ventesStats();
    if (!stats) return 0;
    return Object.entries(stats.dossiersParStatut).filter(([statut]) => !['solde', 'annule'].includes(statut)).reduce((sum, [, count]) => sum + (count ?? 0), 0);
  });

  /** Encaissements validés des 6 derniers mois (vide sans droit financier). */
  protected readonly encaissementsChart = computed(() => {
    const series = this.ventesStats()?.encaissementsParMois ?? [];
    return series.some((point) => point.valeur > 0) ? monthlyBarChart(series, { unit: 'FCFA' }) : null;
  });

  /** Nouveaux dossiers de vente par mois. */
  protected readonly dossiersChart = computed(() => {
    const series = this.ventesStats()?.dossiersParMois ?? [];
    return series.some((point) => point.valeur > 0) ? monthlyBarChart(series, { unit: 'count', color: '#5EA8C7' }) : null;
  });

  /** Répartition du portefeuille par statut de dossier. */
  protected readonly statutsChart = computed(() => {
    const distribution = this.ventesStats()?.dossiersParStatut ?? {};
    return Object.values(distribution).some((value) => (value ?? 0) > 0) ? donutChart(distribution) : null;
  });

  /** Pipeline CRM par étape. */
  protected readonly pipelineChart = computed(() => {
    const pipeline = this.crmStats()?.pipeline ?? {};
    return Object.values(pipeline).some((value) => (value ?? 0) > 0) ? donutChart(pipeline) : null;
  });

  ngOnInit(): void {
    this.feed
      .load()
      .pipe(catchError(() => of([] as FeedItem[])))
      .subscribe((items) => this.feedItems.set(items));

    if (this.canViewVentes) {
      this.ventesApi.getDashboardStats().subscribe({
        next: (stats) => {
          this.ventesStats.set(stats);
          this.loadingVentes.set(false);
        },
        error: () => this.loadingVentes.set(false),
      });
      const userId = this.user()?.id;
      if (userId && this.isCommercial) {
        this.ventesApi.getCommercialPerformance(userId).subscribe({ next: (perf) => this.myPerformance.set(perf as CommercialPerformance), error: () => this.myPerformance.set(null) });
        this.objectifsApi.getProgress(userId, currentPeriode()).subscribe({ next: (progress) => this.myObjectif.set(progress.objectif ? progress : null), error: () => this.myObjectif.set(null) });
      }
    }
    if (this.canViewMandats) this.mandatsApi.getStats().subscribe({ next: (stats) => this.mandatStats.set(stats), error: () => this.mandatStats.set(null) });
    if (this.canViewTerrains) this.terrainsApi.getStats().subscribe({ next: (stats) => this.terrainStats.set(stats), error: () => this.terrainStats.set(null) });
    if (this.canViewCrm) this.crmApi.getStats().subscribe({ next: (stats) => this.crmStats.set(stats), error: () => this.crmStats.set(null) });
    if (this.canViewLocatif) this.locatifApi.getStats().subscribe({ next: (stats) => this.locatifStats.set(stats), error: () => this.locatifStats.set(null) });
    if (this.canViewConstruction) this.constructionApi.getStats().subscribe({ next: (stats) => this.chantierStats.set(stats), error: () => this.chantierStats.set(null) });
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

  protected barValue(taux: number | null): number {
    return taux === null ? 0 : Math.min(100, taux);
  }

  protected greeting(): string {
    const hour = this.today.getHours();
    return hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  }
}
