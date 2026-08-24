import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideBell,
  LucideBellOff,
  LucideChevronDown,
  LucideChevronRight,
  LucideDynamicIcon,
  LucideLogOut,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideSearch,
  LucideSettings,
  LucideUser,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { NAVIGATION_SECTIONS } from '../navigation-config';

interface Breadcrumb {
  section: string;
  label: string;
}

/**
 * En-tête applicatif : bascule du sidebar, fil d'Ariane (dérivé de la
 * configuration de navigation), recherche globale (raccourci Ctrl+K prêt),
 * notifications (structure prête pour les futurs flux) et menu profil.
 */
@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    LucideDynamicIcon,
    LucideBell,
    LucideBellOff,
    LucideChevronDown,
    LucideChevronRight,
    LucideLogOut,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    LucideSearch,
    LucideSettings,
    LucideUser,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  /** Sidebar replié (adapte l'icône de bascule). */
  readonly collapsed = input(false);

  /** Demande d'ouverture/fermeture du sidebar (géré par le shell). */
  readonly toggleSidenav = output<void>();

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly user = this.sessionService.user;

  /**
   * Compteur de notifications non lues. Activement à 0 : le composant est
   * prêt à recevoir les futurs flux (système, métier, alertes, tâches,
   * documents à valider) sans modification de structure.
   */
  protected readonly notificationCount = signal(0);

  /** Fil d'Ariane calculé depuis la navigation (section › module › sous-module). */
  protected readonly breadcrumb = signal<Breadcrumb | null>(null);

  protected readonly initials = computed(() => {
    const user = this.user();
    if (!user) return '';
    const first = user.firstName?.trim().charAt(0) ?? '';
    const last = user.lastName?.trim().charAt(0) ?? '';
    const result = `${first}${last}`.toUpperCase();
    return result || user.email.slice(0, 2).toUpperCase();
  });

  protected readonly fullName = computed(() => {
    const user = this.user();
    if (!user) return '';
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
  });

  protected readonly primaryRole = computed(
    () => this.user()?.roles?.[0]?.replace(/_/g, ' ').toUpperCase() ?? '',
  );

  protected readonly canAccessSettings = computed(() =>
    this.sessionService.hasPermission('settings:consulter'),
  );

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateBreadcrumb();
      }
    });
    this.updateBreadcrumb();
  }

  /** Raccourci clavier Ctrl+K / Cmd+K : focalise la recherche globale. */
  onSearchShortcut(event: Event): void {
    event.preventDefault();
    this.searchInput()?.nativeElement.focus();
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }

  private updateBreadcrumb(): void {
    const url = this.router.url.split('?')[0].split('#')[0];
    let match: Breadcrumb | null = null;

    for (const section of NAVIGATION_SECTIONS) {
      for (const item of section.items) {
        if (!this.matchesUrl(url, item.route)) continue;
        match = { section: section.title, label: item.label };
        for (const child of item.children ?? []) {
          if (this.matchesUrl(url, child.route)) {
            match = { section: `${section.title} · ${item.label}`, label: child.label };
          }
        }
      }
    }

    this.breadcrumb.set(match);
  }

  private matchesUrl(url: string, route: string): boolean {
    return url === route || url.startsWith(`${route}/`);
  }
}