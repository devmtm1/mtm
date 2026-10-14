import { LucideReceipt, LucideScale, LucideTrendingUp, LucideWallet } from '@lucide/angular';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  PilotageApiService,
  type TableauDirection,
} from '../../core/services/api/pilotage-api.service';
import {
  donutChart,
  donutLibelles,
  monthlyBarChart,
  revenuDepensesChart,
} from '../../shared/charts/mtm-charts';
import { NotificationService } from '../../shared/services/notification.service';
import {
  fcfa,
  presets,
  repartitionRevenu,
  comparaisonDite,
  variationDite,
  type PeriodePreset,
} from '../finances/finances-utils';

/**
 * Tableau de bord direction (maquette B) : chiffre d'affaires et revenu, ventes,
 * locations, démarches, chantiers, performances, alertes et tendances sur douze
 * mois — chaque chiffre comparé à la période précédente de même durée.
 */
@Component({
  selector: 'app-vue-direction',
  standalone: true,
  imports: [
    LucideReceipt,
    LucideScale,
    LucideTrendingUp,
    LucideWallet,
    RouterLink,
    NgxEchartsDirective,
  ],
  templateUrl: './vue-direction.html',
  styleUrl: './vue-pilotage.scss',
})
export class VueDirection implements OnInit {
  private readonly api = inject(PilotageApiService);
  private readonly notify = inject(NotificationService);

  protected readonly periodes = presets();
  protected readonly choix = signal<PeriodePreset>(this.periodes[0]);
  protected readonly loading = signal(true);
  protected readonly donnees = signal<TableauDirection | null>(null);

  protected readonly graphiqueFinances = computed(() => {
    const serie = this.donnees()?.tendances.finances ?? [];
    return serie.some((p) => p.revenu > 0 || p.depenses > 0) ? revenuDepensesChart(serie) : null;
  });

  protected readonly graphiqueVentes = computed(() => {
    const serie = this.donnees()?.tendances.ventes ?? [];
    return serie.some((p) => p.valeur > 0)
      ? monthlyBarChart(serie, { unit: 'count', color: '#5EA8C7' })
      : null;
  });

  protected readonly graphiqueRepartition = computed(() => {
    const parts = repartitionRevenu(this.donnees()?.finances.parActivite ?? []);
    return parts.length > 0 ? donutLibelles(parts) : null;
  });

  protected readonly graphiquePipeline = computed(() => {
    const pipeline = this.donnees()?.ventes.pipeline ?? {};
    return Object.values(pipeline).some((n) => n > 0) ? donutChart(pipeline) : null;
  });

  /** Alertes à afficher : les nombres nuls restent visibles, en gris, pour rassurer. */
  protected readonly alertes = computed(() => {
    const a = this.donnees()?.alertes;
    if (!a) return [];
    return [
      {
        titre: 'Dossiers bloqués',
        n: a.dossiersBloques,
        lien: ['/dashboard'],
        aide: 'Voir la vue Équipe',
      },
      {
        titre: 'Mandats à échéance (30 jours)',
        n: a.mandatsExpirant30Jours,
        lien: ['/mandats'],
        aide: 'À renouveler ou clore',
      },
      {
        titre: 'Impayés de loyer prolongés',
        n: a.impayesProlonges,
        lien: ['/locatif/relances'],
        aide: 'Plus de 30 jours de retard',
      },
      {
        titre: 'Chantiers en alerte',
        n: a.chantiersEnAlerte,
        lien: ['/construction/chantiers'],
        aide: 'En retard ou hors budget',
      },
      {
        titre: 'Commissions à valider',
        n: a.commissionsAValider,
        lien: ['/ventes'],
        aide: 'Estimées, en attente',
      },
      {
        titre: 'Saisies financières à valider',
        n: a.operationsAValider,
        lien: ['/finances/operations'],
        aide: 'Ne comptent pas encore',
      },
    ];
  });

  ngOnInit(): void {
    this.charger();
  }

  protected choisir(periode: PeriodePreset): void {
    this.choix.set(periode);
    this.charger();
  }

  protected fcfa = fcfa;
  protected variation = variationDite;
  protected comparaison = comparaisonDite;

  protected tendance(actuel: number, precedent: number): 'hausse' | 'baisse' | 'stable' {
    if (actuel === precedent) return 'stable';
    return actuel > precedent ? 'hausse' : 'baisse';
  }

  protected pct(valeur: number | null): string {
    return valeur === null
      ? '—'
      : `${valeur.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
  }

  protected barre(taux: number | null): number {
    return Math.max(0, Math.min(100, taux ?? 0));
  }

  private charger(): void {
    this.loading.set(true);
    const { du, au } = this.choix();
    this.api.direction(du, au).subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger le tableau de bord de la direction');
      },
    });
  }
}
