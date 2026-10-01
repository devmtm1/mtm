import { Component, computed, inject, input, output } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { NAVIGATION_SECTIONS } from '../navigation-config';
import { NavItem } from '../nav-item/nav-item';

/**
 * Barre latérale principale : marque, navigation par sections (filtrée par
 * les permissions de la session) et pied sobre.
 *
 * La structure vient intégralement de `NAVIGATION_SECTIONS`
 * (voir navigation-config.ts) — aucun item codé en dur ici.
 */
@Component({
  selector: 'app-sidebar',
  imports: [NavItem],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: {
    '[class.sidebar--collapsed]': 'collapsed()',
  },
})
export class Sidebar {
  private readonly sessionService = inject(SessionService);

  /** Sidebar replié : icônes seules avec tooltips. */
  readonly collapsed = input(false);

  /** Émis lors d'un clic de navigation (fermeture du sidenav mobile). */
  readonly navigate = output<void>();

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
          return { ...item, children, route: children[0]?.route ?? item.route };
        })
        .filter((item) => (item.children ? item.children.length > 0 : allowed(item))),
    })).filter((section) => section.items.length > 0);
  });
}