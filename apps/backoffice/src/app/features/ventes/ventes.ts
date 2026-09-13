import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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
  LucideBanknote,
  LucideCircleCheck,
  LucideClock,
  LucideDownload,
  LucideFileSearch,
  LucideGlobe,
  LucideReceipt,
  LucideSearch,
  LucideTarget,
  LucideX,
} from '@lucide/angular';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, map, startWith } from 'rxjs/operators';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import { SessionService } from '../../core/services/session.service';
import type { DossierVenteListItem, ReservationRequestItem, VenteDashboardStats, VenteOptions } from '../../core/models/vente.model';
import { NotificationService } from '../../shared/services/notification.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { JustificationDialog } from '../../shared/dialogs/justification-dialog';
import { downloadBlob } from '../../shared/utils/download';
import { ReservationRequestDialog } from './reservation-request-dialog';
import { DOSSIER_STATUS, activeReservation, clientName, joursAvantExpiration, label, pillClass, progression } from './ventes-status';

/**
 * Dossiers de vente (J1.6). L'écran met en avant ce qui demande une
 * action — demandes web à traiter, paiements à valider, réservations qui
 * expirent — puis la liste des dossiers avec leur avancement de paiement.
 */
@Component({
  selector: 'app-ventes',
  imports: [
    DatePipe,
    MoneyPipe,
    ReactiveFormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideBanknote,
    LucideCircleCheck,
    LucideClock,
    LucideDownload,
    LucideFileSearch,
    LucideGlobe,
    LucideReceipt,
    LucideSearch,
    LucideTarget,
    LucideX,
  ],
  templateUrl: './ventes.html',
  styleUrl: './ventes.scss',
})
export class Ventes implements OnInit {
  private readonly api = inject(VentesApiService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly session = inject(SessionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly money = new MoneyPipe();

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly dossiers = signal<DossierVenteListItem[]>([]);
  protected readonly requests = signal<ReservationRequestItem[]>([]);
  protected readonly stats = signal<VenteDashboardStats | null>(null);
  protected readonly options = signal<VenteOptions | null>(null);
  protected readonly canExport = this.session.hasPermission('ventes:exporter');
  protected readonly canCreate = this.session.hasPermission('ventes:creer');
  protected readonly canValidate = this.session.hasPermission('ventes:valider');
  protected readonly canViewFinancials = this.session.hasPermission('ventes:consulter_financier') || this.session.hasSupervisionScope('ventes');
  protected readonly seesAll = this.session.hasSupervisionScope('ventes');

  protected readonly filters = this.formBuilder.nonNullable.group({ search: '', statut: '' });
  private readonly filterValue = toSignal(this.filters.valueChanges.pipe(debounceTime(200), startWith(this.filters.getRawValue()), map(() => this.filters.getRawValue())), {
    initialValue: this.filters.getRawValue(),
  });

  protected readonly hasActiveFilters = computed(() => {
    const value = this.filterValue();
    return value.search.trim() !== '' || value.statut !== '';
  });

  protected readonly filtered = computed(() => {
    const { search, statut } = this.filterValue();
    const term = search.trim().toLowerCase();
    return this.dossiers().filter((dossier) => {
      if (statut && dossier.statut !== statut) return false;
      if (!term) return true;
      return `${dossier.referenceInterne ?? ''} ${clientName(dossier.prospect)} ${dossier.prospect.email ?? ''} ${dossier.terrain?.referenceInterne ?? ''} ${dossier.terrain?.nom ?? ''}`.toLowerCase().includes(term);
    });
  });

  protected readonly pendingRequests = computed(() => this.requests().filter((request) => request.statut === 'nouvelle'));
  protected readonly pendingPayments = computed(() => this.dossiers().filter((dossier) => dossier.paiements?.some((payment) => payment.statut === 'en_attente')));
  protected readonly expiringReservations = computed(() =>
    this.dossiers()
      .map((dossier) => ({ dossier, reservation: activeReservation(dossier) }))
      .filter((item): item is { dossier: DossierVenteListItem; reservation: NonNullable<ReturnType<typeof activeReservation>> } => !!item.reservation && joursAvantExpiration(item.reservation) <= 7),
  );
  protected readonly enCours = computed(() => this.dossiers().filter((dossier) => !['solde', 'annule'].includes(dossier.statut)).length);
  protected readonly soldes = computed(() => this.dossiers().filter((dossier) => dossier.statut === 'solde').length);
  protected readonly resteAEncaisser = computed(() =>
    this.dossiers()
      .filter((dossier) => !['solde', 'annule'].includes(dossier.statut))
      .reduce((sum, dossier) => sum + Number(dossier.soldeRestant ?? 0), 0),
  );

  protected readonly columnDefs: ColDef<DossierVenteListItem>[] = [
    { headerName: 'Réf.', flex: 0.8, minWidth: 110, sortable: true, cellClass: 'cell-strong', valueGetter: (p) => p.data?.referenceInterne ?? '—' },
    { headerName: 'Client', flex: 1.3, minWidth: 150, sortable: true, valueGetter: (p) => (p.data ? clientName(p.data.prospect) : '') },
    {
      headerName: 'Terrain',
      flex: 1.4,
      minWidth: 160,
      valueGetter: (p) => (p.data?.terrain ? `${p.data.terrain.referenceInterne} — ${p.data.terrain.nom}` : 'Non défini'),
      cellClass: (p) => (p.data?.terrain ? '' : 'cell-muted'),
    },
    {
      headerName: 'Prix',
      flex: 1,
      minWidth: 130,
      type: 'rightAligned',
      valueGetter: (p) => p.data?.prixVente ?? null,
      valueFormatter: (p) => this.money.transform(p.value as number | string | null),
    },
    {
      headerName: 'Payé',
      flex: 1.3,
      minWidth: 170,
      cellRenderer: (p: ICellRendererParams<DossierVenteListItem>) => this.progressCell(p),
    },
    {
      field: 'statut',
      headerName: 'Statut',
      flex: 1,
      minWidth: 130,
      sortable: true,
      cellRenderer: (p: ICellRendererParams<DossierVenteListItem>) => this.pill(p.value as string),
    },
    {
      headerName: 'À faire',
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (p: ICellRendererParams<DossierVenteListItem>) => this.todoCell(p),
    },
    {
      headerName: '',
      colId: 'actions',
      width: 72,
      minWidth: 72,
      pinned: 'right',
      sortable: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<DossierVenteListItem>) => this.actionsCell(params),
    },
  ];

  ngOnInit(): void {
    this.api.getOptions().subscribe({ next: (options) => this.options.set(options), error: () => this.options.set(null) });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (dossiers) => {
        this.dossiers.set(dossiers);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les dossiers de vente');
      },
    });
    this.api.findReservationRequests().subscribe({ next: (requests) => this.requests.set(requests), error: () => this.requests.set([]) });
    if (this.canViewFinancials) this.api.getDashboardStats().subscribe({ next: (stats) => this.stats.set(stats), error: () => this.stats.set(null) });
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/ventes', id]);
  }

  protected openObjectifs(): void {
    void this.router.navigate(['/ventes', 'objectifs']);
  }

  protected openDocuments(): void {
    void this.router.navigate(['/ventes', 'documents']);
  }

  protected goToProspects(): void {
    void this.router.navigate(['/crm/prospects']);
  }

  protected filterByStatus(statut: string): void {
    this.filters.patchValue({ search: '', statut });
  }

  protected resetFilters(): void {
    this.filters.reset({ search: '', statut: '' });
  }

  protected statusLabel(statut: string): string {
    return label(DOSSIER_STATUS, statut);
  }

  protected requestName(request: ReservationRequestItem): string {
    return request.nom;
  }

  /** Demande de réservation reçue du site public → dossier de vente. */
  protected convertRequest(request: ReservationRequestItem): void {
    ReservationRequestDialog.open(this.dialog, { request }).subscribe((payload) => {
      if (!payload) return;
      this.api.convertReservationRequest(request.id, payload).subscribe({
        next: (created) => {
          this.notify.success('Dossier de vente créé depuis la demande');
          const id = (created as { id?: string } | null)?.id;
          if (id) this.openDetail(id);
          else this.load();
        },
        error: (error: unknown) => this.notify.error(error, 'Impossible de convertir la demande'),
      });
    });
  }

  /** Export CSV tracé (section 24) : justification obligatoire, consignée dans l'audit. */
  protected exportCsv(): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Exporter les dossiers de vente',
      description: 'L’export contient des données clients et, selon vos droits, financières. Indiquez le motif.',
      confirmLabel: 'Exporter en CSV',
    }).subscribe((justification) => {
      if (!justification) return;
      this.api.exportCsv(justification).subscribe({
        next: (blob) => {
          downloadBlob(blob, `dossiers-vente-${new Date().toISOString().slice(0, 10)}.csv`);
          this.notify.success('Export téléchargé');
        },
        error: (error: unknown) => this.notify.error(error, 'Export impossible'),
      });
    });
  }

  // --- Cellules ---------------------------------------------------------------

  private pill(statut: string | null): HTMLElement | string {
    if (!statut) return '—';
    const span = document.createElement('span');
    span.className = pillClass(DOSSIER_STATUS, statut);
    span.textContent = label(DOSSIER_STATUS, statut);
    span.title = DOSSIER_STATUS[statut]?.help ?? '';
    return span;
  }

  private progressCell(params: ICellRendererParams<DossierVenteListItem>): HTMLElement | string {
    const dossier = params.data;
    if (!dossier) return '';
    const percent = progression(dossier);
    const wrapper = document.createElement('div');
    wrapper.className = 'pay-progress';
    if (percent === null) {
      wrapper.classList.add('pay-progress--none');
      wrapper.textContent = 'Prix non fixé';
      return wrapper;
    }
    const bar = document.createElement('span');
    bar.className = 'pay-progress__bar';
    const fill = document.createElement('span');
    fill.className = `pay-progress__fill${percent >= 100 ? ' is-complete' : ''}`;
    fill.style.width = `${percent}%`;
    bar.appendChild(fill);
    const text = document.createElement('small');
    text.textContent = `${percent} % · ${this.money.transform(dossier.montantPaye)}`;
    wrapper.append(bar, text);
    wrapper.title = `Reste à payer : ${this.money.transform(dossier.soldeRestant)}`;
    return wrapper;
  }

  private todoCell(params: ICellRendererParams<DossierVenteListItem>): HTMLElement | string {
    const dossier = params.data;
    if (!dossier) return '';
    const items: { text: string; tone: string }[] = [];
    if (dossier.paiements?.some((payment) => payment.statut === 'en_attente')) items.push({ text: 'Paiement à valider', tone: 'warning' });
    const reservation = activeReservation(dossier);
    if (reservation) {
      const days = joursAvantExpiration(reservation);
      if (days <= 7) items.push({ text: days <= 0 ? 'Réservation expirée' : `Réservation expire dans ${days} j`, tone: 'danger' });
    }
    if (!dossier.terrain && !['solde', 'annule'].includes(dossier.statut)) items.push({ text: 'Terrain à définir', tone: 'neutral' });
    const wrapper = document.createElement('span');
    wrapper.className = 'next-action';
    if (!items.length) {
      wrapper.classList.add('next-action--none');
      wrapper.textContent = '—';
      return wrapper;
    }
    wrapper.classList.add(items[0].tone === 'danger' ? 'next-action--overdue' : 'next-action--planned');
    wrapper.textContent = items.map((item) => item.text).join(' · ');
    return wrapper;
  }

  private actionsCell(params: ICellRendererParams<DossierVenteListItem>): HTMLElement | string {
    if (!params.data) return '';
    const id = params.data.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grid-icon-btn';
    button.title = 'Ouvrir le dossier';
    button.setAttribute('aria-label', 'Ouvrir le dossier');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.5 8.18 7.4 5 12 5s8.5 3.18 9.94 6.65a1 1 0 0 1 0 .7C20.5 15.82 16.6 19 12 19s-8.5-3.18-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></svg>';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.openDetail(id);
    });
    return button;
  }
}
