import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import {
  LucideAlertTriangle,
  LucideArchive,
  LucideCamera,
  LucideCircleCheck,
  LucideColumns3,
  LucideEye,
  LucideGrid2X2,
  LucideLandPlot,
  LucideList,
  LucideMapPinOff,
  LucideMessageCircle,
  LucidePencil,
  LucidePhone,
  LucidePlus,
  LucideSearch,
  LucideSlidersHorizontal,
  LucideStar,
  LucideX,
} from '@lucide/angular';
import { forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { telLink, whatsappLink } from '../crm/crm-status';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { SessionService } from '../../core/services/session.service';
import { TerrainsApiService } from '../../core/services/api/terrains-api.service';
import type {
  TerrainListItem,
  TerrainOptions,
  TerrainQuery,
  TerrainStats,
} from '../../core/models/terrain.model';
import { NotificationService } from '../../shared/services/notification.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import {
  COMMERCIAL_STATUS,
  LEGAL_STATUS,
  TYPE_BIEN,
  VERIFICATION_STATUS,
  pillClass,
  statusHelp,
  typeBienLabel,
} from './terrain-status';

const EMPTY_FILTERS = {
  search: '',
  // Nature du bien : le catalogue mêle parcelles et villas, et un
  // commercial travaille le plus souvent sur l'une ou sur l'autre.
  typeBien: '',
  // Typologie d'un bien bâti : « on me demande un F3 ».
  nombrePieces: '',
  statutCommercial: '',
  statutJuridique: '',
  niveauVerification: '',
  // Portefeuille : les biens archivés n'encombrent jamais la liste courante.
  archivage: '',
  // Suivi repris du tableur historique.
  modalitePaiement: '',
  statutVisite: '',
  produitDirect: '',
  protocoleAccord: '',
  dateEntreeMin: '',
  dateEntreeMax: '',
  superficieMin: '',
  superficieMax: '',
  prixPublicMin: '',
  prixPublicMax: '',
};

/**
 * Colonnes facultatives du tableau : masquées par défaut pour ne pas
 * surcharger l'écran, activables à la demande (choix mémorisé par poste).
 */
