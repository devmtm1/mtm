import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon, LucideChevronDown } from '@lucide/angular';
import type { NavItem as NavItemConfig } from '../navigation-config';

/**
 * Item de navigation du sidebar : lien simple ou groupe dépliable
 * (si `children` est renseigné dans la configuration).
 *
 * - État actif : fond violet léger + barre verticale (voir sidebar.scss).
 * - Mode replié : icône seule + tooltip ; un groupe navigue vers son
 *   premier enfant.
 */
@Component({
  selector: 'app-nav-item',
  imports: [RouterLink, RouterLinkActive, MatTooltipModule, LucideDynamicIcon, LucideChevronDown],
  templateUrl: './nav-item.html',
  styleUrl: './nav-item.scss',
  host: {
    '[class.nav-collapsed]': 'collapsed()',
  },
})
export class NavItem implements OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  /** Configuration de l'item (voir navigation-config.ts). */
  readonly item = input.required<NavItemConfig>();

  /** Sidebar replié : icônes seules avec tooltips. */
  readonly collapsed = input(false);

  /** Émis lors d'un clic de navigation (fermeture du sidenav mobile). */
  readonly navigate = output<void>();

  protected readonly hasChildren = computed(() => (this.item().children?.length ?? 0) > 0);
  protected readonly open = signal(true);

  /** Vrai si une route enfant est actuellement active (surbrillance du groupe). */
  protected readonly childActive = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateChildActive();
      }
    });
  }

  ngOnInit(): void {
    // L'input requis est disponible après l'initialisation du composant.
    this.updateChildActive();
  }

  protected toggleOpen(): void {
    // Groupe replié (sidebar compact) : naviguer vers le premier enfant.
    if (this.collapsed()) {
      const firstChild = this.item().children?.[0];
      if (firstChild) {
        void this.router.navigateByUrl(firstChild.route);
        this.navigate.emit();
      }
      return;
    }
    this.open.update((value) => !value);
  }

  private updateChildActive(): void {
    const children = this.item().children;
    if (!children?.length) {
      this.childActive.set(false);
      return;
    }
    const tree = this.activatedRoute.snapshot.pathFromRoot[0]?.url.join('/') ?? '';
    const base = tree ? `/${tree}` : '';
    this.childActive.set(
      children.some((child) =>
        this.router.isActive(base + child.route, {
          paths: 'subset',
          queryParams: 'subset',
          fragment: 'ignored',
          matrixParams: 'ignored',
        }),
      ),
    );
  }
}