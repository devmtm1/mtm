import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArrowLeft,
  LucideBanknote,
  LucideCalendarClock,
  LucideChevronDown,
  LucideClock,
  LucideFileText,
  LucideLandPlot,
  LucidePencil,
  LucidePercent,
  LucidePhone,
  LucidePlus,
  LucideTrash2,
  LucideTrendingUp,
  LucideUpload,
  LucideUser,
} from '@lucide/angular';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { MandatDetail as MandatDetailModel, MandatFinancialSummary, MandatLotItem, MandatOptions } from '../../../core/models/mandat.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StatusChoiceDialog } from '../../../shared/dialogs/status-choice-dialog';
import { MandatHistoryDialog } from './mandat-history-dialog';
import { MandatLotDialog } from './mandat-lot-dialog';
import { MandatDocumentDialog } from './mandat-document-dialog';
import {
  LOT_STATUS,
  LOT_STATUS_LABELS,
  MANDAT_STATUS,
  TYPE_MANDAT_HELP,
  echeanceInfo,
  lotLabel,
  pillClass,
  restrictionLines,
  statusChoices,
  statusHelp,
} from '../mandat-status';

/**
 * Fiche mandat (J1.4) : le contrat avec le propriétaire, les lots confiés
 * et leur avancement commercial, les documents et l'historique.
 */
