import { Injectable, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

/** Attente avant d'afficher la barre : une réponse rapide ne fait pas clignoter l'écran. */
export const DELAI_AFFICHAGE_MS = 150;
/** Une fois montrée, la barre reste au moins ce temps : elle ne « flashe » pas. */
export const DUREE_MINIMALE_MS = 350;

/**
 * Dit si l'application attend quelque chose : un changement d'écran ou une requête vers le serveur.
 * La barre de progression du haut de l'écran s'y branche. Sans elle, un clic ne montre rien tant que
 * l'écran n'est pas prêt, et l'on croit que l'application ne répond pas.
 *
 * Les requêtes de fond (compteurs du menu, fil de notifications) ne comptent pas : elles se font
 * sans que la personne ait rien demandé et ne doivent pas faire bouger la barre.
 */
@Injectable({ providedIn: 'root' })
export class ActiviteReseau {
  private readonly router = inject(Router);

  /** La barre est-elle visible ? */
  readonly visible = signal(false);

  private requetes = 0;
  private navigation = false;
  private silence = 0;
  private affichage: number | undefined;
  private masquage: number | undefined;
  private montreeDepuis = 0;

  constructor() {
    this.router.events.subscribe((evenement) => {
      if (evenement instanceof NavigationStart) this.changerNavigation(true);
      else if (evenement instanceof NavigationEnd || evenement instanceof NavigationCancel || evenement instanceof NavigationError) {
        this.changerNavigation(false);
      }
    });
  }

  /** Vrai pendant un chargement de fond : les requêtes lancées à ce moment ne comptent pas. */
  get enSilence(): boolean {
    return this.silence > 0;
  }

  debut(): void {
    this.requetes += 1;
    this.actualiser();
  }

  fin(): void {
    this.requetes = Math.max(0, this.requetes - 1);
    this.actualiser();
  }

  mettreEnSilence(): void {
    this.silence += 1;
  }

  finDeSilence(): void {
    this.silence = Math.max(0, this.silence - 1);
  }

  private changerNavigation(enCours: boolean): void {
    this.navigation = enCours;
    this.actualiser();
  }

  private actualiser(): void {
    const occupe = this.requetes > 0 || this.navigation;
    if (occupe) {
      window.clearTimeout(this.masquage);
      this.masquage = undefined;
      if (!this.visible() && this.affichage === undefined) {
        this.affichage = window.setTimeout(() => {
          this.affichage = undefined;
          this.montreeDepuis = Date.now();
          this.visible.set(true);
        }, DELAI_AFFICHAGE_MS);
      }
      return;
    }
    window.clearTimeout(this.affichage);
    this.affichage = undefined;
    if (this.visible() && this.masquage === undefined) {
      const reste = Math.max(0, DUREE_MINIMALE_MS - (Date.now() - this.montreeDepuis));
      this.masquage = window.setTimeout(() => {
        this.masquage = undefined;
        this.visible.set(false);
      }, reste);
    }
  }
}
