import { LucideBellRing, LucideListChecks, LucideReceipt, LucideUserSearch } from '@lucide/angular';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  PilotageApiService,
  type TableauCommercial,
} from '../../core/services/api/pilotage-api.service';
import { donutChart } from '../../shared/charts/mtm-charts';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from '../finances/finances-utils';

/**
 * Tableau de bord commercial (maquette F) : mes prospects et mon pipeline, mes
 * relances, mes visites, mes ventes, mon objectif du mois, mes commissions, mes
 * tâches et mon agenda du jour. Un responsable peut ouvrir celui d'un commercial.
 */
@Component({
  selector: 'app-vue-commercial',
  standalone: true,
  imports: [
    LucideBellRing,
    LucideListChecks,
    LucideReceipt,
    LucideUserSearch,
    RouterLink,
    NgxEchartsDirective,
  ],
  templateUrl: './vue-commercial.html',
  styleUrl: './vue-pilotage.scss',
})
export class VueCommercial implements OnInit {
  private readonly api = inject(PilotageApiService);
  private readonly notify = inject(NotificationService);

  /** Vide : mon propre tableau. */
  readonly commercialId = input<string | undefined>(undefined);

  protected readonly loading = signal(true);
  protected readonly donnees = signal<TableauCommercial | null>(null);

  protected readonly graphiquePipeline = computed(() => {
    const pipeline = this.donnees()?.pipeline ?? {};
    return Object.values(pipeline).some((n) => n > 0) ? donutChart(pipeline) : null;
  });

  ngOnInit(): void {
    this.api.commercial(this.commercialId()).subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger votre tableau de bord');
      },
    });
  }

  protected fcfa = fcfa;

  protected route(lien: string): string[] {
    return lien
      .split('/')
      .filter(Boolean)
      .map((partie, index) => (index === 0 ? `/${partie}` : partie));
  }

  protected jour(valeur: string | null): string {
    return valeur
      ? new Date(valeur).toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : '';
  }

  protected heure(valeur: string): string {
    return new Date(valeur).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /** Largeur de la barre d'avancement, bornée à 100 % pour ne pas déborder. */
  protected barre(taux: number | null): number {
    return Math.max(0, Math.min(100, taux ?? 0));
  }
}
