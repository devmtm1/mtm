import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  LucideClipboardCheck,
  LucideDownload,
  LucideMapPinned,
  LucidePlus,
  LucideSearch,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { mtmGridTheme } from '../../../core/ag-grid.config';
import { SessionService } from '../../../core/services/session.service';
import { DemarchesApiService } from '../../../core/services/api/demarches-api.service';
import type {
  MissionCollaborateur,
  MissionListItem,
  MissionOptions,
  MissionStats,
} from '../../../core/models/mission.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { JustificationDialog } from '../../../shared/dialogs/justification-dialog';
import { downloadBlob } from '../../../shared/utils/download';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  DECISIONS,
  ETAPES_TERMINALES,
  MISSION_ETAPES,
  TYPES_VERIFICATION,
  URGENCES,
  estEnRetard,
  label,
  nomPersonne,
  pillClass,
} from '../mission-status';

const FILTRES_VIDES = {
  search: '',
  statut: '',
  typeVerification: '',
  urgence: '',
  responsableId: '',
  vue: '',
};

/** Vues rapides de l'équipe démarches : ce qu'il faut regarder en premier. */
export const VUES_RAPIDES = [
  {
    value: 'en_cours',
    label: 'Missions en cours',
    help: 'Tout ce qui n’est ni clôturé ni abandonné.',
  },
  {
    value: 'en_retard',
    label: 'Échéance dépassée',
    help: 'La date promise au client est passée.',
  },
  {
    value: 'sans_responsable',
    label: 'Sans responsable',
    help: 'Personne ne porte la mission : à affecter.',
  },
  {
    value: 'a_rapporter',
    label: 'Rapport à rédiger',
    help: 'Vérifications faites, conclusion attendue.',
  },
];

/**
 * Missions de vérification foncière (J2.2, section 14 CDC).
 *
 * L'écran répond à trois questions : qu'est-ce qui attend une réponse, qu'est-ce
 * qui a dépassé sa date, et où en est chaque dossier.
 */
