import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  LucideBanknote,
  LucideCalendarClock,
  LucideCircleCheck,
  LucideLayers,
  LucidePlus,
  LucideScrollText,
  LucideSearch,
  LucideTrendingUp,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { mtmGridTheme } from '../../../core/ag-grid.config';
import { SessionService } from '../../../core/services/session.service';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import type { MandatExpirant, MandatListItem, MandatOptions, MandatStats } from '../../../core/models/mandat.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ALERT_WINDOW_DAYS, MANDAT_STATUS, echeanceInfo, joursRestants, pillClass, statusHelp } from '../mandat-status';

const EMPTY_FILTERS = { search: '', statut: '', typeMandat: '' };

/**
 * Portefeuille des mandats (J1.4). L'écran met en avant ce qui demande une
 * action — les mandats qui expirent — puis le suivi financier des lots
 * confiés par les propriétaires.
 */
@Component({
  selector: 'app-mandats',
  imports: [
    MoneyPipe,
    DatePipe,
    ReactiveFormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideBanknote,
    LucideCalendarClock,
    LucideCircleCheck,
    LucideLayers,
    LucidePlus,
    LucideScrollText,
    LucideSearch,
    LucideTrendingUp,
    LucideX,
  ],
  templateUrl: './mandats.html',
  styleUrl: './mandats.scss',
})
export class Mandats implements OnInit {
  private readonly mandatsApi = inject(MandatsApiService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<MandatListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly stats = signal<MandatStats | null>(null);
  protected readonly expirants = signal<MandatExpirant[]>([]);
  protected readonly options = signal<MandatOptions>({ typeMandat: [], statut: [], statutLot: [], documentTypes: [] });
  protected readonly canCreate = computed(() => this.sessionService.hasPermission('mandats:creer'));
  protected readonly canModify = computed(() => this.sessionService.hasPermission('mandats:modifier'));
  protected readonly seesAll = computed(() => this.sessionService.hasSupervisionScope('mandats'));
  protected readonly filters = this.formBuilder.nonNullable.group(EMPTY_FILTERS);
  protected readonly hasActiveFilters = signal(false);
  protected readonly mandatStatus = MANDAT_STATUS;

  /** Lots vendus / total : lecture rapide de la performance du portefeuille. */
  protected readonly lotsVendus = computed(() => this.stats()?.lotsParStatut['Vendu'] ?? 0);

  protected readonly columnDefs: ColDef<MandatListItem>[] = [
    { field: 'referenceInterne', headerName: 'Réf.', flex: 0.7, minWidth: 96, sortable: true, cellClass: 'cell-strong' },
    {
      headerName: 'Propriétaire',
      flex: 1.4,
      minWidth: 160,
      valueGetter: (p) => [p.data?.proprietaire?.lastName, p.data?.proprietaire?.firstName].filter(Boolean).join(' '),
    },
    { field: 'typeMandat', headerName: 'Type', flex: 0.7, minWidth: 90, sortable: true },
    {
      headerName: 'Période',
      flex: 1.2,
      minWidth: 170,
      valueGetter: (p) => (p.data ? `${this.formatDate(p.data.dateDebut)} → ${this.formatDate(p.data.dateFin)}` : ''),
    },
    {
      headerName: 'Échéance',
      flex: 1,
      minWidth: 140,
      sortable: true,
      valueGetter: (p) => (p.data ? joursRestants(p.data.dateFin) : 0),
      cellRenderer: (p: ICellRendererParams<MandatListItem>) => {
        if (!p.data) return '';
        const info = echeanceInfo(p.data.dateFin, p.data.statut, p.data.alerteEcheanceJours);
        const span = document.createElement('span');
        span.className = info.tone === 'neutral' ? 'status-pill' : `status-pill status-pill--${info.tone}`;
        span.textContent = info.label;
        return span;
      },
    },
    {
      headerName: 'Lots',
      flex: 0.5,
      minWidth: 70,
      type: 'rightAligned',
      valueGetter: (p) => p.data?._count?.lots ?? 0,
    },
    {
      headerName: 'Exclusivité',
      flex: 0.7,
      minWidth: 100,
      cellDataType: 'text',
      valueGetter: (p) => (p.data?.exclusivite ? 'Exclusif' : 'Simple'),
    },
    {
      field: 'statut',
      headerName: 'Statut',
      flex: 0.8,
      minWidth: 110,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<MandatListItem>) => this.pill(p.value as string),
    },
    {
      headerName: '',
      colId: 'actions',
      width: 88,
      minWidth: 88,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<MandatListItem>) => this.actionsCell(params),
    },
  ];

  ngOnInit(): void {
    this.mandatsApi.getOptions().subscribe({ next: (options) => this.options.set(options) });
    this.mandatsApi.getStats().subscribe({ next: (stats) => this.stats.set(stats) });
    this.mandatsApi.getExpirants(ALERT_WINDOW_DAYS).subscribe({ next: (items) => this.expirants.set(items), error: () => this.expirants.set([]) });
    this.load();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  protected openCreate(): void {
    void this.router.navigate(['/mandats/nouveau']);
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/mandats', id]);
  }

  protected openEdit(id: string): void {
    void this.router.navigate(['/mandats', id, 'modifier']);
  }

  protected filterByStatus(statut: string): void {
    this.filters.patchValue({ ...EMPTY_FILTERS, statut });
  }

  protected resetFilters(): void {
    this.filters.reset(EMPTY_FILTERS);
  }

  protected joursRestants(mandat: MandatExpirant): number {
    return Math.max(0, joursRestants(mandat.dateFin));
  }

  protected pillClass(value: string): string {
    return pillClass(MANDAT_STATUS, value);
  }

  protected help(value: string): string {
    return statusHelp(MANDAT_STATUS, value);
  }

  private load(): void {
    this.loading.set(true);
    const value = this.filters.getRawValue();
    this.hasActiveFilters.set(Object.values(value).some((item) => item !== ''));
    this.mandatsApi.findAll({ search: value.search, statut: value.statut, pageSize: 200 }).subscribe({
      next: (page) => {
        const items = value.typeMandat ? page.items.filter((item) => item.typeMandat === value.typeMandat) : page.items;
        this.rowData.set(items);
        this.total.set(value.typeMandat ? items.length : page.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des mandats');
      },
    });
  }

  private formatDate(value: string): string {
    return value ? new Date(value).toLocaleDateString('fr-FR') : '—';
  }

  private pill(value: string | null): HTMLElement | string {
    if (!value) return '—';
    const span = document.createElement('span');
    span.className = pillClass(MANDAT_STATUS, value);
    span.textContent = value;
    span.title = statusHelp(MANDAT_STATUS, value);
    return span;
  }

  private actionsCell(params: ICellRendererParams<MandatListItem>): HTMLElement | string {
    if (!params.data) return '';
    const id = params.data.id;
    const container = document.createElement('div');
    container.className = 'row-actions';
    container.appendChild(
      this.iconButton(
        'Ouvrir la fiche',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.5 8.18 7.4 5 12 5s8.5 3.18 9.94 6.65a1 1 0 0 1 0 .7C20.5 15.82 16.6 19 12 19s-8.5-3.18-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></svg>',
        () => this.openDetail(id),
      ),
    );
    if (this.canModify()) {
      container.appendChild(
        this.iconButton(
          'Modifier',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
          () => this.openEdit(id),
        ),
      );
    }
    return container;
  }

  private iconButton(label: string, svg: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grid-icon-btn';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = svg;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }
}
