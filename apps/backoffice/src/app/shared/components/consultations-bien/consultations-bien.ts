import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { LucideEye } from '@lucide/angular';
import {
  VisitesApiService,
  type DetailBien,
  type TypeFiche,
} from '../../../core/services/api/visites-api.service';
import { SessionService } from '../../../core/services/session.service';
import { LIBELLES_SOURCE, courbeJours } from '../../../features/statistiques/visites-utils';

/**
 * « Consultations » d'une fiche (bien à vendre, location…) : combien de visiteurs l'ont ouverte sur le site
 * public et combien de demandes elle a reçues. Invisible sans le droit de consulter les statistiques.
 */
@Component({
  selector: 'app-consultations-bien',
  standalone: true,
  imports: [NgxEchartsDirective, LucideEye],
  templateUrl: './consultations-bien.html',
  styleUrl: './consultations-bien.scss',
})
export class ConsultationsBien implements OnChanges {
  private readonly api = inject(VisitesApiService);
  private readonly session = inject(SessionService);

  readonly type = input.required<TypeFiche>();
  readonly bienId = input.required<string>();

  protected readonly autorise = this.session.hasPermission('statistiques:consulter');
  protected readonly detail = signal<DetailBien | null>(null);
  protected readonly erreur = signal(false);
  protected readonly loading = signal(true);

  protected readonly courbe = computed(() => {
    const d = this.detail();
    if (!d || d.totaux.vues === 0) return null;
    return courbeJours(
      d.serie.map((point) => ({ jour: point.jour, a: point.visiteurs })),
      { nomA: 'Visiteurs', compact: true },
    );
  });

  protected readonly sourcePrincipale = computed(() => {
    const premiere = this.detail()?.sources[0];
    return premiere ? LIBELLES_SOURCE[premiere.source] : null;
  });

  private dernier: string | null = null;

  ngOnChanges(): void {
    if (!this.autorise) return;
    const cle = `${this.type()}:${this.bienId()}`;
    if (cle === this.dernier) return;
    this.dernier = cle;
    this.api.pourBien(this.type(), this.bienId(), 30).subscribe({
      next: (donnees) => {
        this.detail.set(donnees);
        this.loading.set(false);
      },
      // Un bloc d'information : s'il échoue, la fiche reste utilisable sans lui.
      error: () => {
        this.erreur.set(true);
        this.loading.set(false);
      },
    });
  }
}
