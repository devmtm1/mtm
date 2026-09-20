import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArrowLeft,
  LucideBanknote,
  LucideCheck,
  LucideChevronDown,
  LucideFileText,
  LucideLandPlot,
  LucidePencil,
  LucidePercent,
  LucidePlus,
  LucideSparkles,
  LucideTrash2,
  LucideUpload,
  LucideUser,
} from '@lucide/angular';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { VenteCommission, VenteDetail, VenteEcheance, VenteOptions, VentePaiement, VenteReservation } from '../../../core/models/vente.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StatusChoiceDialog } from '../../../shared/dialogs/status-choice-dialog';
import { VenteCommissionDialog, type VenteCommissionDialogResult } from '../vente-commission-dialog';
import { VenteDocumentDialog, type VenteDocumentDialogData, type VenteDocumentDialogResult } from '../vente-document-dialog';
import { VentePaiementDialog } from '../vente-paiement-dialog';
import { VenteReservationDialog } from '../vente-reservation-dialog';
import { VenteEditDialog } from '../vente-edit-dialog';
import type { CommercialSummary } from '../../../core/models/prospect.model';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  COMMISSION_STATUS,
  DOSSIER_STATUS,
  ECHEANCE_STATUS,
  PAYMENT_STATUS,
  RESERVATION_STATUS,
  activeReservation,
  clientName,
  help,
  joursAvantExpiration,
  label,
  modeLabel,
  pillClass,
  progression,
  statusChoices,
} from '../ventes-status';

/**
 * Dossier de vente (J1.6) : de la réservation au solde. Tout ce qui
 * concerne cette vente — paiements, échéancier, réservation, commissions,
 * documents — et les actions possibles selon les droits.
 */
