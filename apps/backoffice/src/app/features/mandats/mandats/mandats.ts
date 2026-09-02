import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { LucideEye, LucideFileText, LucideGrid2X2, LucideList, LucidePencil, LucidePlus, LucideSearch } from '@lucide/angular';
import { mtmGridTheme } from '../../../core/ag-grid.config';
import { SessionService } from '../../../core/services/session.service';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import type { MandatListItem, MandatOptions, MandatPage, MandatStats } from '../../../core/models/mandat.model';

@Component({
  selector: 'app-mandats',
  imports: [DatePipe, ReactiveFormsModule, AgGridAngular, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, LucideEye, LucideFileText, LucideGrid2X2, LucideList, LucidePencil, LucidePlus, LucideSearch],
  templateUrl: './mandats.html',
  styleUrl: './mandats.scss',
})
export class Mandats implements OnInit {
  private readonly mandatsApi: MandatsApiService = inject(MandatsApiService);
  private readonly router: Router = inject(Router);
  private readonly sessionService: SessionService = inject(SessionService);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly formBuilder: FormBuilder = inject(FormBuilder);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<MandatListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly viewMode = signal<'table' | 'grid'>('table');
  protected readonly stats = signal<MandatStats>({ totalMandats: 0, actifs: 0, expirant30Jours: 0, totalLots: 0, lotsParStatut: {}, financial: { chiffreAffaires: 0, commissionsEstimees: 0, resteACommercialiser: 0 } });
  protected readonly options = signal<MandatOptions>({ typeMandat: [], statut: [], statutLot: [] });
  protected readonly canCreate = computed(() => this.sessionService.hasPermission('mandats:creer'));
  protected readonly canModify = computed(() => this.sessionService.hasPermission('mandats:modifier'));

  protected readonly filters = this.formBuilder.nonNullable.group({
    search: [''],
    statut: [''],
  });

  protected readonly columnDefs: ColDef<MandatListItem>[] = [
    { field: 'referenceInterne', headerName: 'Référence', flex: 1, minWidth: 130, sortable: true, filter: true },
    { field: 'proprietaire', headerName: 'Propriétaire', flex: 1.6, valueGetter: (p) => [p.data?.proprietaire?.lastName, p.data?.proprietaire?.firstName].filter(Boolean).join(' ') },
    { field: 'typeMandat', headerName: 'Type', flex: 1, sortable: true },
    { field: 'dateDebut', headerName: 'Début', flex: 1, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString('fr-FR') : '—' },
    { field: 'dateFin', headerName: 'Fin', flex: 1, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString('fr-FR') : '—' },
    { field: 'exclusivite', headerName: 'Exclusivité', flex: 0.8, valueFormatter: (p) => p.value ? 'Oui' : 'Non' },
    { field: 'statut', headerName: 'Statut', flex: 1, sortable: true },
    {
      headerName: 'Actions', flex: 0.8, minWidth: 100, sortable: false, filter: false,
      cellRenderer: (params: ICellRendererParams<MandatListItem>) => {
        if (!params.data) return '';
        const container = document.createElement('div');
        container.className = 'mandat-row-actions';
        const detail = document.createElement('button');
        detail.type = 'button';
        detail.className = 'grid-icon-btn';
        detail.title = 'Voir les détails';
        detail.setAttribute('aria-label', 'Voir les détails');
        detail.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.5 8.18 7.4 5 12 5s8.5 3.18 9.94 6.65a1 1 0 0 1 0 .7C20.5 15.82 16.6 19 12 19s-8.5-3.18-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></svg>';
        detail.addEventListener('click', () => this.openDetail(params.data!.id));
        container.appendChild(detail);
        if (this.canModify()) {
          const edit = document.createElement('button');
          edit.type = 'button';
          edit.className = 'grid-icon-btn';
          edit.title = 'Modifier le mandat';
          edit.setAttribute('aria-label', 'Modifier le mandat');
          edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
          edit.addEventListener('click', () => this.openEdit(params.data!.id));
          container.appendChild(edit);
        }
        return container;
      },
    },
  ];

  ngOnInit(): void { this.load(); this.loadStats(); this.loadOptions(); }

  protected applyFilters(): void { this.load(); }
  protected openCreate(): void { this.router.navigate(['/mandats/nouveau']); }
  protected openDetail(id: string): void { this.router.navigate(['/mandats', id]); }
  protected openEdit(id: string): void { this.router.navigate(['/mandats', id, 'modifier']); }
  protected setViewMode(mode: 'table' | 'grid'): void { this.viewMode.set(mode); }

  private load(): void {
    this.loading.set(true);
    this.mandatsApi.findAll(this.filters.getRawValue()).subscribe({
      next: (page: MandatPage) => { this.rowData.set(page.items); this.total.set(page.total); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Erreur lors du chargement des mandats', 'Fermer', { duration: 4000 }); },
    });
  }

  private loadStats(): void {
    this.mandatsApi.getStats().subscribe({
      next: (stats: MandatStats) => this.stats.set(stats),
      error: () => this.snackBar.open('Erreur lors du chargement des statistiques', 'Fermer', { duration: 4000 }),
    });
  }

  private loadOptions(): void {
    this.mandatsApi.getOptions().subscribe({
      next: (options: MandatOptions) => this.options.set(options),
      error: () => this.snackBar.open('Erreur lors du chargement des options', 'Fermer', { duration: 4000 }),
    });
  }

  protected formatMoney(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '—';
    const num = typeof value === 'string' ? Number(value) : value;
    return `${Number(num).toLocaleString('fr-FR')} FCFA`;
  }
}
