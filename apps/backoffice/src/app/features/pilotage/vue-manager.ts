import { LucideBellRing, LucideOctagonAlert, LucideReceipt, LucideTarget } from '@lucide/angular';
import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PilotageApiService,
  type TableauManager,
} from '../../core/services/api/pilotage-api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa, presets, type PeriodePreset } from '../finances/finances-utils';
import { nombreFr } from '../../core/utils/format';

/**
 * Tableau de bord manager (maquette F, vue équipe) : activité de chaque
 * commercial, atteinte des objectifs, relances et tâches en retard, et dossiers
 * bloqués (sans mouvement depuis un délai que MTM règle dans Paramètres).
 */
@Component({
  selector: 'app-vue-manager',
  standalone: true,
  imports: [LucideBellRing, LucideOctagonAlert, LucideReceipt, LucideTarget, RouterLink],
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

  /** Total de l'équipe, en dernière ligne du tableau : ce que chacun apporte, et ce que cela fait ensemble. */
  protected readonly totauxEquipe = computed(() => {
    const equipe = this.donnees()?.equipe ?? [];
    const somme = (cle: 'prospectsActifs' | 'relancesEnRetard' | 'visitesEffectuees' | 'ventesSoldees' | 'chiffreAffaires' | 'commissionsEstimees' | 'tachesEnRetard') =>
      equipe.reduce((total, ligne) => total + ligne[cle], 0);
    return {
      prospectsActifs: somme('prospectsActifs'),
      relancesEnRetard: somme('relancesEnRetard'),
      visitesEffectuees: somme('visitesEffectuees'),
      ventesSoldees: somme('ventesSoldees'),
      chiffreAffaires: somme('chiffreAffaires'),
      commissionsEstimees: somme('commissionsEstimees'),
      tachesEnRetard: somme('tachesEnRetard'),
    };
  });

  ngOnInit(): void {
    this.charger();
  }

  protected choisir(periode: PeriodePreset): void {
    this.choix.set(periode);
    this.charger();
  }

  protected fcfa = fcfa;

  /** Un zéro s'écrit « — » dans le tableau : on voit d'un coup d'œil qui a produit quelque chose. */
  protected valeur(n: number): string {
    return n === 0 ? '—' : String(n);
  }

  protected montant(n: number): string {
    return n === 0 ? '—' : fcfa(n);
  }

  /** « Fallou Senghor » → « FS » : de quoi repérer une ligne sans lire le nom. */
  protected initiales(nom: string): string {
    const mots = nom.trim().split(/\s+/).filter(Boolean);
    const lettres = mots.length > 1 ? mots[0][0] + mots[mots.length - 1][0] : (mots[0] ?? '').slice(0, 2);
    return lettres.toUpperCase();
  }

  protected route(lien: string): string[] {
    return lien
      .split('/')
      .filter(Boolean)
      .map((partie, index) => (index === 0 ? `/${partie}` : partie));
  }

  protected tauxDit(taux: number | null): string {
    return taux === null ? '—' : `${nombreFr(taux, { maximumFractionDigits: 1 })} %`;
  }

  protected barre(taux: number | null): number {
    return Math.max(0, Math.min(100, taux ?? 0));
  }

  protected jours(n: number): string {
    return n <= 1 ? `${n} jour` : `${n} jours`;
  }

  private charger(): void {
    if (!this.chargementInitialFait) this.loading.set(true);
    const { du, au } = this.choix();
    this.api.manager(du, au).subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.finChargement();
      },
      error: (error: unknown) => {
        this.finChargement();
        this.notify.error(error, 'Impossible de charger le tableau de bord de l’équipe');
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
