import { Component, OnInit, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PilotageApiService, type TableauManager } from '../../core/services/api/pilotage-api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa, presets, type PeriodePreset } from '../finances/finances-utils';

/**
 * Tableau de bord manager (maquette F, vue équipe) : activité de chaque
 * commercial, atteinte des objectifs, relances et tâches en retard, et dossiers
 * bloqués (sans mouvement depuis un délai que MTM règle dans Paramètres).
 */
@Component({
  selector: 'app-vue-manager',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vue-manager.html',
  styleUrl: './vue-pilotage.scss',
})
export class VueManager implements OnInit {
  private readonly api = inject(PilotageApiService);
  private readonly notify = inject(NotificationService);

  /** Demande l'ouverture du tableau d'un commercial (le tableau de bord change de vue). */
  readonly ouvrir = output<string>();

  protected readonly periodes = presets().slice(0, 2);
  protected readonly choix = signal<PeriodePreset>(this.periodes[0]);
  protected readonly loading = signal(true);
  protected readonly donnees = signal<TableauManager | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  protected choisir(periode: PeriodePreset): void {
    this.choix.set(periode);
    this.charger();
  }

  protected fcfa = fcfa;

  protected route(lien: string): string[] {
    return lien
      .split('/')
      .filter(Boolean)
      .map((partie, index) => (index === 0 ? `/${partie}` : partie));
  }

  protected tauxDit(taux: number | null): string {
    return taux === null ? '—' : `${taux.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
  }

  protected barre(taux: number | null): number {
    return Math.max(0, Math.min(100, taux ?? 0));
  }

  protected jours(n: number): string {
    return n <= 1 ? `${n} jour` : `${n} jours`;
  }

  private charger(): void {
    this.loading.set(true);
    const { du, au } = this.choix();
    this.api.manager(du, au).subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger le tableau de bord de l’équipe');
      },
    });
  }
}