@Component({
  selector: 'app-mandat-detail',
  imports: [
    LabelPipe,
    MoneyPipe,
    DatePipe,
    LowerCasePipe,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucideBanknote,
    LucideCalendarClock,
    LucideChevronDown,
    LucideClock,
    LucideFileText,
    LucideLandPlot,
    LucidePencil,
    LucidePercent,
    LucidePhone,
    LucidePlus,
    LucideTrash2,
    LucideTrendingUp,
    LucideUpload,
    LucideUser,
  ],
  templateUrl: './mandat-detail.html',
  styleUrl: './mandat-detail.scss',
})
export class MandatDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(MandatsApiService);
  private readonly session = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly mandat = signal<MandatDetailModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly financial = signal<MandatFinancialSummary | null>(null);
  protected readonly options = signal<MandatOptions | null>(null);
  protected readonly canModify = this.session.hasPermission('mandats:modifier');
  protected readonly canDelete = this.session.hasPermission('mandats:supprimer');

  protected readonly echeance = computed(() => {
    const mandat = this.mandat();
    return mandat ? echeanceInfo(mandat.dateFin, mandat.statut, mandat.alerteEcheanceJours) : null;
  });

  protected readonly lotsByStatus = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const lot of this.mandat()?.lots ?? []) counts[lot.statutLot] = (counts[lot.statutLot] || 0) + 1;
    return counts;
  });

  protected readonly restrictions = computed(() => restrictionLines(this.mandat()?.restrictionsContractuelles));

  /** Ce qu'il reste à faire pour un mandat exploitable. */
  protected readonly todo = computed(() => {
    const mandat = this.mandat();
    if (!mandat) return [];
    const items: { label: string; hint: string }[] = [];
    if (mandat.lots.length === 0) items.push({ label: 'Rattacher les terrains concernés', hint: 'Sans lot, le mandat ne porte sur rien.' });
    if (!mandat.documents.some((document) => document.type === 'contrat')) items.push({ label: 'Joindre le contrat signé', hint: 'Preuve de l’accord avec le propriétaire.' });
    if (mandat.statut === 'Brouillon') items.push({ label: 'Passer le mandat en « Actif »', hint: 'Une fois signé, pour déclencher le suivi et les alertes.' });
    const echeance = this.echeance();
    if (echeance && (echeance.tone === 'warning' || echeance.tone === 'danger')) items.push({ label: 'Traiter l’échéance', hint: `${echeance.label} : prolonger, clôturer ou renouveler.` });
    return items;
  });

  protected readonly mandatStatus = MANDAT_STATUS;
  protected readonly lotStatus = LOT_STATUS;
  protected readonly typeHelp = TYPE_MANDAT_HELP;
  protected readonly lotLabel = lotLabel;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }
    this.api.getOptions().subscribe({ next: (options) => this.options.set(options) });
    this.api.findOne(id).subscribe({
      next: (mandat) => {
        this.mandat.set(mandat);
        this.loading.set(false);
        this.loadFinancial(id);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Mandat introuvable');
        this.goBack();
      },
    });
  }

  protected goBack(): void {
    void this.router.navigate(['/mandats']);
  }

  protected edit(): void {
    const mandat = this.mandat();
    if (mandat) void this.router.navigate(['/mandats', mandat.id, 'modifier']);
  }

  protected openTerrain(lot: MandatLotItem): void {
    void this.router.navigate(['/terrains', lot.terrain.id]);
  }

  protected openProprietaire(): void {
    const mandat = this.mandat();
    if (mandat) void this.router.navigate(['/proprietaires', mandat.proprietaire.id]);
  }

  protected pill(map: Record<string, { tone: string }>, value: string | null | undefined): string {
    return pillClass(map as never, value);
  }

  protected help(map: Record<string, { help: string }>, value: string | null | undefined): string {
    return statusHelp(map as never, value);
  }

  protected formatLocation(lot: MandatLotItem): string {
    return [lot.terrain.commune, lot.terrain.region].filter((value): value is string => Boolean(value)).join(', ') || 'Localisation non renseignée';
  }

  // --- Actions ------------------------------------------------------------

  protected changeStatus(): void {
    const mandat = this.mandat();
    const options = this.options();
    if (!mandat || !options) return;
    StatusChoiceDialog.open(this.dialog, {
      title: 'Changer le statut du mandat',
      intro: 'Le statut indique où en est le contrat avec le propriétaire. Un mandat « Actif » déclenche le suivi des lots et les alertes d’échéance.',
      subject: `Mandat ${mandat.referenceInterne}`,
      current: mandat.statut,
      choices: statusChoices(MANDAT_STATUS, options.statut),
    }).subscribe((result) => {
      if (result) this.run(this.api.updateStatus(mandat.id, result.value), 'Statut du mandat mis à jour');
    });
  }

  protected addLot(): void {
    const mandat = this.mandat();
    if (!mandat) return;
    this.dialog
      .open(MandatLotDialog, { width: '560px', maxWidth: 'calc(100vw - 32px)', data: { mandat, options: this.options() } })
      .afterClosed()
      .subscribe((result: { terrainId: string; statutLot: string } | undefined) => {
        if (result) this.run(this.api.addLot(mandat.id, result), 'Terrain rattaché au mandat');
      });
  }

  protected changeLotStatus(lot: MandatLotItem): void {
    const mandat = this.mandat();
    const options = this.options();
    if (!mandat || !options) return;
    StatusChoiceDialog.open(this.dialog, {
      title: 'Avancement du lot',
      intro: 'Suit la commercialisation de ce terrain dans le cadre du mandat. « Vendu » alimente le chiffre d’affaires du mandat.',
      subject: `Lot ${lot.terrain.referenceInterne} — ${lot.terrain.nom}`,
      current: lot.statutLot,
      choices: statusChoices(LOT_STATUS, options.statutLot, LOT_STATUS_LABELS),
    }).subscribe((result) => {
      if (result) this.run(this.api.updateLot(mandat.id, lot.id, { statutLot: result.value }), 'Lot mis à jour');
    });
  }

  protected removeLot(lot: MandatLotItem): void {
    const mandat = this.mandat();
    if (!mandat || !confirm(`Retirer le terrain ${lot.terrain.referenceInterne} de ce mandat ?`)) return;
    this.run(this.api.removeLot(mandat.id, lot.id), 'Terrain retiré du mandat');
  }

  protected addDocument(): void {
    const mandat = this.mandat();
    if (!mandat) return;
    this.dialog
      .open(MandatDocumentDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)', data: { documentTypes: this.options()?.documentTypes ?? [] } })
      .afterClosed()
      .subscribe((result: { file: File; type: string; title: string } | undefined) => {
        if (result) this.run(this.api.addDocument(mandat.id, result.file, result.type, result.title), 'Document ajouté');
      });
  }

  protected removeDocument(documentId: string): void {
    const mandat = this.mandat();
    if (!mandat || !confirm('Supprimer ce document ?')) return;
    this.run(this.api.removeDocument(mandat.id, documentId), 'Document supprimé');
  }

  protected removeMandat(): void {
    const mandat = this.mandat();
    if (!mandat || !confirm(`Supprimer définitivement le mandat ${mandat.referenceInterne} ? Cette action est tracée.`)) return;
    this.busy.set(true);
    this.api.remove(mandat.id).subscribe({
      next: () => {
        this.notify.success('Mandat supprimé');
        this.goBack();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'Impossible de supprimer le mandat');
      },
    });
  }

  protected openHistory(): void {
    const mandat = this.mandat();
    if (!mandat) return;
    MandatHistoryDialog.open(this.dialog, this.api, mandat);
  }

  // --- Interne ------------------------------------------------------------

  private run(request$: { subscribe: (observer: { next: () => void; error: (error: unknown) => void }) => unknown }, successMessage: string): void {
    this.busy.set(true);
    request$.subscribe({
      next: () => {
        this.notify.success(successMessage);
        this.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'L’opération a échoué');
      },
    });
  }

  private reload(): void {
    const mandat = this.mandat();
    if (!mandat) return;
    this.api.findOne(mandat.id).subscribe({
      next: (fresh) => {
        this.mandat.set(fresh);
        this.busy.set(false);
        this.loadFinancial(fresh.id);
      },
      error: () => this.busy.set(false),
    });
  }

  private loadFinancial(id: string): void {
    this.api.getFinancialSummary(id).subscribe({ next: (summary) => this.financial.set(summary), error: () => this.financial.set(null) });
  }
}