@Component({
  selector: 'app-missions',
  imports: [
    MoneyPipe,
    ReactiveFormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideClipboardCheck,
    LucideDownload,
    LucideMapPinned,
    LucidePlus,
    LucideSearch,
    LucideTriangleAlert,
    LucideX,
  ],
  templateUrl: './missions.html',
  styleUrl: './missions.scss',
})
export class Missions implements OnInit {
  private readonly api = inject(DemarchesApiService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<MissionListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly stats = signal<MissionStats | null>(null);
  protected readonly options = signal<Partial<MissionOptions>>({});
  protected readonly collaborateurs = signal<MissionCollaborateur[]>([]);
  protected readonly vuesRapides = VUES_RAPIDES;
  protected readonly filters = this.formBuilder.nonNullable.group(FILTRES_VIDES);
  protected readonly hasActiveFilters = signal(false);
  protected readonly canCreate = computed(() =>
    this.sessionService.hasPermission('demarches:creer'),
  );
  protected readonly canExport = computed(() =>
    this.sessionService.hasPermission('demarches:exporter'),
  );

  /** Étapes actives, hors clôture et abandon : la progression du service. */
  protected readonly parcours = computed(() => {
    const stats = this.stats();
    const etapes = this.options().statuts ?? [];
    if (!stats) return [];
    const actives = etapes.filter((etape) => !ETAPES_TERMINALES.includes(etape));
    const total = actives.reduce(
      (somme, etape) => somme + (stats.parEtape[etape] ?? 0),
      0,
    );
    return actives.map((etape) => ({
      etape,
      count: stats.parEtape[etape] ?? 0,
      share: total ? ((stats.parEtape[etape] ?? 0) / total) * 100 : 0,
    }));
  });

  protected readonly columnDefs: ColDef<MissionListItem>[] = [
    {
      // Référence sous le nom du client : à 110 px, elle était tronquée
      // (« V-2026-00… ») donc illisible, alors qu'elle sert à retrouver le
      // dossier.
      headerName: 'Client',
      flex: 1.4,
      minWidth: 190,
      sortable: true,
      valueGetter: (p) =>
        [p.data?.prospect?.prenom, p.data?.prospect?.nom].filter(Boolean).join(' ') || '—',
      cellRenderer: (p: ICellRendererParams<MissionListItem>) =>
        this.cellulePrincipale(
          (p.value as string) ?? '—',
          p.data?.referenceInterne ?? '',
        ),
    },
    {
      // Le terrain du catalogue quand il existe ; sinon la localisation
      // libre décrite par le client. La nature de la vérification passe en
      // seconde ligne : elle ne justifiait plus une colonne à elle seule.
      headerName: 'Terrain / localisation',
      flex: 1.6,
      minWidth: 200,
      valueGetter: (p) =>
        p.data?.terrain?.nom ??
        ([p.data?.localisation, p.data?.commune].filter(Boolean).join(', ') || '—'),
      cellRenderer: (p: ICellRendererParams<MissionListItem>) =>
        this.cellulePrincipale(
          (p.value as string) ?? '—',
          label(TYPES_VERIFICATION, p.data?.typeVerification ?? ''),
        ),
    },
    {
      headerName: 'Étape',
      field: 'statut',
      flex: 1.1,
      minWidth: 170,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<MissionListItem>) =>
        this.pastille(MISSION_ETAPES, p.value as string),
    },
    {
      headerName: 'Échéance',
      field: 'dateEcheance',
      flex: 1,
      minWidth: 150,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<MissionListItem>) => this.celluleEcheance(p),
    },
    {
      // Urgence et décision ne concernent qu'une minorité de lignes : une
      // cellule vide se lit mieux qu'une colonne de tirets.
      headerName: 'Urgence',
      field: 'urgence',
      width: 110,
      minWidth: 100,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<MissionListItem>) =>
        p.value === 'normale' || !p.value ? '' : this.pastille(URGENCES, p.value as string),
    },
    {
      headerName: 'Décision',
      field: 'decision',
      width: 130,
      minWidth: 120,
      cellRenderer: (p: ICellRendererParams<MissionListItem>) =>
        p.value ? this.pastille(DECISIONS, p.value as string) : '',
    },
    {
      headerName: 'Responsable',
      flex: 1,
      minWidth: 150,
      valueGetter: (p) => nomPersonne(p.data?.responsable ?? null),
      cellClass: (p) => (p.value === '—' ? 'cell-muted' : ''),
    },
  ];

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

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set({}),
    });
    this.api.getCollaborateurs().subscribe({
      next: (liste) => this.collaborateurs.set(liste),
      error: () => this.collaborateurs.set([]),
    });
    this.chargerStats();
    this.load();
    this.filters.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.load());
  }

  /**
   * Export CSV tracé : la liste contient les coordonnées de clients et le
   * détail de leurs missions, donc motif obligatoire et trace dans le
   * journal d'audit.
   */
  protected exportCsv(): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Exporter les missions',
      description:
        'L’export contient les clients, les localisations et les montants des missions. Indiquez le motif.',
      confirmLabel: 'Exporter en CSV',
    }).subscribe((justification) => {
      if (!justification) return;
      this.api.exportCsv(justification).subscribe({
        next: (blob) => {
          downloadBlob(blob, `verifications-${new Date().toISOString().slice(0, 10)}.csv`);
          this.notify.success('Export téléchargé');
        },
        error: (error: unknown) => this.notify.error(error, 'Export impossible'),
      });
    });
  }

  protected openCreate(): void {
    void this.router.navigate(['/demarches/missions/nouvelle']);
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/demarches/missions', id]);
  }

  protected appliquerVue(vue: string): void {
    this.filters.patchValue({
      ...FILTRES_VIDES,
      vue: this.filters.controls.vue.value === vue ? '' : vue,
    });
  }

  protected filtrerParEtape(statut: string): void {
    this.filters.patchValue({ ...FILTRES_VIDES, statut });
  }

  protected resetFilters(): void {
    this.filters.reset(FILTRES_VIDES);
  }

  protected etapeLabel(etape: string): string {
    return label(MISSION_ETAPES, etape);
  }

  protected typeLabel(type: string): string {
    return label(TYPES_VERIFICATION, type);
  }

  protected urgenceLabel(urgence: string): string {
    return label(URGENCES, urgence);
  }

  protected nomCollaborateur(personne: MissionCollaborateur): string {
    return nomPersonne(personne);
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
    this.api.findAll({ ...valeur, pageSize: 200 }).subscribe({
      next: (page) => {
        this.rowData.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des missions');
      },
    });
  }

  private pastille(
    map: Record<string, { label: string; help: string }>,
    valeur: string | null,
  ): HTMLElement | string {
    if (!valeur) return '—';
    const span = document.createElement('span');
    span.className = pillClass(
      map as Parameters<typeof pillClass>[0],
      valeur,
    );
    span.textContent = map[valeur]?.label ?? valeur;
    span.title = map[valeur]?.help ?? '';
    return span;
  }

  /** « 12/10/2026 » ou « En retard » quand la date promise est passée. */
  private celluleEcheance(
    params: ICellRendererParams<MissionListItem>,
  ): HTMLElement | string {
    const mission = params.data;
    if (!mission?.dateEcheance) return '—';
    const span = document.createElement('span');
    const date = new Date(mission.dateEcheance).toLocaleDateString('fr-FR');
    if (estEnRetard(mission)) {
      span.className = 'status-pill status-pill--danger';
      span.textContent = `En retard · ${date}`;
      span.title = 'L’échéance promise au client est dépassée.';
    } else {
      span.textContent = date;
    }
    return span;
  }
}
