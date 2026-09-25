import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  LucideBellRing,
  LucideBuilding2,
  LucidePlus,
  LucideSearch,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { mtmGridTheme } from '../../../core/ag-grid.config';
import { SessionService } from '../../../core/services/session.service';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type { BienListItem, LocatifOptions, LocatifStats } from '../../../core/models/locatif.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  BIEN_STATUTS,
  SITUATIONS_PAIEMENT,
  TYPES_BIEN,
  label,
  nomPropre,
  pillClass,
  simpleLabel,
  type StatusMeaning,
} from '../locatif-status';

const FILTRES_VIDES = { search: '', statut: '', type: '', responsableId: '', vue: '' };

export const VUES_RAPIDES = [
  { value: 'loue', label: 'Loués', help: 'Un bail est actuellement en cours.' },
  { value: 'disponible', label: 'Disponibles', help: 'Prêts à être loués.' },
  { value: 'sans_responsable', label: 'Sans responsable', help: 'Personne ne porte le dossier.' },
  { value: 'loyers_en_retard', label: 'Loyers en retard', help: 'Au moins une échéance dépassée et non réglée.' },
  {
    value: 'impayes_prolonges',
    label: 'Impayés prolongés',
    help: 'Retard au-delà du seuil paramétré : cas particulier de la section 15.',
  },
];

@Component({
  selector: 'app-biens',
  imports: [
    MoneyPipe,
    ReactiveFormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideBellRing,
    LucideBuilding2,
    LucidePlus,
    LucideSearch,
    LucideTriangleAlert,
    LucideX,
  ],
  templateUrl: './biens.html',
  styleUrl: './biens.scss',
})
export class Biens implements OnInit {
  private readonly api = inject(LocatifApiService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<BienListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly stats = signal<LocatifStats | null>(null);
  protected readonly options = signal<Partial<LocatifOptions>>({});
  protected readonly vuesRapides = VUES_RAPIDES;
  protected readonly filters = this.formBuilder.nonNullable.group(FILTRES_VIDES);
  protected readonly hasActiveFilters = signal(false);
  /** Ce qu'il reste à envoyer dans la file de relances, dans mon périmètre. */
  protected readonly relancesAEnvoyer = signal(0);

  protected readonly canCreate = computed(() => this.sessionService.hasPermission('locatif:creer'));
  protected readonly canExport = computed(() => this.sessionService.hasPermission('locatif:exporter'));

  protected readonly columnDefs: ColDef<BienListItem>[] = [
    {
      headerName: 'Réf.',
      field: 'referenceInterne',
      width: 110,
      minWidth: 100,
      sortable: true,
    },
    {
      // Adresse et commune dans la même colonne : la commune répétait déjà
      // l'adresse sur la ligne d'à côté, pour deux colonnes au lieu d'une.
      headerName: 'Bien',
      flex: 1.6,
      minWidth: 210,
      valueGetter: (p) => p.data?.adresse ?? '—',
      cellRenderer: (p: ICellRendererParams<BienListItem>) =>
        this.cellulePrincipale(
          p.data?.adresse ?? '—',
          [p.data?.commune, p.data?.region].filter(Boolean).join(', '),
        ),
    },
    {
      headerName: 'Type',
      field: 'type',
      flex: 0.7,
      minWidth: 100,
      valueFormatter: (p) => simpleLabel(TYPES_BIEN, p.value as string),
    },
    {
      headerName: 'Propriétaire',
      flex: 1,
      minWidth: 140,
      valueGetter: (p) => nomPropre(p.data?.proprietaire),
    },
    {
      headerName: 'Locataire',
      flex: 1.1,
      minWidth: 150,
      valueGetter: (p) => {
        const bail = p.data?.baux?.[0];
        return bail ? nomPropre(bail.locataire) : '—';
      },
      cellRenderer: (p: ICellRendererParams<BienListItem>) => {
        const bail = p.data?.baux?.[0];
        if (!bail) return this.cellulePrincipale('—', 'Aucun bail en cours');
        return this.cellulePrincipale(nomPropre(bail.locataire), bail.referenceInterne ?? '');
      },
    },
    {
      headerName: 'Loyer',
      flex: 0.8,
      minWidth: 120,
      type: 'rightAligned',
      valueGetter: (p) => p.data?.baux?.[0]?.loyerMensuel ?? null,
      valueFormatter: (p) => (p.value ? `${Number(p.value).toLocaleString('fr-FR')} FCFA` : '—'),
    },
    {
      headerName: 'Statut',
      field: 'statut',
      flex: 0.8,
      minWidth: 120,
      cellRenderer: (p: ICellRendererParams<BienListItem>) =>
        this.pastille(BIEN_STATUTS, p.value as string),
    },
    {
      // La question quotidienne d'un gestionnaire : qui doit de l'argent.
      headerName: 'Paiement',
      flex: 0.9,
      minWidth: 130,
      valueGetter: (p) => p.data?.baux?.[0]?.situationPaiement ?? null,
      cellRenderer: (p: ICellRendererParams<BienListItem>) =>
        this.pastille(SITUATIONS_PAIEMENT, p.value as string),
    },
  ];

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set({}),
    });
    this.chargerStats();
    this.api.countRelances().subscribe({
      next: ({ aEnvoyer }) => this.relancesAEnvoyer.set(aEnvoyer),
      error: () => this.relancesAEnvoyer.set(0),
    });
    this.load();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)))
      .subscribe(() => this.load());
  }

  protected openCreate(): void {
    void this.router.navigate(['/locatif/biens/nouveau']);
  }

  protected ouvrirRelances(): void {
    void this.router.navigate(['/locatif/relances']);
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/locatif/biens', id]);
  }

  protected appliquerVue(vue: string): void {
    this.filters.patchValue({ ...FILTRES_VIDES, vue: this.filters.controls.vue.value === vue ? '' : vue });
  }

  protected resetFilters(): void {
    this.filters.reset(FILTRES_VIDES);
  }

  protected statutLabel(statut: string): string {
    return label(BIEN_STATUTS, statut);
  }

  protected typeLabel(type: string): string {
    return simpleLabel(TYPES_BIEN, type);
  }

  private chargerStats(): void {
    this.api.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.stats.set(null),
    });
  }

  private load(): void {
    this.loading.set(true);
    const valeur = this.filters.getRawValue();
    this.hasActiveFilters.set(Object.values(valeur).some((item) => item !== ''));
    this.api.findBiens({ ...valeur, pageSize: 200 }).subscribe({
      next: (page) => {
        this.rowData.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des biens');
      },
    });
  }

  private pastille(
    referentiel: Record<string, StatusMeaning>,
    valeur: string | null,
  ): HTMLElement | string {
    if (!valeur) return '—';
    const span = document.createElement('span');
    span.className = pillClass(referentiel, valeur);
    span.textContent = label(referentiel, valeur);
    span.title = referentiel[valeur]?.help ?? '';
    return span;
  }

  /** Valeur principale et sa précision en dessous, dans une seule cellule. */
  private cellulePrincipale(principal: string, secondaire: string): HTMLElement {
    const bloc = document.createElement('div');
    bloc.className = 'cell-stack';
    const titre = document.createElement('span');
    titre.className = 'cell-strong';
    titre.textContent = principal;
    bloc.appendChild(titre);
    if (secondaire) {
      const detail = document.createElement('small');
      detail.className = 'cell-muted';
      detail.textContent = secondaire;
      bloc.appendChild(detail);
    }
    return bloc;
  }
}
