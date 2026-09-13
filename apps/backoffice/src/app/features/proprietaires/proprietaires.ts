import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { LucideIdCard, LucideLandPlot, LucidePlus, LucideScrollText, LucideSearch, LucideUserX, LucideX } from '@lucide/angular';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { ProprietairesApiService } from '../../core/services/api/proprietaires-api.service';
import { SessionService } from '../../core/services/session.service';
import { ProprietaireDialog } from '../terrains/proprietaire-dialog';
import type { ProprietaireSummary } from '../../core/models/terrain.model';
import { NotificationService } from '../../shared/services/notification.service';

type Scope = '' | 'sans-terrain' | 'avec-mandat';

/**
 * Propriétaires fonciers (J1.4). Une liste courte et cherchable : qui a
 * confié quoi, et qui n'a encore rien confié (à relancer).
 */
@Component({
  selector: 'app-proprietaires',
  imports: [
    AgGridAngular,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideIdCard,
    LucideLandPlot,
    LucidePlus,
    LucideScrollText,
    LucideSearch,
    LucideUserX,
    LucideX,
  ],
  templateUrl: './proprietaires.html',
  styleUrl: './proprietaires.scss',
})
export class Proprietaires implements OnInit {
  private readonly api = inject(ProprietairesApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly proprietaires = signal<ProprietaireSummary[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly scope = signal<Scope>('');
  protected readonly canCreate = computed(() => this.session.hasPermission('proprietaires:creer'));
  protected readonly hasActiveFilters = computed(() => this.searchTerm().trim() !== '' || this.scope() !== '');

  protected readonly stats = computed(() => {
    const list = this.proprietaires();
    return {
      total: list.length,
      terrains: list.reduce((sum, item) => sum + (item._count?.terrains ?? 0), 0),
      mandats: list.reduce((sum, item) => sum + (item._count?.mandats ?? 0), 0),
      sansTerrain: list.filter((item) => (item._count?.terrains ?? 0) === 0).length,
    };
  });

  protected readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const scope = this.scope();
    return this.proprietaires().filter((item) => {
      if (scope === 'sans-terrain' && (item._count?.terrains ?? 0) > 0) return false;
      if (scope === 'avec-mandat' && (item._count?.mandats ?? 0) === 0) return false;
      if (!term) return true;
      return `${item.firstName} ${item.lastName} ${item.email ?? ''} ${item.phone ?? ''}`.toLowerCase().includes(term);
    });
  });

  protected readonly columnDefs: ColDef<ProprietaireSummary>[] = [
    {
      headerName: 'Propriétaire',
      flex: 1.6,
      minWidth: 180,
      sortable: true,
      cellClass: 'cell-strong',
      valueGetter: (p) => (p.data ? `${p.data.lastName} ${p.data.firstName}` : ''),
    },
    { field: 'phone', headerName: 'Téléphone', flex: 1, minWidth: 130, valueFormatter: (p) => (p.value as string) || '—' },
    { field: 'email', headerName: 'E-mail', flex: 1.4, minWidth: 180, valueFormatter: (p) => (p.value as string) || '—' },
    {
      headerName: 'Terrains',
      flex: 0.6,
      minWidth: 90,
      type: 'rightAligned',
      sortable: true,
      valueGetter: (p) => p.data?._count?.terrains ?? 0,
    },
    {
      headerName: 'Mandats',
      flex: 0.6,
      minWidth: 90,
      type: 'rightAligned',
      sortable: true,
      valueGetter: (p) => p.data?._count?.mandats ?? 0,
    },
    {
      headerName: '',
      colId: 'actions',
      width: 72,
      minWidth: 72,
      pinned: 'right',
      sortable: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<ProprietaireSummary>) => {
        if (!params.data) return '';
        const id = params.data.id;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'grid-icon-btn';
        button.title = 'Ouvrir la fiche';
        button.setAttribute('aria-label', 'Ouvrir la fiche');
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.5 8.18 7.4 5 12 5s8.5 3.18 9.94 6.65a1 1 0 0 1 0 .7C20.5 15.82 16.6 19 12 19s-8.5-3.18-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></svg>';
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          this.openDetail(id);
        });
        return button;
      },
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/proprietaires', id]);
  }

  protected setScope(scope: Scope): void {
    this.scope.set(scope);
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.scope.set('');
  }

  protected openCreate(): void {
    this.dialog
      .open(ProprietaireDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((payload: Omit<ProprietaireSummary, 'id'> | undefined) => {
        if (!payload) return;
        this.api.create(payload).subscribe({
          next: (created) => {
            this.notify.success('Propriétaire créé');
            this.openDetail(created.id);
          },
          error: (error: unknown) => this.notify.error(error, 'Impossible de créer le propriétaire'),
        });
      });
  }

  private load(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (items) => {
        this.proprietaires.set(items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des propriétaires');
      },
    });
  }
}
