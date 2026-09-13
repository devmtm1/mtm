import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  LucideAlertTriangle,
  LucideCamera,
  LucideCircleCheck,
  LucideEye,
  LucideGrid2X2,
  LucideLandPlot,
  LucideList,
  LucideMapPinOff,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideStar,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { SessionService } from '../../core/services/session.service';
import { TerrainsApiService } from '../../core/services/api/terrains-api.service';
import type { TerrainListItem, TerrainOptions, TerrainStats } from '../../core/models/terrain.model';
import { NotificationService } from '../../shared/services/notification.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import {
  COMMERCIAL_STATUS,
  LEGAL_STATUS,
  VERIFICATION_STATUS,
  pillClass,
  statusHelp,
} from './terrain-status';

const EMPTY_FILTERS = { search: '', statutCommercial: '', statutJuridique: '', niveauVerification: '' };

/**
 * Liste des terrains (J1.1). L'écran répond à trois questions : combien de
 * terrains sont réellement proposés à la vente, lesquels demandent une
 * action (fiche incomplète), et où trouver un terrain précis.
 */
@Component({
  selector: 'app-terrains',
  imports: [
    MoneyPipe,
    ReactiveFormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideAlertTriangle,
    LucideCamera,
    LucideCircleCheck,
    LucideEye,
    LucideGrid2X2,
    LucideLandPlot,
    LucideList,
    LucideMapPinOff,
    LucidePencil,
    LucidePlus,
    LucideSearch,
    LucideStar,
    LucideX,
  ],
  templateUrl: './terrains.html',
  styleUrl: './terrains.scss',
})
export class Terrains implements OnInit {
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly money = new MoneyPipe();

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<TerrainListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly stats = signal<TerrainStats | null>(null);
  protected readonly options = signal<TerrainOptions>({ statutJuridique: [], niveauVerification: [], statutCommercial: [] });
  protected readonly viewMode = signal<'table' | 'grid'>(this.restoreViewMode());
  protected readonly canCreate = computed(() => this.sessionService.hasPermission('terrains:creer'));
  protected readonly canModify = computed(() => this.sessionService.hasPermission('terrains:modifier'));
  protected readonly filters = this.formBuilder.nonNullable.group(EMPTY_FILTERS);
  protected readonly hasActiveFilters = signal(false);

  /** Nombre de fiches à compléter (GPS, photo publique ou vérification manquante). */
  protected readonly toComplete = computed(() => {
    const stats = this.stats();
    return stats ? stats.sansGps + stats.sansPhotoPublique : 0;
  });

  protected readonly columnDefs: ColDef<TerrainListItem>[] = [
    { field: 'referenceInterne', headerName: 'Réf.', flex: 0.6, minWidth: 84, sortable: true, cellClass: 'cell-strong' },
    { field: 'nom', headerName: 'Terrain', flex: 1.6, minWidth: 170, sortable: true, tooltipField: 'nom' },
    {
      headerName: 'Localisation',
      flex: 1.1,
      minWidth: 130,
      valueGetter: (p) => (p.data ? this.formatLocation(p.data) : ''),
    },
    {
      field: 'superficie',
      headerName: 'Superficie',
      flex: 0.7,
      minWidth: 96,
      type: 'rightAligned',
      valueFormatter: (p) => (p.value == null ? '—' : `${Number(p.value).toLocaleString('fr-FR')} m²`),
    },
    {
      field: 'prixPublic',
      headerName: 'Prix public',
      flex: 1,
      minWidth: 128,
      type: 'rightAligned',
      valueFormatter: (p) => this.money.transform(p.value as number | string | null),
    },
    {
      field: 'statutCommercial',
      headerName: 'Statut',
      flex: 0.9,
      minWidth: 118,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<TerrainListItem>) => this.pill(COMMERCIAL_STATUS, p.value as string),
    },
    {
      field: 'statutJuridique',
      headerName: 'Juridique',
      flex: 1,
      minWidth: 130,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<TerrainListItem>) => this.pill(LEGAL_STATUS, p.value as string),
    },
    {
      field: 'niveauVerification',
      headerName: 'Vérification',
      flex: 0.8,
      minWidth: 108,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<TerrainListItem>) => this.pill(VERIFICATION_STATUS, p.value as string),
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
      cellRenderer: (params: ICellRendererParams<TerrainListItem>) => this.actionsCell(params),
    },
  ];

  ngOnInit(): void {
    this.terrainsApi.getOptions().subscribe({ next: (options) => this.options.set(options) });
    this.loadStats();
    this.load();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  protected openCreate(): void {
    void this.router.navigate(['/terrains/nouveau']);
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/terrains', id]);
  }

  protected openEdit(id: string): void {
    void this.router.navigate(['/terrains', id, 'modifier']);
  }

  protected setViewMode(mode: 'table' | 'grid'): void {
    this.viewMode.set(mode);
    try {
      localStorage.setItem('mtm.terrains.view', mode);
    } catch {
      /* stockage indisponible : le choix ne sera simplement pas mémorisé */
    }
  }

  /** Raccourci depuis une tuile : applique un filtre en un clic. */
  protected filterByStatus(statutCommercial: string): void {
    this.filters.patchValue({ ...EMPTY_FILTERS, statutCommercial });
  }

  protected resetFilters(): void {
    this.filters.reset(EMPTY_FILTERS);
  }

  protected formatLocation(terrain: TerrainListItem): string {
    return [terrain.commune, terrain.region].filter((value): value is string => Boolean(value)).join(', ') || 'Localisation non renseignée';
  }

  protected thumbnail(terrain: TerrainListItem): string | null {
    return terrain.medias?.find((media) => media.type === 'photo' && media.isPublic)?.secureUrl ?? null;
  }

  protected pillClass(map: Record<string, { tone: string }>, value: string): string {
    return pillClass(map as never, value);
  }

  protected help(map: Record<string, { help: string }>, value: string): string {
    return statusHelp(map as never, value);
  }

  protected readonly commercialStatus = COMMERCIAL_STATUS;
  protected readonly legalStatus = LEGAL_STATUS;
  protected readonly verificationStatus = VERIFICATION_STATUS;

  private load(): void {
    this.loading.set(true);
    const value = this.filters.getRawValue();
    this.hasActiveFilters.set(Object.values(value).some((item) => item !== ''));
    this.terrainsApi.findAll({ ...value, pageSize: 200 }).subscribe({
      next: (page) => {
        this.rowData.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des terrains');
      },
    });
  }

  private loadStats(): void {
    this.terrainsApi.getStats().subscribe({ next: (stats) => this.stats.set(stats) });
  }

  private pill(map: Record<string, { tone: string; help: string }>, value: string | null): HTMLElement | string {
    if (!value) return '—';
    const span = document.createElement('span');
    span.className = pillClass(map as never, value);
    span.textContent = value;
    span.title = statusHelp(map as never, value);
    return span;
  }

  private actionsCell(params: ICellRendererParams<TerrainListItem>): HTMLElement | string {
    if (!params.data) return '';
    const id = params.data.id;
    const container = document.createElement('div');
    container.className = 'terrain-row-actions';
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

  private restoreViewMode(): 'table' | 'grid' {
    try {
      return localStorage.getItem('mtm.terrains.view') === 'grid' ? 'grid' : 'table';
    } catch {
      return 'table';
    }
  }
}
