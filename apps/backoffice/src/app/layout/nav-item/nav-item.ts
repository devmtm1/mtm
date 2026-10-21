import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { type Compteurs, texteCompteur } from '../nav-compteurs.service';
import { sujetCorrespond, type CompteurNavigation, type NavItem as NavItemConfig } from '../navigation-config';

/**
 * Ligne du menu latéral : un lien, rien d'autre.
 *
 * Un sujet à plusieurs pages (`children`) n'est plus un groupe qui se déplie :
 * c'est une ligne qui ouvre sa première page, surlignée tant que l'on reste
 * dans le sujet ; les autres pages s'affichent en onglets dans l'écran.
 *
 * - État actif : fond léger, texte et icône dans la couleur principale.
 * - Mode replié : icône seule + tooltip ; un point signale ce qui attend.
 */
@Component({
  selector: 'app-nav-item',
  imports: [RouterLink, RouterLinkActive, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './nav-item.html',
  styleUrl: './nav-item.scss',
  host: {
    '[class.nav-collapsed]': 'collapsed()',
  },
})
export class NavItem implements OnInit {
  private readonly router = inject(Router);

  /** Configuration de l'item (voir navigation-config.ts). */
  readonly item = input.required<NavItemConfig>();

  /** Sidebar replié : icônes seules avec tooltips. */
  readonly collapsed = input(false);

  /** Ce qui attend la personne, par entrée (pastilles). */
  readonly compteurs = input<Compteurs>({});

  /** Émis lors d'un clic de navigation (fermeture du sidenav mobile). */
  readonly navigate = output<void>();

  /** Pastille de la ligne : celle de sa page, ou la somme de celles du sujet. */
  protected readonly pastille = computed(() => {
    const compteurs = this.compteurs();
    const item = this.item();
    const cles = [item.compteur, ...(item.children ?? []).map((enfant) => enfant.compteur)];
    const total = cles.reduce((somme, cle: CompteurNavigation | undefined) => somme + (cle ? (compteurs[cle] ?? 0) : 0), 0);
    return texteCompteur(total);
  });

  protected readonly hasChildren = computed(() => (this.item().children?.length ?? 0) > 0);

  /** Vrai quand la page affichée appartient au sujet (surbrillance de la ligne). */
  protected readonly sujetActif = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.mettreAJourSujet();
    });
  }

  ngOnInit(): void {
    // L'input requis est disponible après l'initialisation du composant.
    this.mettreAJourSujet();
  }

  private mettreAJourSujet(): void {
    if (!this.hasChildren()) {
      this.sujetActif.set(false);
      return;
    }
    const url = this.router.url.split('?')[0].split('#')[0];
    this.sujetActif.set(sujetCorrespond(this.item(), url));
  }
}