@Component({
  selector: 'app-vente-detail',
  standalone: true,
  imports: [
    LabelPipe,
    MoneyPipe,
    DatePipe,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucideBanknote,
    LucideCheck,
    LucideChevronDown,
    LucideFileText,
    LucideLandPlot,
    LucidePencil,
    LucidePercent,
    LucidePlus,
    LucideSparkles,
    LucideTrash2,
    LucideUpload,
    LucideUser,
  ],
  templateUrl: './vente-detail.html',
  styleUrl: './vente-detail.scss',
})
export class VenteDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(VentesApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly dossier = signal<VenteDetail | null>(null);
  protected readonly echeances = signal<VenteEcheance[]>([]);
  protected readonly options = signal<VenteOptions | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);

  protected readonly canModify = this.session.hasPermission('ventes:modifier');
  protected readonly canValidate = this.session.hasPermission('ventes:valider');
  protected readonly canPay = this.session.hasPermission('ventes:payer');
  protected readonly canPublish = this.session.hasPermission('ventes:publier');
  protected readonly canAdminister = this.session.hasPermission('ventes:administrer');
  /** Validation d'une commission : manager ou direction, jamais son propre créateur (règle API). */
  protected readonly canApproveCommissions = ['manager', 'direction', 'administrateur'].some((role) => this.session.hasRole(role));
  protected canValidateCommission(commission: VenteCommission): boolean {
    return commission.statut === 'estimee' && this.canApproveCommissions && commission.createdById !== this.session.user()?.id;
  }
  protected readonly canViewFinancials = this.session.hasPermission('ventes:consulter_financier') || this.session.hasSupervisionScope('ventes');
  protected readonly canSeeProspect = this.session.hasPermission('crm:consulter');
  protected readonly canSeeTerrain = this.session.hasPermission('terrains:consulter');

  protected readonly client = computed(() => (this.dossier() ? clientName(this.dossier()!.prospect) : ''));
  protected readonly reference = computed(() => this.dossier()?.referenceInterne ?? 'Dossier');
  protected readonly closed = computed(() => ['solde', 'annule'].includes(this.dossier()?.statut ?? ''));
  protected readonly percent = computed(() => (this.dossier() ? progression(this.dossier()!) : null));
  protected readonly reservation = computed(() => (this.dossier() ? activeReservation(this.dossier()!) : null));
  protected readonly reservationDays = computed(() => (this.reservation() ? joursAvantExpiration(this.reservation()!) : null));
  protected readonly pendingPayments = computed(() => (this.dossier()?.paiements ?? []).filter((payment) => payment.statut === 'en_attente'));
  protected readonly payments = computed(() => [...(this.dossier()?.paiements ?? [])].sort((a, b) => b.datePaiement.localeCompare(a.datePaiement)));
  protected readonly commissions = computed(() => this.dossier()?.commissions ?? []);
  protected readonly transitions = computed(() => {
    const statut = this.dossier()?.statut;
    const transitions = this.options()?.transitions;
    return statut && transitions ? (transitions[statut] ?? []) : [];
  });
  protected readonly canReserve = computed(() => {
    const dossier = this.dossier();
    return !!dossier && this.canModify && !this.closed() && !!dossier.terrain && !this.reservation();
  });

  /** Ce qu'il reste à faire sur ce dossier, dans l'ordre logique. */
  protected readonly todo = computed(() => {
    const dossier = this.dossier();
    if (!dossier || this.closed()) return [];
    const items: { label: string; hint: string }[] = [];
    if (!dossier.terrain) items.push({ label: 'Définir le terrain vendu', hint: 'Sans terrain, ni réservation ni documents ne sont possibles.' });
    if (dossier.prixVente === null) items.push({ label: 'Fixer le prix de vente', hint: 'Nécessaire pour calculer le solde et les commissions.' });
    if (this.pendingPayments().length) items.push({ label: `Valider ${this.pendingPayments().length} paiement${this.pendingPayments().length > 1 ? 's' : ''}`, hint: 'Un paiement ne compte qu’une fois validé.' });
    const days = this.reservationDays();
    if (days !== null && days <= 7) items.push({ label: days <= 0 ? 'Réservation expirée' : `Réservation expire dans ${days} j`, hint: 'Encaisser un paiement ou prolonger, sinon le terrain sera libéré.' });
    if (dossier.terrain && !this.reservation() && dossier.statut === 'en_cours') items.push({ label: 'Réserver le terrain', hint: 'Dès que le client s’engage (acompte), pour le bloquer.' });
    if (this.commissions().some((commission) => this.canValidateCommission(commission))) items.push({ label: 'Valider la commission estimée', hint: 'Confirme le montant dû au commercial ; la comptabilité pourra ensuite la payer.' });
    return items;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }
    this.api.getOptions().subscribe({ next: (options) => this.options.set(options), error: () => this.options.set(null) });
    this.load(id);
  }

  // --- Libellés -------------------------------------------------------------

  protected statusLabel(statut: string | null | undefined): string {
    return label(DOSSIER_STATUS, statut);
  }

  protected statusHelp(statut: string | null | undefined): string {
    return help(DOSSIER_STATUS, statut);
  }

  protected statusPill(statut: string | null | undefined): string {
    return pillClass(DOSSIER_STATUS, statut);
  }

  protected paymentPill(payment: VentePaiement): string {
    return pillClass(PAYMENT_STATUS, payment.statut);
  }

  protected paymentLabel(payment: VentePaiement): string {
    return label(PAYMENT_STATUS, payment.statut);
  }

  protected mode(payment: VentePaiement): string {
    return modeLabel(payment.mode);
  }

  protected reservationPill(reservation: VenteReservation): string {
    return pillClass(RESERVATION_STATUS, reservation.statut);
  }

  protected reservationLabel(reservation: VenteReservation): string {
    return label(RESERVATION_STATUS, reservation.statut);
  }

  protected commissionPill(commission: VenteCommission): string {
    return pillClass(COMMISSION_STATUS, commission.statut);
  }

  protected commissionLabel(commission: VenteCommission): string {
    return label(COMMISSION_STATUS, commission.statut);
  }

  protected commissionHelp(commission: VenteCommission): string {
    return help(COMMISSION_STATUS, commission.statut);
  }

  protected echeancePill(echeance: VenteEcheance): string {
    return pillClass(ECHEANCE_STATUS, echeance.statut);
  }

  protected echeanceLabel(echeance: VenteEcheance): string {
    return label(ECHEANCE_STATUS, echeance.statut);
  }

  // --- Navigation -----------------------------------------------------------

  protected goBack(): void {
    void this.router.navigate(['/ventes']);
  }

  protected openProspect(): void {
    const dossier = this.dossier();
    if (dossier) void this.router.navigate(['/crm/prospects', dossier.prospect.id]);
  }

  protected openTerrain(): void {
    const dossier = this.dossier();
    if (dossier?.terrain) void this.router.navigate(['/terrains', dossier.terrain.id]);
  }

  protected openDocumentsSearch(): void {
    const dossier = this.dossier();
    if (dossier) void this.router.navigate(['/ventes', 'documents'], { queryParams: { dossierVenteId: dossier.id } });
  }

  // --- Actions ----------------------------------------------------------------

  /** Terrain, prix, commercial : ce qui peut manquer à un dossier ouvert depuis un prospect. */
  protected editDossier(): void {
    const dossier = this.dossier();
    if (!dossier) return;
    const commercials$ = this.session.hasPermission('crm:consulter') ? this.crmApi.getCommercials().pipe(catchError(() => of([] as CommercialSummary[]))) : of([] as CommercialSummary[]);
    commercials$.subscribe((commercials) => {
      VenteEditDialog.open(this.dialog, { dossier, commercials }).subscribe((result) => {
        if (!result || Object.keys(result).length === 0) return;
        this.run(this.api.updateDossier(dossier.id, result), 'Dossier mis à jour');
      });
    });
  }

  protected changeStatus(): void {
    const dossier = this.dossier();
    if (!dossier) return;
    const choices = statusChoices(DOSSIER_STATUS, [dossier.statut, ...this.transitions()]);
    if (choices.length <= 1) {
      this.notify.info('Aucun changement de statut possible depuis « ' + this.statusLabel(dossier.statut) + ' ».');
      return;
    }
    StatusChoiceDialog.open(this.dialog, {
      title: 'Changer le statut du dossier',
      intro: 'Seules les transitions autorisées par le paramétrage sont proposées. Le passage à « Soldé » exige que le prix soit intégralement payé et validé.',
      subject: `Dossier ${this.reference()} · ${this.client()}`,
      current: dossier.statut,
      choices,
    }).subscribe((result) => {
      if (result) this.run(this.api.updateStatus(dossier.id, result.value), `Dossier passé à « ${this.statusLabel(result.value)} »`);
    });
  }

  protected reserve(): void {
    const dossier = this.dossier();
    if (!dossier || !dossier.terrain) return;
    VenteReservationDialog.open(this.dialog, {
      dossierLabel: this.reference(),
      terrainLabel: `${dossier.terrain.referenceInterne} — ${dossier.terrain.nom}`,
      prixVente: dossier.prixVente === null ? null : Number(dossier.prixVente),
      dureeParDefaut: this.options()?.dureeReservationJours ?? 15,
    }).subscribe((result) => {
      if (result) this.run(this.api.createReservation(dossier.id, result), 'Terrain réservé pour ce client');
    });
  }

  protected addPayment(): void {
    const dossier = this.dossier();
    if (!dossier) return;
    VentePaiementDialog.open(this.dialog, {
      dossierLabel: this.reference(),
      prixVente: dossier.prixVente === null ? null : Number(dossier.prixVente),
      montantPaye: dossier.montantPaye ?? 0,
      soldeRestant: dossier.soldeRestant,
      modes: this.options()?.modesPaiement ?? ['virement'],
    }).subscribe((result) => {
      if (result) this.run(this.api.createPaiement(dossier.id, result), 'Paiement enregistré — à valider');
    });
  }

  /** Ce que produit la validation selon l'état du dossier. */
  protected validateHint(): string {
    const statut = this.dossier()?.statut;
    if (statut === 'en_cours' || statut === 'pre_reserve') {
      return 'Confirme la réception : le dossier passe en paiement partiel et le terrain est réservé pour ce client';
    }
    return 'Confirme que le paiement est bien reçu';
  }

  protected validatePayment(payment: VentePaiement): void {
    const dossier = this.dossier();
    if (!dossier) return;
    const label = dossier.statut === 'en_cours' || dossier.statut === 'pre_reserve' ? 'Paiement validé : dossier en paiement partiel, terrain réservé' : 'Paiement validé';
    this.run(this.api.validatePayment(dossier.id, payment.id), label);
  }

  protected addCommission(): void {
    const dossier = this.dossier();
    const regles = this.options()?.reglesCommissions ?? [];
    if (!dossier) return;
    if (regles.length === 0) {
      this.notify.info('Aucune règle de commission n’est paramétrée (Paramètres › ventes.reglesCommissions).');
      return;
    }
    this.crmApi.getCommercials().subscribe({
      next: (commercials) => {
        this.dialog
          .open(VenteCommissionDialog, { width: '540px', maxWidth: 'calc(100vw - 32px)', data: { dossierLabel: this.reference(), commercialId: dossier.commercialResponsable?.id ?? null, commercials, regles } })
          .afterClosed()
          .subscribe((result: VenteCommissionDialogResult | undefined) => {
            if (result) this.run(this.api.createCommission(dossier.id, result), 'Commission créée (estimée)');
          });
      },
      error: (error: unknown) => this.notify.error(error, 'Impossible de charger la liste des commerciaux'),
    });
  }

  protected validateCommission(commission: VenteCommission): void {
    const dossier = this.dossier();
    if (dossier) this.run(this.api.validateCommission(dossier.id, commission.id), 'Commission validée');
  }

  protected payCommission(commission: VenteCommission): void {
    const dossier = this.dossier();
    if (dossier && confirm('Marquer cette commission comme payée au commercial ?')) this.run(this.api.payCommission(dossier.id, commission.id), 'Commission payée');
  }

  protected openDocumentDialog(mode: 'generate' | 'upload'): void {
    const dossier = this.dossier();
    if (!dossier) return;
    const options = this.options();
    const types = mode === 'generate' ? (options?.generatedDocumentTypes ?? []) : (options?.documentTypes ?? []);
    if (types.length === 0) {
      this.notify.info('Aucun type de document n’est paramétré (Paramètres › ventes.documentTypes).');
      return;
    }
    const data: VenteDocumentDialogData = { dossierLabel: this.reference(), mode, types, canPublish: this.canPublish };
    this.dialog
      .open(VenteDocumentDialog, { width: '540px', maxWidth: 'calc(100vw - 32px)', data })
      .afterClosed()
      .subscribe((result: VenteDocumentDialogResult | undefined) => {
        if (!result) return;
        const request$ =
          mode === 'generate'
            ? this.api.generateDocument(dossier.id, result.type, result.title, result.isPublic)
            : this.api.addDocument(dossier.id, result.file as File, result.type, result.title, result.isPublic);
        this.run(request$, mode === 'generate' ? 'Document généré' : 'Document ajouté');
      });
  }

  protected removeDocument(documentId: string): void {
    const dossier = this.dossier();
    if (dossier && confirm('Supprimer ce document ?')) this.run(this.api.removeDocument(dossier.id, documentId), 'Document supprimé');
  }

  // --- Interne ----------------------------------------------------------------

  private run(request$: { subscribe: (observer: { next: () => void; error: (error: unknown) => void }) => unknown }, successMessage: string): void {
    const dossier = this.dossier();
    if (!dossier) return;
    this.busy.set(true);
    request$.subscribe({
      next: () => {
        this.notify.success(successMessage);
        this.load(dossier.id);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'L’opération a échoué');
      },
    });
  }

  private load(id: string): void {
    this.api.findOne(id).subscribe({
      next: (dossier) => {
        this.dossier.set(dossier);
        this.loading.set(false);
        this.busy.set(false);
        this.api.getEcheances(id).subscribe({ next: (echeances) => this.echeances.set(echeances), error: () => this.echeances.set([]) });
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.busy.set(false);
        this.notify.error(error, 'Dossier introuvable');
        this.goBack();
      },
    });
  }
}
