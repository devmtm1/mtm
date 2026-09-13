import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDownload, LucideFileClock, LucideSearch, LucideShieldAlert, LucideX } from '@lucide/angular';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { AuditApiService } from '../../core/services/api/audit-api.service';
import { SessionService } from '../../core/services/session.service';
import type { AuditLogItem } from '../../core/models/audit.model';
import { JustificationDialog } from '../../shared/dialogs/justification-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { downloadBlob } from '../../shared/utils/download';
import { AUDIT_FAMILIES, ENTITY_LABELS, auditActionLabel, entityLabel } from '../admin/admin-labels';
import { AuditDetailDialog } from './audit-detail-dialog';

type Period = 'today' | '7d' | '30d' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Aujourd’hui' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: 'all', label: 'Tout' },
];

const PAGE_SIZE = 200;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

/**
 * Journal d'audit (Phase 0, section 24 CDC) : qui a fait quoi, quand, sur
 * quoi, avec l'ancienne et la nouvelle valeur et la justification donnée.
 * Le journal est en lecture seule ; son export est lui-même tracé.
 */
@Component({
  selector: 'app-audit',
  imports: [FormsModule, AgGridAngular, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, LucideDownload, LucideFileClock, LucideSearch, LucideShieldAlert, LucideX],
  templateUrl: './audit.html',
  styleUrl: './audit.scss',
})
export class Audit implements OnInit {
  private readonly auditApi = inject(AuditApiService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly entries = signal<AuditLogItem[]>([]);
  protected readonly total = signal(0);
  protected readonly canExport = this.session.hasPermission('audit:exporter');

  protected readonly families = AUDIT_FAMILIES;
  protected readonly entityTypes = Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  protected readonly periods = PERIODS;

  protected family = '';
  protected entityType = '';
  protected period: Period = '7d';
  protected readonly search = signal('');

  /** Filtrage local sur le texte (nom, action, justification) parmi la page chargée. */
  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.entries();
    return this.entries().filter((entry) =>
      `${entry.user?.firstName ?? ''} ${entry.user?.lastName ?? ''} ${entry.user?.email ?? ''} ${auditActionLabel(entry.action)} ${entry.action} ${entityLabel(entry.entityType)} ${entry.entityId ?? ''} ${entry.justification ?? ''}`
        .toLowerCase()
        .includes(term),
    );
  });

  protected readonly securityAlerts = computed(() => this.entries().filter((entry) => /^auth\.(login\.(failed|rejected_\w+)|account\.locked)$/.test(entry.action)).length);
  protected readonly changesCount = computed(() => this.entries().filter((entry) => entry.oldValue !== null && entry.oldValue !== undefined).length);
  protected readonly hasActiveFilters = computed(() => this.family !== '' || this.entityType !== '' || this.period !== '7d' || this.search().trim() !== '');

  protected readonly columnDefs: ColDef<AuditLogItem>[] = [
    {
      headerName: 'Quand',
      colId: 'createdAt',
      field: 'createdAt',
      width: 150,
      minWidth: 140,
      sortable: true,
      sort: 'desc',
      valueFormatter: (params) => new Date(params.value as string).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
    {
      headerName: 'Qui',
      colId: 'who',
      flex: 1.1,
      minWidth: 150,
      valueGetter: (params) => (params.data?.user ? `${params.data.user.firstName} ${params.data.user.lastName}` : 'Système'),
      cellRenderer: (params: ICellRendererParams<AuditLogItem>) => {
        const user = params.data?.user;
        if (!user) return '<span class="cell-muted">Système (automatique)</span>';
        return `<div class="who-cell"><strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong><span class="cell-muted">${escapeHtml(user.email)}</span></div>`;
      },
    },
    {
      headerName: 'Action',
      colId: 'action',
      flex: 2,
      minWidth: 240,
      valueGetter: (params) => (params.data ? auditActionLabel(params.data.action) : ''),
      cellRenderer: (params: ICellRendererParams<AuditLogItem>) => {
        const entry = params.data;
        if (!entry) return '';
        const danger = /^auth\.(login\.(failed|rejected_\w+)|account\.locked)$/.test(entry.action);
        const label = escapeHtml(auditActionLabel(entry.action));
        return danger ? `<span class="status-pill status-pill--danger">${label}</span>` : `<span class="cell-strong">${label}</span>`;
      },
    },
    {
      headerName: 'Élément',
      colId: 'entity',
      flex: 1.2,
      minWidth: 150,
      valueGetter: (params) => (params.data ? entityLabel(params.data.entityType) : ''),
      cellRenderer: (params: ICellRendererParams<AuditLogItem>) => {
        const entry = params.data;
        if (!entry) return '';
        const id = entry.entityId ? `<span class="cell-muted mono">${escapeHtml(entry.entityId.slice(0, 8))}…</span>` : '';
        return `<div class="who-cell"><span>${escapeHtml(entityLabel(entry.entityType))}</span>${id}</div>`;
      },
    },
    {
      headerName: 'Justification',
      colId: 'justification',
      flex: 1.6,
      minWidth: 160,
      valueGetter: (params) => params.data?.justification ?? '',
      cellClass: (params) => (params.value ? '' : 'cell-muted'),
      valueFormatter: (params) => (params.value ? String(params.value) : '—'),
      tooltipValueGetter: (params) => (params.value ? String(params.value) : ''),
    },
    {
      headerName: 'Changement',
      colId: 'diff',
      width: 130,
      minWidth: 120,
      sortable: false,
      valueGetter: (params) => (params.data?.oldValue !== null && params.data?.oldValue !== undefined ? 'Avant / après' : params.data?.newValue ? 'Valeurs' : ''),
      cellRenderer: (params: ICellRendererParams<AuditLogItem>) => {
        const entry = params.data;
        if (!entry) return '';
        if (entry.oldValue !== null && entry.oldValue !== undefined) return '<span class="status-pill status-pill--info">Avant / après</span>';
        if (entry.newValue !== null && entry.newValue !== undefined) return '<span class="status-pill">Valeurs</span>';
        return '<span class="cell-muted">—</span>';
      },
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected applyFilters(): void {
    this.load();
  }

  protected resetFilters(): void {
    this.family = '';
    this.entityType = '';
    this.period = '7d';
    this.search.set('');
    this.load();
  }

  protected onRowClicked(event: RowClickedEvent<AuditLogItem>): void {
    if (event.data) this.openDetail(event.data);
  }

  /** Ancienne / nouvelle valeur et justification d'une entrée (critère Phase 0). */
  protected openDetail(entry: AuditLogItem): void {
    this.dialog.open(AuditDetailDialog, { data: entry, maxWidth: 'min(900px, calc(100vw - 32px))', autoFocus: false });
  }

  protected exportLogs(): void {
    if (!this.canExport) return;
    JustificationDialog.ask(this.dialog, {
      title: 'Exporter le journal d’audit',
      description: 'L’export de données sensibles est lui-même tracé : indiquez le motif (contrôle, audit externe, enquête interne…).',
      confirmLabel: 'Exporter',
    }).subscribe((justification) => {
      if (!justification) return;
      this.auditApi.export({ ...this.query(), pageSize: 2000 }, justification).subscribe({
        next: (items) => {
          downloadBlob(new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }), `journal-audit-${new Date().toISOString().slice(0, 10)}.json`);
          this.notify.success('Export téléchargé (et tracé dans le journal)');
        },
        error: (error: unknown) => this.notify.error(error, 'Export impossible'),
      });
    });
  }

  private query(): { entityType?: string; action?: string; from?: string; to?: string } {
    const from = this.periodStart();
    return {
      entityType: this.entityType || undefined,
      action: this.family || undefined,
      from: from ? from.toISOString() : undefined,
    };
  }

  private periodStart(): Date | null {
    const now = new Date();
    switch (this.period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case '7d':
        return new Date(now.getTime() - 7 * 86_400_000);
      case '30d':
        return new Date(now.getTime() - 30 * 86_400_000);
      default:
        return null;
    }
  }

  private load(): void {
    this.loading.set(true);
    this.auditApi.findAll({ ...this.query(), pageSize: PAGE_SIZE }).subscribe({
      next: (page) => {
        this.entries.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement du journal');
      },
    });
  }
}
