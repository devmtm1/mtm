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
import { Subject, fromEvent, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap, throttleTime } from 'rxjs/operators';
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
  LucideBookOpen,
  LucideChevronDown,
  LucideChevronRight,
  LucideCircleQuestionMark,
  LucideLogOut,
  LucideMoon,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideSearch,
  LucideSettings,
  LucideShieldCheck,
  LucideSun,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ThemeService } from '../../core/services/theme.service';
import {
  GlobalSearchService,
  type GlobalSearchResult,
} from '../../core/services/global-search.service';
import { NotificationsApiService } from '../../core/services/api/notifications-api.service';
import {
  NotificationsFeedService,
  type FeedItem,
} from '../../core/services/notifications-feed.service';
import { entreeCorrespond, pagesNavigables } from '../navigation-config';

/** Sans accents ni majuscules : « Tresorerie » trouve « Trésorerie et caisse ». */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

const PAGES_PAR_RECHERCHE = 4;

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
    LucideBookOpen,
    LucideChevronDown,
    LucideChevronRight,
    LucideCircleQuestionMark,
    LucideLogOut,
    LucideMoon,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    LucideSearch,
    LucideSettings,
    LucideShieldCheck,
    LucideSun,
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
  private readonly notificationsApi = inject(NotificationsApiService);

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

  /**
   * Le guide du métier : chacun ouvre le sien (commercial, responsable commercial, administrateur) ;
   * les autres métiers ouvrent le guide complet.
   */
  protected readonly guideUrl = computed(() => {
    const roles = this.user()?.roles ?? [];
    if (roles.includes('administrateur')) return '/manuel/administrateur.html';
    if (roles.includes('responsable_commercial') || roles.includes('manager')) return '/manuel/responsable-commercial.html';
    if (roles.includes('commercial')) return '/manuel/commercial.html';
    return '/manuel/';
  });

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
        // Les pages d'abord (aller à « Trésorerie »), puis les dossiers trouvés.
        switchMap((term) =>
          this.globalSearch.search(term).pipe(map((results) => [...this.pagesCorrespondantes(term), ...results])),
        ),
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
        // Onglet caché : inutile de recharger, le fil se met à jour au retour sur l’onglet.
        filter(() => document.visibilityState === 'visible'),
        switchMap(() => this.feedService.load()),
        takeUntilDestroyed(),
      )
      .subscribe((items) => this.feed.set(items));

    // Retour sur l'onglet : le fil se met à jour tout de suite, sans attendre le prochain passage.
    fromEvent(document, 'visibilitychange')
      .pipe(
        filter(() => document.visibilityState === 'visible'),
        throttleTime(60_000),
        switchMap(() => this.feedService.load()),
        takeUntilDestroyed(),
      )
      .subscribe((items) => this.feed.set(items));
  }

  protected refreshFeed(): void {
    this.feedService.load().subscribe((items) => this.feed.set(items));
  }

  protected openFeedItem(item: FeedItem): void {
    if (item.notificationId) {
      // Ouvrir l'événement vaut accusé de lecture ; l'échec n'empêche pas la navigation.
      this.notificationsApi.markRead(item.notificationId).subscribe({ error: () => undefined });
      this.feed.update((items) => items.filter((entry) => entry.id !== item.id));
    }
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

  /** Pages du menu dont le nom correspond à la saisie, présentées comme des résultats « Pages ». */
  private pagesCorrespondantes(terme: string): GlobalSearchResult[] {
    if (terme.trim().length < 2) return [];
    const mots = normaliser(terme).split(/\s+/).filter(Boolean);
    return pagesNavigables()
      .filter((page) => !page.href && (!page.permission || this.sessionService.hasPermission(page.permission)))
      .filter((page) => {
        const texte = normaliser(`${page.label} ${page.section}`);
        return mots.every((mot) => texte.includes(mot));
      })
      .slice(0, PAGES_PAR_RECHERCHE)
      .map((page) => ({
        kind: 'page' as const,
        kindLabel: 'Pages',
        id: `page:${page.route}`,
        title: page.label,
        hint: page.section,
        route: [page.route],
      }));
  }

  private updateBreadcrumb(): void {
    const url = this.router.url.split('?')[0].split('#')[0];
    // La page la plus précise l'emporte (/ventes/objectifs et non /ventes), quel que
    // soit l'ordre du menu.
    const match =
      pagesNavigables()
        .filter((page) => entreeCorrespond(page, url))
        .sort((a, b) => b.route.length - a.route.length)[0] ?? null;
    this.breadcrumb.set(match ? { section: match.section, label: match.label } : null);
  }
}
