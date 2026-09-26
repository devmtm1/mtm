import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
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
  LucideHardHat,
  LucidePlus,
  LucideSearch,
  LucideTriangleAlert,
  LucideWallet,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { mtmGridTheme } from '../../../core/ag-grid.config';
import { SessionService } from '../../../core/services/session.service';
import { ConstructionApiService } from '../../../core/services/api/construction-api.service';
import type {
  ChantierListItem,
  ChantierOptions,
  ChantierStats,
} from '../../../core/models/chantier.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  METIERS,
  POSTES_BUDGET,
  SITUATIONS_ALERTE,
  STATUTS_CHANTIER,
  TYPES_PROJET,
  VUES_RAPIDES,
  label,
  montant,
  nomPersonne,
  pillClass,
  tonAvancement,
} from '../chantier-status';

const FILTRES_VIDES = {
  search: '',
  statut: '',
  typeProjet: '',
  situationAlerte: '',
  vue: '',
};

/**
 * Chantiers en construction (J2.3, section 16 CDC).
 *
 * L'écran répond à trois questions dans cet ordre : qu'est-ce qui dérape sur
 * les délais, qu'est-ce qui dérape sur l'argent, et où en est chaque chantier.
 * L'avancement est donc la colonne centrale — pas le statut, qui reste
 * « en cours » pendant un an et n'apprend rien.
 */
