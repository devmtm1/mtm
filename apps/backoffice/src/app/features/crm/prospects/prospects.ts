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
import { LucideCalendarClock, LucidePlus, LucideSearch, LucideUserPlus, LucideUserSearch, LucideX } from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { mtmGridTheme } from '../../../core/ag-grid.config';
import { SessionService } from '../../../core/services/session.service';
import { CrmApiService, type UpcomingTask } from '../../../core/services/api/crm-api.service';
import type { CommercialSummary, ProspectListItem, ProspectOptions, ProspectStats } from '../../../core/models/prospect.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PIPELINE, PRIORITIES, dueLabel, isOverdue, label, pillClass, prospectName } from '../crm-status';

const EMPTY_FILTERS = { search: '', statutPipeline: '', commercialResponsableId: '' };

/**
 * Prospects (J1.5). L'écran répond à : qui dois-je rappeler aujourd'hui,
 * où en est mon pipeline, et comment retrouver un contact.
 */
@Component({
  selector: 'app-prospects',
  imports: [
    ReactiveFormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideCalendarClock,
    LucidePlus,
    LucideSearch,
    LucideUserPlus,
    LucideUserSearch,
    LucideX,
  ],
  templateUrl: './prospects.html',
  styleUrl: './prospects.scss',
})
export class Prospects implements OnInit {
  private readonly crmApi = inject(CrmApiService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly money = new MoneyPipe();

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<ProspectListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly stats = signal<ProspectStats | null>(null);
  protected readonly tasks = signal<UpcomingTask[]>([]);
  protected readonly options = signal<ProspectOptions>({ pipelineStages: [], activiteTypes: [], activiteStats: [], priorites: [] });
  protected readonly commercials = signal<CommercialSummary[]>([]);
  protected readonly canCreate = computed(() => this.sessionService.hasPermission('crm:creer'));
  protected readonly seesAll = computed(() => this.sessionService.hasSupervisionScope('crm'));
  protected readonly filters = this.formBuilder.nonNullable.group(EMPTY_FILTERS);
  protected readonly hasActiveFilters = signal(false);

  protected readonly overdueTasks = computed(() => this.tasks().filter((task) => isOverdue(task)));
  protected readonly todayTasks = computed(() => this.tasks().filter((task) => !isOverdue(task) && dueLabel(task.dateEcheance) === 'Aujourd’hui'));

  /** Répartition par étape, dans l'ordre du pipeline, pour la barre de progression. */
  protected readonly funnel = computed(() => {
    const stats = this.stats();
    const stages = this.options().pipelineStages;
    if (!stats) return [];
    const active = stages.filter((stage) => stage !== 'perdu');
    const total = active.reduce((sum, stage) => sum + (stats.pipeline[stage] ?? 0), 0);
    return active.map((stage) => ({ stage, count: stats.pipeline[stage] ?? 0, share: total ? ((stats.pipeline[stage] ?? 0) / total) * 100 : 0 }));
  });

  protected readonly columnDefs: ColDef<ProspectListItem>[] = [
    {
      headerName: 'Prospect',
      flex: 1.5,
      minWidth: 170,
      sortable: true,
      cellClass: 'cell-strong',
      valueGetter: (p) => (p.data ? prospectName(p.data) : ''),
    },
    {
      headerName: 'Contact',
      flex: 1.4,
      minWidth: 170,
      valueGetter: (p) => [p.data?.telephone, p.data?.email].filter(Boolean).join(' · ') || '—',
    },
    {
      field: 'statutPipeline',
      headerName: 'Étape',
      flex: 1,
      minWidth: 140,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<ProspectListItem>) => this.pill(p.value as string),
    },
    {
      headerName: 'Budget',
      flex: 1,
      minWidth: 130,
      type: 'rightAligned',
      valueGetter: (p) => p.data?.budgetMax ?? null,
      valueFormatter: (p) => (p.value == null ? '—' : `jusqu’à ${this.money.transform(p.value as number)}`),
    },
    {
      headerName: 'Prochaine action',
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (p: ICellRendererParams<ProspectListItem>) => this.nextActionCell(p),
    },
    {
      headerName: 'Commercial',
      flex: 1,
      minWidth: 130,
      valueGetter: (p) => (p.data?.commercialResponsable ? `${p.data.commercialResponsable.firstName} ${p.data.commercialResponsable.lastName}` : 'Non assigné'),
    },
    {
      headerName: '',
      colId: 'actions',
      width: 72,
      minWidth: 72,
      pinned: 'right',
      sortable: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<ProspectListItem>) => this.actionsCell(params),
    },
  ];

  ngOnInit(): void {
    this.crmApi.getOptions().subscribe({ next: (options) => this.options.set(options) });
    this.crmApi.getStats().subscribe({ next: (stats) => this.stats.set(stats) });
    this.crmApi.getUpcomingTasks(20).subscribe({ next: (tasks) => this.tasks.set(tasks), error: () => this.tasks.set([]) });
    if (this.seesAll()) this.crmApi.getCommercials().subscribe({ next: (list) => this.commercials.set(list), error: () => this.commercials.set([]) });
    this.load();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  protected openCreate(): void {
    void this.router.navigate(['/crm/prospects/nouveau']);
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/crm/prospects', id]);
  }

  protected filterByStage(statutPipeline: string): void {
    this.filters.patchValue({ ...EMPTY_FILTERS, statutPipeline });
  }

  protected resetFilters(): void {
    this.filters.reset(EMPTY_FILTERS);
  }

  protected stageLabel(stage: string): string {
    return label(PIPELINE, stage);
  }

  protected stagePill(stage: string): string {
    return pillClass(PIPELINE, stage);
  }

  protected priorityPill(priorite: string): string {
    return pillClass(PRIORITIES, priorite);
  }

  protected due(task: UpcomingTask): string {
    return dueLabel(task.dateEcheance);
  }

  protected taskName(task: UpcomingTask): string {
    return prospectName(task.prospect);
  }

  private load(): void {
    this.loading.set(true);
    const value = this.filters.getRawValue();
    this.hasActiveFilters.set(Object.values(value).some((item) => item !== ''));
    this.crmApi.findAll({ ...value, pageSize: 200 }).subscribe({
      next: (page) => {
        this.rowData.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des prospects');
      },
    });
  }

  private pill(stage: string | null): HTMLElement | string {
    if (!stage) return '—';
    const span = document.createElement('span');
    span.className = pillClass(PIPELINE, stage);
    span.textContent = label(PIPELINE, stage);
    span.title = PIPELINE[stage]?.help ?? '';
    return span;
  }

  /** « Rappeler M. Diop · Demain » ou « En retard de 3 j », sinon « Rien de prévu ». */
  private nextActionCell(params: ICellRendererParams<ProspectListItem>): HTMLElement | string {
    const next = params.data?.activites?.[0];
    const wrapper = document.createElement('span');
    wrapper.className = 'next-action';
    if (!next) {
      wrapper.classList.add('next-action--none');
      wrapper.textContent = 'Rien de prévu';
      return wrapper;
    }
    const overdue = isOverdue(next);
    wrapper.classList.add(overdue ? 'next-action--overdue' : 'next-action--planned');
    wrapper.textContent = `${dueLabel(next.dateEcheance)} · ${next.titre}`;
    wrapper.title = next.titre;
    return wrapper;
  }

  private actionsCell(params: ICellRendererParams<ProspectListItem>): HTMLElement | string {
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
  }
}
