import { Component, computed, effect, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Sidebar } from './sidebar/sidebar';
import { Header } from './header/header';

const SIDEBAR_COLLAPSED_KEY = 'mtm.sidebar-collapsed';

/**
 * Coquille applicative : assemble le sidebar et le header autour du contenu
 * routé. Détient uniquement l'état de mise en page (repli du sidebar,
 * mode responsive) — aucune logique métier.
 *
 * Responsive :
 * - ≥ 1024px : sidenav `side` permanent, repliable (icônes seules).
 * - < 1024px : sidenav `over` (overlay + backdrop), fermé après navigation.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, MatSidenavModule, Sidebar, Header],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);

  /** Sidebar compact (icônes seules) — persisté entre les sessions. */
  readonly collapsed = signal(Shell.readStoredCollapsed());

  /** Vue étroite : le sidebar devient un overlay. */
  private readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 1023px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly sidenavMode = computed(() => (this.isMobile() ? 'over' : 'side'));
  protected readonly sidenavOpened = signal(true);

  constructor() {
    // Desktop : ouvert ; mobile : fermé au basculement de breakpoint.
    effect(() => {
      this.sidenavOpened.set(!this.isMobile());
    });

    // Ferme l'overlay après chaque navigation sur petit écran.
    this.router.events
      .pipe(
        takeUntilDestroyed(),
        filter((event) => event instanceof NavigationEnd),
      )
      .subscribe(() => {
        if (this.isMobile()) {
          this.sidenavOpened.set(false);
        }
      });
  }

  protected toggleSidenav(): void {
    if (this.isMobile()) {
      this.sidenavOpened.update((opened) => !opened);
      return;
    }
    this.collapsed.update((value) => {
      Shell.persistCollapsed(!value);
      return !value;
    });
  }

  private static readStoredCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private static persistCollapsed(collapsed: boolean): void {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Stockage indisponible (navigation privée stricte...) : état non persisté.
    }
  }
}