const OPTIONAL_COLUMNS: { colId: string; label: string }[] = [
  { colId: 'parcelleMatricule', label: 'Matricule' },
  { colId: 'nombreLots', label: 'Nombre de lots' },
  { colId: 'dateEntree', label: 'Date d’entrée' },
  { colId: 'modalitePaiement', label: 'Modalité de paiement' },
  { colId: 'vendeur', label: 'Vendeur / mandataire' },
  { colId: 'telephone', label: 'Téléphone' },
  { colId: 'statutVisite', label: 'Visite' },
  { colId: 'produitDirect', label: 'Produit direct' },
  { colId: 'protocoleAccord', label: 'Protocole d’accord' },
];

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
    MatMenuModule,
    MatCheckboxModule,
    LucideAlertTriangle,
    LucideArchive,
    LucideCamera,
    LucideCircleCheck,
    LucideColumns3,
    LucideEye,
    LucideGrid2X2,
    LucideLandPlot,
    LucideList,
    LucideMapPinOff,
    LucideMessageCircle,
    LucidePencil,
    LucidePhone,
    LucidePlus,
    LucideSearch,
    LucideSlidersHorizontal,
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
  protected readonly options = signal<TerrainOptions>({
    statutJuridique: [],
    niveauVerification: [],
    statutCommercial: [],
    typeBien: [],
    nombrePieces: [],
    etatBien: [],
    typesBati: [],
    vocation: [],
    modalitePaiement: [],
    statutVisite: [],
  });
  protected readonly viewMode = signal<'table' | 'grid'>(this.restoreViewMode());
  protected readonly canCreate = computed(() => this.sessionService.hasPermission('terrains:creer'));
  protected readonly canModify = computed(() => this.sessionService.hasPermission('terrains:modifier'));
  protected readonly filters = this.formBuilder.nonNullable.group(EMPTY_FILTERS);
  protected readonly hasActiveFilters = signal(false);
  /** Filtres avancés repliés par défaut : sur téléphone, la recherche passe d'abord. */
  protected readonly showAdvanced = signal(false);
  protected readonly optionalColumns = OPTIONAL_COLUMNS;
  protected readonly visibleOptional = signal<string[]>(this.restoreColumns());
  private gridApi?: GridApi<TerrainListItem>;

  /** Nombre de fiches à compléter (GPS, photo publique ou vérification manquante). */
  protected readonly toComplete = computed(() => {
    const stats = this.stats();
    return stats ? stats.sansGps + stats.sansPhotoPublique : 0;
  });

  protected readonly columnDefs: ColDef<TerrainListItem>[] = [
    { field: 'referenceInterne', headerName: 'Réf.', flex: 0.6, minWidth: 84, sortable: true, cellClass: 'cell-strong' },
    { field: 'nom', headerName: 'Bien', flex: 1.6, minWidth: 170, sortable: true, tooltipField: 'nom' },
    { colId: 'parcelleMatricule', field: 'parcelleMatricule', headerName: 'Matricule', minWidth: 110, sortable: true, hide: true },
    { colId: 'nombreLots', field: 'nombreLots', headerName: 'Lots', minWidth: 80, type: 'rightAligned', sortable: true, hide: true, valueFormatter: (p) => (p.value == null ? '—' : String(p.value)) },
    {
      colId: 'dateEntree',
      field: 'dateEntree',
      headerName: 'Date d’entrée',
      minWidth: 124,
      sortable: true,
      hide: true,
      valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleDateString('fr-FR') : '—'),
    },
    { colId: 'modalitePaiement', field: 'modalitePaiement', headerName: 'Paiement', minWidth: 110, sortable: true, hide: true, valueFormatter: (p) => (p.value as string) || '—' },
    {
      colId: 'vendeur',
      headerName: 'Vendeur / mandataire',
      minWidth: 170,
      hide: true,
      valueGetter: (p) => (p.data ? this.vendeurNom(p.data) : ''),
      valueFormatter: (p) => (p.value as string) || '—',
    },
    {
      colId: 'telephone',
      headerName: 'Téléphone',
      minWidth: 130,
      hide: true,
      valueGetter: (p) => (p.data ? this.telephoneVendeur(p.data) : ''),
      valueFormatter: (p) => (p.value as string) || '—',
    },
    { colId: 'statutVisite', field: 'statutVisite', headerName: 'Visite', minWidth: 110, sortable: true, hide: true, valueFormatter: (p) => (p.value as string) || '—' },
    { colId: 'produitDirect', field: 'produitDirect', headerName: 'Direct', minWidth: 90, hide: true, valueFormatter: (p) => (p.value ? 'Oui' : '—') },
    { colId: 'protocoleAccord', field: 'protocoleAccord', headerName: 'Protocole', minWidth: 100, hide: true, valueFormatter: (p) => (p.value ? 'Oui' : '—') },
    {
      // Sans cette colonne, rien ne distingue une villa d'une parcelle dans
      // le tableau : la vue en cartes le montre, celle-ci l'ignorait.
      field: 'typeBien',
      headerName: 'Nature',
      flex: 0.8,
      minWidth: 104,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<TerrainListItem>) =>
        this.pill(TYPE_BIEN, p.value as string, typeBienLabel(p.value as string)),
    },
    {
      headerName: 'Localisation',
      flex: 1.1,
      minWidth: 130,
      valueGetter: (p) => (p.data ? this.formatLocation(p.data) : ''),
    },
    {
      field: 'superficie',
      // « Superficie » devenait ambigu dès qu'une villa entrait dans la
      // liste : c'est toujours la parcelle, jamais l'habitable.
      headerName: 'Parcelle',
      flex: 0.7,
      minWidth: 96,
      type: 'rightAligned',
      valueFormatter: (p) => (p.value == null ? '—' : `${Number(p.value).toLocaleString('fr-FR')} m²`),
    },
    {
      // Typologie et surface habitable, les deux chiffres qu'un commercial
      // cite au téléphone pour un bien bâti. Vide sur une parcelle nue.
      colId: 'habitable',
      headerName: 'Habitable',
      flex: 0.8,
      minWidth: 112,
      type: 'rightAligned',
      valueGetter: (p) => {
        if (!p.data || !this.estBati(p.data)) return '';
        const surface =
          p.data.surfaceHabitable == null
            ? null
            : `${Number(p.data.surfaceHabitable).toLocaleString('fr-FR')} m²`;
        return [p.data.nombrePieces, surface].filter(Boolean).join(' · ');
      },
      valueFormatter: (p) => (p.value ? String(p.value) : '—'),
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
      cellRenderer: (p: ICellRendererParams<TerrainListItem>) =>
        p.data?.archiveLe
          ? this.pill({ Archivé: { tone: 'neutral', help: 'Bien archivé : hors du portefeuille actif et du site public.' } }, 'Archivé')
          : this.pill(COMMERCIAL_STATUS, p.value as string),
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
    // Quitter une nature bâtie masque le filtre de typologie : s'il restait
    // armé, la liste continuerait de filtrer sur un critère devenu invisible.
    this.filters.controls.typeBien.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.batiSelectionne() && this.filters.controls.nombrePieces.value) {
          this.filters.controls.nombrePieces.setValue('');
        }
      });
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  protected onGridReady(event: GridReadyEvent<TerrainListItem>): void {
    this.gridApi = event.api;
    this.applyColumns();
  }

  protected toggleColumn(colId: string, visible: boolean): void {
    const next = visible
      ? [...new Set([...this.visibleOptional(), colId])]
      : this.visibleOptional().filter((id) => id !== colId);
    this.visibleOptional.set(next);
    try {
      localStorage.setItem('mtm.terrains.columns', JSON.stringify(next));
    } catch {
      /* stockage indisponible : le choix ne sera simplement pas mémorisé */
    }
    this.applyColumns();
  }

  private applyColumns(): void {
    const visibles = new Set(this.visibleOptional());
    this.gridApi?.setColumnsVisible(
      OPTIONAL_COLUMNS.map((c) => c.colId).filter((id) => visibles.has(id)),
      true,
    );
    this.gridApi?.setColumnsVisible(
      OPTIONAL_COLUMNS.map((c) => c.colId).filter((id) => !visibles.has(id)),
      false,
    );
  }

  private restoreColumns(): string[] {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('mtm.terrains.columns') ?? '[]');
      return Array.isArray(stored) ? stored.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }

  /** Mandataire propre au bien, à défaut le propriétaire. */
  protected vendeurNom(terrain: TerrainListItem): string {
    if (terrain.contactVendeurNom) return terrain.contactVendeurNom;
    const p = terrain.proprietaire;
    return p ? `${p.firstName} ${p.lastName}`.trim() : '';
  }

  protected telephoneVendeur(terrain: TerrainListItem): string {
    return terrain.contactVendeurTelephone || terrain.proprietaire?.phone || '';
  }

  protected tel(terrain: TerrainListItem): string | null {
    return telLink(this.telephoneVendeur(terrain));
  }

  protected whatsapp(terrain: TerrainListItem): string | null {
    return whatsappLink(this.telephoneVendeur(terrain));
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
    return (
      [terrain.commune, terrain.region].filter((value): value is string => Boolean(value)).join(', ') ||
      terrain.localisationDetail ||
      'Localisation non renseignée'
    );
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
  protected readonly typeBienMeanings = TYPE_BIEN;
  protected readonly typeBienLabel = typeBienLabel;

  /**
   * La typologie ne concerne que le bâti : elle n'apparaît qu'une fois une
   * villa, un appartement ou un local choisi. Même règle que le catalogue
   * public, pour que les deux écrans se lisent pareil.
   */
  protected batiSelectionne(): boolean {
    const type = this.filters.controls.typeBien.value;
    return Boolean(type) && type !== 'terrain';
  }

  /**
   * Le bien est-il construit ? La liste des types bâtis vient de l'API, pour
   * que la liste et le formulaire s'accordent sans la redéfinir ici.
   */
  protected estBati(terrain: { typeBien: string }): boolean {
    const types = this.options().typesBati;
    return types.length
      ? types.includes(terrain.typeBien)
      : terrain.typeBien !== 'terrain';
  }

  private load(): void {
    this.loading.set(true);
    const value = this.filters.getRawValue();
    this.hasActiveFilters.set(Object.values(value).some((item) => item !== ''));
    const query = { ...value, pageSize: 200 } as unknown as TerrainQuery;
    this.terrainsApi.findAll(query).subscribe({
      next: (page) => {
        this.total.set(page.total);
        const pages = Math.ceil(page.total / page.pageSize);
        if (pages <= 1) {
          this.rowData.set(page.items);
          this.loading.set(false);
          return;
        }
        // L'API plafonne une page à 200 biens : le portefeuille repris du
        // tableur en compte davantage, la liste se complète donc page par page
        // plutôt que de s'arrêter silencieusement à 200.
        forkJoin(
          Array.from({ length: pages - 1 }, (_, i) => this.terrainsApi.findAll({ ...query, page: i + 2 })),
        ).subscribe({
          next: (suite) => {
            this.rowData.set([...page.items, ...suite.flatMap((p) => p.items)]);
            this.loading.set(false);
          },
          error: (error: unknown) => {
            this.loading.set(false);
            this.notify.error(error, 'Erreur lors du chargement des terrains');
          },
        });
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

  /**
   * `libelle` sert aux référentiels dont le code n'est pas lisible tel quel :
   * la nature d'un bien est stockée en « villa » et s'affiche « Villa ».
   */
  private pill(
    map: Record<string, { tone: string; help: string }>,
    value: string | null,
    libelle?: string,
  ): HTMLElement | string {
    if (!value) return '—';
    const span = document.createElement('span');
    span.className = pillClass(map as never, value);
    span.textContent = libelle ?? value;
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
      const saved = localStorage.getItem('mtm.terrains.view');
      if (saved) return saved === 'grid' ? 'grid' : 'table';
      // Sur téléphone, un tableau de dix colonnes est illisible : cartes d'office.
      return typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table';
    } catch {
      return 'table';
    }
  }

  protected filterArchives(): void {
    this.filters.patchValue({ ...EMPTY_FILTERS, archivage: 'archives' });
  }
}
