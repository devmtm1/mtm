import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { NavCompteursService, texteCompteur } from '../nav-compteurs.service';
import { NAVIGATION_SECTIONS, entreeCorrespond, type CompteurNavigation } from '../navigation-config';

/**
 * Onglets d'un sujet à plusieurs pages (les dossiers de vente, la gestion
 * locative, la comptabilité, les réglages…).
 *
 * Le menu latéral n'a qu'une ligne par sujet ; c'est ici que l'on passe d'une
 * page à l'autre du même sujet, sans retourner chercher dans le menu. Les
 * onglets viennent de `children` dans navigation-config.ts, filtrés par les
 * permissions de la personne, et s'effacent quand la page affichée n'est pas
 * l'un d'eux (la fiche d'un dossier, par exemple) ou qu'il n'en reste qu'un.
 */
@Component({
  selector: 'app-sous-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sous-navigation.html',
  styleUrl: './sous-navigation.scss',
})
export class SousNavigation {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly compteursService = inject(NavCompteursService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evenement) => evenement instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url.split('?')[0].split('#')[0]),
    ),
    { initialValue: this.router.url.split('?')[0].split('#')[0] },
  );

  private readonly compteurs = this.compteursService.compteurs;

  /** Le sujet affiché et ses onglets autorisés ; `null` quand il n'y a pas d'onglets à montrer. */
  protected readonly sujet = computed(() => {
    const url = this.url();
    for (const section of NAVIGATION_SECTIONS) {
      for (const item of section.items) {
        if (!item.children?.some((enfant) => entreeCorrespond(enfant, url))) continue;
        // Une fiche (/locatif/biens/<id>) a son propre en-tête et son bouton « Retour » : les onglets du sujet ne s'y
        // empilent pas devant. Ils ne figurent que sur les pages qui sont elles-mêmes un onglet.
        if (!item.children.some((enfant) => url.replace(/\/$/, '') === enfant.route)) return null;
        const onglets = item.children.filter(
          (enfant) => !enfant.permission || this.session.hasPermission(enfant.permission),
        );
        return onglets.length > 1 ? { titre: item.label, onglets } : null;
      }
    }
    return null;
  });

  /** Pastille d'un onglet : ce qui attend la personne sur cette page. */
  protected pastille(cle: CompteurNavigation | undefined): string | null {
    return cle ? texteCompteur(this.compteurs()[cle]) : null;
  }
}
