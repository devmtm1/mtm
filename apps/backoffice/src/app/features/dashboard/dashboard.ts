import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  LucideCircleDollarSign,
  LucideHandshake,
  LucideReceipt,
  LucideScrollText,
  LucideTrendingUp,
  LucideWallet,
} from '@lucide/angular';
import { SessionService } from '../../core/services/session.service';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import { MandatsApiService } from '../../core/services/api/mandats-api.service';
import type { VenteDashboardStats } from '../../core/models/vente.model';
import type { MandatStats } from '../../core/models/mandat.model';

export interface CommercialPerformance {
  commercialId: string;
  totalDossiers: number;
  dossiersParStatut: Record<string, number>;
  totalPaiements: number;
  totalCommissionsPayees: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    LucideCircleDollarSign,
    LucideHandshake,
    LucideReceipt,
    LucideScrollText,
    LucideTrendingUp,
    LucideWallet,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly ventesApi = inject(VentesApiService);
  private readonly mandatsApi = inject(MandatsApiService);

  protected readonly user = this.session.user;
  protected readonly canViewVentes = this.session.hasPermission('ventes:consulter');
  protected readonly canViewMandats = this.session.hasPermission('mandats:consulter');

  protected readonly loadingVentes = signal(true);
  protected readonly loadingPerformance = signal(true);
  protected readonly loadingMandats = signal(true);
  protected readonly ventesStats = signal<VenteDashboardStats | null>(null);
  protected readonly myPerformance = signal<CommercialPerformance | null>(null);
  protected readonly mandatStats = signal<MandatStats | null>(null);

  ngOnInit(): void {
    if (this.canViewVentes) {
      this.ventesApi.getDashboardStats().subscribe({
        next: (stats) => { this.ventesStats.set(stats); this.loadingVentes.set(false); },
        error: () => this.loadingVentes.set(false),
      });
      const userId = this.user()?.id;
      if (userId) {
        this.ventesApi.getCommercialPerformance(userId).subscribe({
          next: (perf) => { this.myPerformance.set(perf as CommercialPerformance); this.loadingPerformance.set(false); },
          error: () => this.loadingPerformance.set(false),
        });
      } else {
        this.loadingPerformance.set(false);
      }
    } else {
      this.loadingVentes.set(false);
      this.loadingPerformance.set(false);
    }

    if (this.canViewMandats) {
      this.mandatsApi.getStats().subscribe({
        next: (stats) => { this.mandatStats.set(stats); this.loadingMandats.set(false); },
        error: () => this.loadingMandats.set(false),
      });
    } else {
      this.loadingMandats.set(false);
    }
  }

  protected formatMoney(value: number | string | null | undefined): string {
    return value === null || value === undefined ? '—' : `${Number(value).toLocaleString('fr-FR')} FCFA`;
  }

  protected openVente(id: string): void { this.router.navigate(['/ventes', id]); }
  protected goTo(path: string): void { this.router.navigate([path]); }
}
