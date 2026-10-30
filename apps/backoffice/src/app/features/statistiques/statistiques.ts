import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import { LucideEye, LucideFileText, LucideInbox, LucideUsers } from '@lucide/angular';
import {
  VisitesApiService,
  type LigneBien,
  type PeriodeVisites,
  type ResumeVisites,
} from '../../core/services/api/visites-api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { comparaisonCourte, tendanceDe } from '../finances/finances-utils';
import { LIBELLES_SOURCE, courbeJours, lienFiche } from './visites-utils';
import { nombreFr } from '../../core/utils/format';

const PERIODES: { jours: PeriodeVisites; label: string }[] = [
  { jours: 7, label: '7 jours' },
  { jours: 30, label: '30 jours' },
  { jours: 90, label: '90 jours' },
];

/**
 * Fréquentation du site public : visiteurs, pages vues, provenance, fiches les plus consultées, et
 * celles qui sont regardées sans qu'aucune demande n'arrive (à relancer, repositionner ou mieux présenter).
 */
@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [RouterLink, NgxEchartsDirective, LucideEye, LucideFileText, LucideInbox, LucideUsers],
  templateUrl: './statistiques.html',
  styleUrl: './statistiques.scss',
})
export class Statistiques implements OnInit {
  private readonly api = inject(VisitesApiService);
  private readonly notify = inject(NotificationService);

  protected readonly periodes = PERIODES;
  protected readonly periode = signal<PeriodeVisites>(30);
  protected readonly loading = signal(true);
  protected readonly erreur = signal(false);
  protected readonly resume = signal<ResumeVisites | null>(null);

  protected readonly courbe = computed(() => {
    const donnees = this.resume();
    if (!donnees || donnees.serie.every((point) => point.visites === 0 && point.pagesVues === 0))
      return null;
    return courbeJours(
      donnees.serie.map((point) => ({ jour: point.jour, a: point.visites, b: point.pagesVues })),
      { nomA: 'Visiteurs', nomB: 'Pages vues' },
    );
  });

  protected readonly sources = computed(() => {
    const liste = this.resume()?.sources ?? [];
    const total = liste.reduce((somme, ligne) => somme + ligne.visites, 0);
    return liste.map((ligne) => ({
      libelle: LIBELLES_SOURCE[ligne.source],
      visites: ligne.visites,
      part: total > 0 ? Math.round((ligne.visites / total) * 100) : 0,
    }));
  });

  /** Aucune visite comptée depuis l'ouverture du suivi : on l'explique plutôt que d'afficher des zéros muets. */
  protected readonly vide = computed(() => {
    const donnees = this.resume();
    return !!donnees && donnees.totaux.pagesVues === 0 && donnees.precedent.pagesVues === 0;
  });

  protected readonly tendanceDe = tendanceDe;
  protected readonly comparaison = comparaisonCourte;
  protected readonly lienFiche = lienFiche;

  private chargementInitialFait = false;

  ngOnInit(): void {
    this.charger();
  }

  protected choisirPeriode(jours: PeriodeVisites): void {
    if (jours === this.periode()) return;
    this.periode.set(jours);
    this.charger();
  }

  protected tauxDemande(ligne: LigneBien): string {
    return ligne.visiteurs > 0 ? `${Math.round((ligne.demandes / ligne.visiteurs) * 100)} %` : '—';
  }

  protected nombre(valeur: number): string {
    return nombreFr(valeur);
  }

  protected periodeLongue(): string {
    return this.periode() === 7 ? '7 derniers jours' : `${this.periode()} derniers jours`;
  }

  private charger(): void {
    // Le squelette ne s'affiche qu'au premier chargement : changer de période met l'écran à jour en place.
    if (!this.chargementInitialFait) this.loading.set(true);
    this.api.resume(this.periode()).subscribe({
      next: (donnees) => {
        this.resume.set(donnees);
        this.erreur.set(false);
        this.finChargement();
      },
      error: (error: unknown) => {
        this.erreur.set(true);
        this.finChargement();
        this.notify.error(error, 'Impossible de charger les statistiques');
      },
    });
  }

  private finChargement(): void {
    this.loading.set(false);
    this.chargementInitialFait = true;
  }
}
