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
  protected readonly sections = computed(() =>
    NAVIGATION_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || this.sessionService.hasPermission(item.permission),
      ),
    })).filter((section) => section.items.length > 0),
  );
}