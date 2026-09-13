import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Subject, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideBell,
  LucideBellOff,
  LucideChevronDown,
  LucideChevronRight,
  LucideLogOut,
  LucideMoon,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideSearch,
  LucideSettings,
  LucideSun,
  LucideUser,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ThemeService } from '../../core/services/theme.service';
import {
  GlobalSearchService,
  type GlobalSearchResult,
} from '../../core/services/global-search.service';
import {
  NotificationsFeedService,
  type FeedItem,
} from '../../core/services/notifications-feed.service';
import { NAVIGATION_SECTIONS } from '../navigation-config';

interface Breadcrumb {
  section: string;
  label: string;
}

/**
 * En-tête applicatif : bascule du sidebar, fil d'Ariane (dérivé de la
 * configuration de navigation), recherche globale (Ctrl+K, résultats
 * terrains / prospects / mandats / ventes), points d'attention métier et
 * menu profil.
 */
@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    LucideBell,
    LucideBellOff,
    LucideChevronDown,
    LucideChevronRight,
    LucideLogOut,
    LucideMoon,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    LucideSearch,
    LucideSettings,
    LucideSun,
    LucideUser,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  host: {
    '(document:keydown)': 'onSearchShortcut($event)',
  },
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly globalSearch = inject(GlobalSearchService);
  private readonly feedService = inject(NotificationsFeedService);

  /** Sidebar replié (adapte l'icône de bascule). */
  readonly collapsed = input(false);

  /** Demande d'ouverture/fermeture du sidebar (géré par le shell). */
  readonly toggleSidenav = output<void>();

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly user = this.sessionService.user;
  protected readonly isDark = this.themeService.isDark;

  /** Points d'attention (mandats à échéance, tâches en retard, demandes à traiter). */
  protected readonly feed = signal<FeedItem[]>([]);
  protected readonly notificationCount = computed(() => this.feed().length);

  // Recherche globale
  private readonly searchTerms = new Subject<string>();
  protected readonly searchTerm = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly searchLoading = signal(false);
  protected readonly searchResults = signal<GlobalSearchResult[]>([]);
  protected readonly activeIndex = signal(-1);
  protected readonly activeResult = computed(
    () => this.searchResults()[this.activeIndex()] ?? null,
  );
  protected readonly searchGroups = computed(() => {
    const groups = new Map<string, GlobalSearchResult[]>();
    for (const result of this.searchResults()) {
      groups.set(result.kindLabel, [...(groups.get(result.kindLabel) ?? []), result]);
    }
    return [...groups.entries()].map(([label, items]) => ({ label, items }));
  });

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

    this.searchTerms
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((term) => {
          this.searchLoading.set(term.trim().length >= 2);
          this.searchOpen.set(term.trim().length >= 2);
        }),
        switchMap((term) => this.globalSearch.search(term)),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.activeIndex.set(results.length ? 0 : -1);
        this.searchLoading.set(false);
      });

    // Fil chargé à l'ouverture de session puis rafraîchi toutes les 5 minutes.
    timer(0, 5 * 60_000)
      .pipe(
        switchMap(() => this.feedService.load()),
        takeUntilDestroyed(),
      )
      .subscribe((items) => this.feed.set(items));
  }

  protected refreshFeed(): void {
    this.feedService.load().subscribe((items) => this.feed.set(items));
  }

  protected openFeedItem(item: FeedItem): void {
    void this.router.navigate(
      item.route,
      item.queryParams ? { queryParams: item.queryParams } : undefined,
    );
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    if (value.trim().length < 2) {
      this.searchResults.set([]);
      this.searchOpen.set(false);
    }
    this.searchTerms.next(value);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const results = this.searchResults();
    if (event.key === 'Escape') {
      this.searchOpen.set(false);
      this.searchInput()?.nativeElement.blur();
      return;
    }
    if (!this.searchOpen() || results.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex.set((this.activeIndex() + delta + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const active = this.activeResult();
      if (active) this.openResult(active);
    }
  }

  protected onSearchBlur(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    const wrap = event.currentTarget as HTMLElement;
    if (!next || !wrap.contains(next)) this.searchOpen.set(false);
  }

  protected openResult(result: GlobalSearchResult): void {
    this.searchOpen.set(false);
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchInput()?.nativeElement.blur();
    void this.router.navigate(result.route);
  }

  /** Raccourci clavier Ctrl+K / Cmd+K : focalise la recherche globale. */
  onSearchShortcut(event: KeyboardEvent): void {
    if ((!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 'k') return;
    event.preventDefault();
    this.searchInput()?.nativeElement.focus();
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
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