@Component({
  selector: 'app-chantiers',
  imports: [
    MoneyPipe,
    ReactiveFormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideHardHat,
    LucidePlus,
    LucideSearch,
    LucideTriangleAlert,
    LucideWallet,
    LucideX,
  ],
  templateUrl: './chantiers.html',
  styleUrl: './chantiers.scss',
})
export class Chantiers implements OnInit {
  private readonly api = inject(ConstructionApiService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<ChantierListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly stats = signal<ChantierStats | null>(null);
  protected readonly options = signal<Partial<ChantierOptions>>({});
  protected readonly vuesRapides = VUES_RAPIDES;
  protected readonly filters =
    this.formBuilder.nonNullable.group(FILTRES_VIDES);
  protected readonly hasActiveFilters = signal(false);

  protected readonly canCreate = computed(() =>
    this.sessionService.hasPermission('construction:creer'),
  );

  /**
   * Part du budget consommée sur l'ensemble des chantiers actifs : un
   * indicateur de tête, pas une moyenne de pourcentages qui donnerait le même
   * poids à une villa et à un mur de clôture.
   */
  protected readonly consommation = computed(() => {
    const s = this.stats();
    if (!s?.budgetPrevu) return 0;
    return Math.round((s.montantDepense / s.budgetPrevu) * 100);
  });

  /** Chantiers qui dérapent, toutes natures d'alerte confondues. */
  protected readonly enAlerte = computed(() => {
    const parAlerte = this.stats()?.parAlerte ?? {};
    return Object.entries(parAlerte)
      .filter(([code]) => code !== 'aucune')
      .reduce((somme, [, nombre]) => somme + nombre, 0);
  });

  protected readonly enRetard = computed(() => {
    const parAlerte = this.stats()?.parAlerte ?? {};
    return (parAlerte['retard'] ?? 0) + (parAlerte['retard_et_depassement'] ?? 0);
  });

  protected readonly budgetDepasse = computed(() => {
    const parAlerte = this.stats()?.parAlerte ?? {};
    return (
      (parAlerte['depassement_budget'] ?? 0) +
      (parAlerte['retard_et_depassement'] ?? 0)
    );
  });

  protected readonly columnDefs: ColDef<ChantierListItem>[] = [
    {
      // La référence sous l'intitulé : c'est par elle qu'on retrouve un
      // dossier papier, elle ne mérite pas une colonne à elle seule.
      headerName: 'Chantier',
      flex: 1.6,
      minWidth: 220,
      sortable: true,
      field: 'intitule',
      cellRenderer: (p: ICellRendererParams<ChantierListItem>) =>
        this.cellulePrincipale(
          p.data?.intitule ?? '—',
          p.data?.referenceInterne ?? '',
        ),
    },
    {
      headerName: 'Client',
      flex: 1.3,
      minWidth: 180,
      valueGetter: (p) =>
        [p.data?.client?.prenom, p.data?.client?.nom].filter(Boolean).join(' ') ||
        '—',
      cellRenderer: (p: ICellRendererParams<ChantierListItem>) =>
        this.cellulePrincipale(
          (p.value as string) ?? '—',
          this.localisation(p.data),
        ),
    },
    {
      // Le cœur de l'écran : une barre vaut mieux qu'un nombre, et sa couleur
      // porte l'alerte pour que l'œil la trouve sans lire la dernière colonne.
      headerName: 'Avancement',
      field: 'avancement',
      flex: 1.2,
      minWidth: 170,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<ChantierListItem>) =>
        this.celluleAvancement(p),
    },
    {
      headerName: 'Livraison prévue',
      field: 'dateFinPrevue',
      flex: 1,
      minWidth: 140,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<ChantierListItem>) =>
        this.celluleEcheance(p),
    },
    {
      // « Budget » seul est ambigu : on montre la dépense rapportée au
      // budget travaux, c'est cette proportion qui alerte.
      headerName: 'Dépensé / budget',
      flex: 1.1,
      minWidth: 160,
      sortable: true,
      field: 'montantDepense',
      cellRenderer: (p: ICellRendererParams<ChantierListItem>) =>
        this.celluleBudget(p),
    },
    {
      headerName: 'Statut',
      field: 'statut',
      width: 150,
      minWidth: 130,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<ChantierListItem>) =>
        this.pastille(STATUTS_CHANTIER, p.value as string),
    },
  ];

  ngOnInit(): void {
    this.api
      .getOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => this.options.set(options),
        error: () => this.options.set({}),
      });

    this.filters.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (a, b) => JSON.stringify(a) === JSON.stringify(b),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.charger());

    this.charger();
    this.chargerStats();
  }

  protected charger(): void {
    this.loading.set(true);
    const filtres = this.filters.getRawValue();
    this.hasActiveFilters.set(
      Object.values(filtres).some((valeur) => valeur !== ''),
    );

    this.api
      .findAll({ ...filtres, pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.rowData.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: () => {
          this.notify.error('Impossible de charger les chantiers');
          this.loading.set(false);
        },
      });
  }

  private chargerStats(): void {
    this.api
      .getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: () => this.stats.set(null),
      });
  }

  protected appliquerVue(vue: string): void {
    const courante = this.filters.controls.vue.value;
    this.filters.patchValue({ vue: courante === vue ? '' : vue });
  }

  protected filtrerParAlerte(code: string): void {
    const courante = this.filters.controls.situationAlerte.value;
    this.filters.patchValue({
      vue: '',
      situationAlerte: courante === code ? '' : code,
    });
  }

  protected resetFilters(): void {
    this.filters.reset(FILTRES_VIDES);
  }

  protected openCreate(): void {
    void this.router.navigate(['/construction/chantiers/nouveau']);
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/construction/chantiers', id]);
  }

  // --- Libellés utilisés par le gabarit ---

  protected statutLabel(code: string): string {
    return label(STATUTS_CHANTIER, code);
  }

  protected typeLabel(code: string): string {
    return label(TYPES_PROJET, code);
  }

  protected alerteLabel(code: string): string {
    return label(SITUATIONS_ALERTE, code);
  }

  protected metierLabel(code: string): string {
    return label(METIERS, code);
  }

  protected posteLabel(code: string): string {
    return label(POSTES_BUDGET, code);
  }

  /** Commune et région d'un chantier, sans virgule orpheline. */
  private localisation(chantier: ChantierListItem | undefined): string {
    if (!chantier) return '';
    return [chantier.commune, chantier.region].filter(Boolean).join(', ');
  }

  // --- Rendu des cellules ---

  private cellulePrincipale(valeur: string, precision: string): string {
    const echappe = (texte: string) =>
      texte.replace(
        /[&<>"]/g,
        (caractere) =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[
            caractere
          ] ?? caractere,
      );
    if (!precision) {
      return `<span class="cell-strong">${echappe(valeur)}</span>`;
    }
    return `<span class="cell-stack"><span class="cell-strong">${echappe(
      valeur,
    )}</span><small>${echappe(precision)}</small></span>`;
  }

  /** Barre d'avancement : la valeur, et sa couleur qui porte l'alerte. */
  private celluleAvancement(
    p: ICellRendererParams<ChantierListItem>,
  ): string {
    if (!p.data) return '';
    const pourcent = Math.min(100, Math.max(0, p.data.avancement));
    const ton = tonAvancement(p.data);
    return `<span class="cell-progress ${ton}">
      <span class="cell-progress__bar"><i style="width:${pourcent}%"></i></span>
      <span class="cell-progress__value">${pourcent} %</span>
    </span>`;
  }

  /**
   * Échéance, et son retard en clair. « Dans 3 jours » se comprend mieux
   * qu'une date qu'il faut comparer mentalement à aujourd'hui.
   */
  private celluleEcheance(p: ICellRendererParams<ChantierListItem>): string {
    if (!p.data?.dateFinPrevue) return '<span class="cell-muted">—</span>';
    const date = new Date(p.data.dateFinPrevue);
    const texte = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const jours = Math.floor(
      (date.getTime() - Date.now()) / (24 * 3600 * 1000),
    );
    const clos = ['receptionne', 'cloture', 'abandonne'].includes(
      p.data.statut,
    );
    if (clos) return `<span class="cell-muted">${texte}</span>`;
    if (jours < 0) {
      return `<span class="cell-stack"><span class="cell-strong">${texte}</span><small class="cell-late">${-jours} j de retard</small></span>`;
    }
    if (jours <= 14) {
      return `<span class="cell-stack"><span>${texte}</span><small class="cell-soon">dans ${jours} j</small></span>`;
    }
    return `<span>${texte}</span>`;
  }

  /** Dépensé sur budget : le rapport, pas deux nombres à rapprocher. */
  private celluleBudget(p: ICellRendererParams<ChantierListItem>): string {
    if (!p.data) return '';
    const depense = montant(p.data.montantDepense);
    const budget = montant(p.data.budgetPrevu);
    if (!budget && !depense) return '<span class="cell-muted">—</span>';
    const format = (valeur: number) =>
      `${Math.round(valeur / 1000).toLocaleString('fr-FR')} k`;
    if (!budget) {
      return `<span class="cell-stack"><span>${format(depense)}</span><small>hors budget défini</small></span>`;
    }
    const taux = Math.round((depense / budget) * 100);
    const classe = taux > 100 ? 'cell-late' : '';
    return `<span class="cell-stack"><span>${format(depense)} / ${format(
      budget,
    )}</span><small class="${classe}">${taux} % consommé</small></span>`;
  }

  private pastille(
    map: Record<string, { label: string }>,
    valeur: string | null | undefined,
  ): string {
    if (!valeur) return '';
    return `<span class="${pillClass(
      map as never,
      valeur,
    )}">${label(map as never, valeur)}</span>`;
  }

  protected nomResponsable(chantier: ChantierListItem): string {
    return nomPersonne(chantier.responsable);
  }
}
