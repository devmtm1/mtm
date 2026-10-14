import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { LucideChevronDown } from '@lucide/angular';
import { filter } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { NavCompteursService, texteCompteur } from '../nav-compteurs.service';
import { NAVIGATION_SECTIONS, type NavSection } from '../navigation-config';
import { NavItem } from '../nav-item/nav-item';

const CLE_STOCKAGE = 'mtm.menu.rubriques';

function lireEtat(): Record<string, boolean> {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    return brut ? (JSON.parse(brut) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * Barre latérale principale : marque, navigation par rubriques (filtrée par
 * les permissions de la session) et pied sobre.
 *
 * La structure vient intégralement de `NAVIGATION_SECTIONS`
 * (voir navigation-config.ts) — aucun item codé en dur ici.
 *
 * - une rubrique « repliable » (Administration, Site public) se replie d'un
 *   clic sur son titre ; le choix est retenu sur l'appareil, et la rubrique
 *   qui contient la page affichée s'ouvre toute seule ;
 * - des pastilles disent ce qui attend la personne (messages, paiements,
 *   relances…), y compris sur le titre d'une rubrique repliée.
 */
@Component({
  selector: 'app-sidebar',
  imports: [NavItem, LucideChevronDown],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: {
    '[class.sidebar--collapsed]': 'collapsed()',
  },
})
export class Sidebar implements OnInit {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly compteursService = inject(NavCompteursService);

  /** Sidebar replié : icônes seules avec tooltips. */
  readonly collapsed = input(false);

  /** Émis lors d'un clic de navigation (fermeture du sidenav mobile). */
  readonly navigate = output<void>();

  protected readonly compteurs = this.compteursService.compteurs;

  /** Rubriques repliées ou ouvertes par la personne ; absent = réglage d'origine. */
  private readonly choix = signal<Record<string, boolean>>(lireEtat());

  /** Rubriques ouvertes de force parce que la page affichée s'y trouve. */
  private readonly imposees = signal<Set<string>>(new Set());

  /** Sections filtrées selon les permissions de l'utilisateur connecté. */
  protected readonly sections = computed(() => {
    const allowed = (entry: { permission?: string }) =>
      !entry.permission || this.sessionService.hasPermission(entry.permission);
    return NAVIGATION_SECTIONS.map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (!item.children) return item;
          // Un groupe se réduit à ses enfants autorisés et disparaît s'il n'en reste aucun.
          const children = item.children.filter(allowed);
          // Un groupe qui n'a plus qu'un enfant devient un lien direct : un menu
          // déroulant pour une seule entrée ne sert qu'à faire un clic de plus.
          if (children.length === 1) {
            const [seul] = children;
            return { ...item, label: seul.label, route: seul.route, exact: seul.exact, children: undefined };
          }
          return { ...item, children, route: children[0]?.route ?? item.route };
        })
        .filter((item) => (item.children ? item.children.length > 0 : allowed(item))),
    })).filter((section) => section.items.length > 0);
  });

  ngOnInit(): void {
    this.compteursService.demarrer();
    this.ouvrirLaRubriqueCourante();
    this.router.events
      .pipe(
        filter((evenement) => evenement instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.ouvrirLaRubriqueCourante());
  }

  protected estOuverte(section: NavSection): boolean {
    if (!section.collapsible) return true;
    if (this.imposees().has(section.title)) return true;
    return this.choix()[section.title] ?? !section.defaultCollapsed;
  }

  protected basculer(section: NavSection): void {
    const ouverte = !this.estOuverte(section);
    this.choix.update((etat) => ({ ...etat, [section.title]: ouverte }));
    // Refermer une rubrique que la page affichée impose ne servirait à rien.
    if (!ouverte) {
      this.imposees.update((titres) => {
        const suite = new Set(titres);
        suite.delete(section.title);
        return suite;
      });
    }
    try {
      window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(this.choix()));
    } catch {
      /* stockage indisponible : le choix vaut pour la visite en cours */
    }
  }

  /** Pastille d'une rubrique repliée : la somme de ce qui attend dans ses entrées. */
  protected pastille(section: NavSection): string | null {
    const compteurs = this.compteurs();
    const total = section.items.reduce((somme, item) => {
      const propre = item.compteur ? (compteurs[item.compteur] ?? 0) : 0;
      const enfants = (item.children ?? []).reduce((s, enfant) => s + (enfant.compteur ? (compteurs[enfant.compteur] ?? 0) : 0), 0);
      return somme + propre + enfants;
    }, 0);
    return texteCompteur(total);
  }

  /** Arriver (lien direct, actualisation) sur une page d'une rubrique repliée l'ouvre. */
  private ouvrirLaRubriqueCourante(): void {
    const url = this.router.url.split('?')[0].split('#')[0];
    const titres = new Set<string>();
    for (const section of NAVIGATION_SECTIONS) {
      if (!section.collapsible) continue;
      const contient = section.items.some((item) =>
        [item, ...(item.children ?? [])].some((entree) => url === entree.route || url.startsWith(`${entree.route}/`)),
      );
      if (contient) titres.add(section.title);
    }
    this.imposees.set(titres);
  }
}
