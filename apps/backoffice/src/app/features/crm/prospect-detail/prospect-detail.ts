import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArrowLeft,
  LucideCheck,
  LucideChevronDown,
  LucideClock,
  LucideFileText,
  LucideKeyRound,
  LucideMail,
  LucidePencil,
  LucidePhone,
  LucidePlus,
  LucideReceipt,
  LucideTrash2,
  LucideUpload,
  LucideUser,
} from '@lucide/angular';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { ActiviteCrmItem, CommercialSummary, ProspectDetail as ProspectDetailModel, ProspectOptions } from '../../../core/models/prospect.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StatusChoiceDialog } from '../../../shared/dialogs/status-choice-dialog';
import { HistoryDialog } from '../../../shared/dialogs/history-dialog';
import { ActiviteDialog } from '../activite-dialog/activite-dialog';
import { ClientAccountDialog } from '../client-account-dialog/client-account-dialog';
import { SalesDossierDialog } from '../sales-dossier-dialog/sales-dossier-dialog';
import { ACTIVITY_STATUS, ACTIVITY_TYPES, PIPELINE, PRIORITIES, dueLabel, help, isOverdue, label, pillClass, prospectName, statusChoices } from '../crm-status';

const ACTION_LABELS: Record<string, string> = {
  'prospect.created': 'Création du prospect',
  'prospect.updated': 'Modification de la fiche',
  'prospect.deleted': 'Suppression',
  'prospect.pipeline.transition': 'Changement d’étape',
  'prospect.commercial.assigned': 'Affectation à un commercial',
  'prospect.activite.created': 'Action planifiée',
  'prospect.activite.updated': 'Action modifiée',
  'prospect.activite.deleted': 'Action supprimée',
  'prospect.document.created': 'Document ajouté',
  'prospect.document.deleted': 'Document supprimé',
  'contact.converted': 'Converti depuis une demande web',
};

const FIELD_LABELS: Record<string, string> = {
  nom: 'Nom',
  prenom: 'Prénom',
  email: 'E-mail',
  telephone: 'Téléphone',
  paysResidence: 'Pays de résidence',
  sourceAcquisition: 'Origine',
  besoins: 'Besoins',
  budgetMin: 'Budget min',
  budgetMax: 'Budget max',
  preferences: 'Préférences',
  commercialResponsableId: 'Commercial',
  statutPipeline: 'Étape',
  score: 'Score',
  titre: 'Titre',
  type: 'Type',
  statut: 'Statut',
  priorite: 'Priorité',
  dateEcheance: 'Échéance',
};

/**
 * Fiche prospect (J1.5) — vue 360° : coordonnées et besoins, étape du
 * pipeline, actions à faire, dossiers de vente, documents et historique,
 * avec les actions possibles depuis un seul endroit.
 */
@Component({
  selector: 'app-prospect-detail',
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
    LucideCheck,
    LucideChevronDown,
    LucideClock,
    LucideFileText,
    LucideKeyRound,
    LucideMail,
    LucidePencil,
    LucidePhone,
    LucidePlus,
    LucideReceipt,
    LucideTrash2,
    LucideUpload,
    LucideUser,
  ],
  templateUrl: './prospect-detail.html',
  styleUrl: './prospect-detail.scss',
})
export class ProspectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly prospect = signal<ProspectDetailModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly options = signal<ProspectOptions | null>(null);
  protected readonly commercials = signal<CommercialSummary[]>([]);
  protected readonly canModify = this.session.hasPermission('crm:modifier');
  protected readonly canDelete = this.session.hasPermission('crm:supprimer');
  protected readonly canCreateClient = this.session.hasPermission('clients:creer');
  protected readonly canCreateSale = this.session.hasPermission('ventes:creer');
  protected readonly canSeeSales = this.session.hasPermission('ventes:consulter');
  protected readonly isSupervisor = this.session.hasSupervisionScope('crm');

  protected readonly name = computed(() => (this.prospect() ? prospectName(this.prospect()!) : ''));
  protected readonly stages = computed(() => this.options()?.pipelineStages.filter((stage) => stage !== 'perdu') ?? []);
  protected readonly stageIndex = computed(() => this.stages().indexOf(this.prospect()?.statutPipeline ?? ''));
  protected readonly isLost = computed(() => this.prospect()?.statutPipeline === 'perdu');

  protected readonly pending = computed(() =>
    (this.prospect()?.activites ?? [])
      .filter((activite) => activite.statut === 'a_faire')
      .sort((a, b) => (a.dateEcheance ?? '9999').localeCompare(b.dateEcheance ?? '9999')),
  );
  protected readonly done = computed(() =>
    (this.prospect()?.activites ?? [])
      .filter((activite) => activite.statut !== 'a_faire')
      .sort((a, b) => (b.dateRealisation ?? b.dateEcheance ?? b.createdAt).localeCompare(a.dateRealisation ?? a.dateEcheance ?? a.createdAt)),
  );
  protected readonly overdueCount = computed(() => this.pending().filter((activite) => isOverdue(activite)).length);

  /** Ce qu'il faut faire pour faire avancer ce prospect. */
  protected readonly todo = computed(() => {
    const prospect = this.prospect();
    if (!prospect || this.isLost()) return [];
    const items: { label: string; hint: string }[] = [];
    if (!prospect.telephone && !prospect.email) items.push({ label: 'Renseigner un moyen de contact', hint: 'Impossible de le rappeler sans téléphone ni e-mail.' });
    if (!prospect.commercialResponsable) items.push({ label: 'Affecter un commercial', hint: 'Personne ne suit ce prospect pour l’instant.' });
    if (this.pending().length === 0 && prospect.statutPipeline !== 'vente') items.push({ label: 'Planifier la prochaine action', hint: 'Un prospect sans action prévue est un prospect oublié.' });
    if (this.overdueCount() > 0) items.push({ label: `Traiter ${this.overdueCount()} action${this.overdueCount() > 1 ? 's' : ''} en retard`, hint: 'Marquez-les réalisées ou reportez-les.' });
    if (!prospect.budgetMax && !prospect.besoins) items.push({ label: 'Qualifier le besoin', hint: 'Budget et type de terrain recherché.' });
    return items;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }
    this.api.getOptions().subscribe({ next: (options) => this.options.set(options) });
    if (this.isSupervisor) this.api.getCommercials().subscribe({ next: (list) => this.commercials.set(list), error: () => this.commercials.set([]) });
    this.load(id);
  }

  // --- Navigation ---------------------------------------------------------

  protected goBack(): void {
    void this.router.navigate(['/crm/prospects']);
  }

  protected edit(): void {
    const prospect = this.prospect();
    if (prospect) void this.router.navigate(['/crm/prospects', prospect.id, 'modifier']);
  }

  protected openDossier(id: string): void {
    void this.router.navigate(['/ventes', id]);
  }

  // --- Libellés -------------------------------------------------------------

  protected stageLabel(stage: string | null | undefined): string {
    return label(PIPELINE, stage);
  }

  protected stageHelp(stage: string | null | undefined): string {
    return help(PIPELINE, stage);
  }

  protected stagePill(stage: string | null | undefined): string {
    return pillClass(PIPELINE, stage);
  }

  protected typeLabel(type: string): string {
    return label(ACTIVITY_TYPES, type);
  }

  protected typePill(type: string): string {
    return pillClass(ACTIVITY_TYPES, type);
  }

  protected statusLabel(statut: string): string {
    return label(ACTIVITY_STATUS, statut);
  }

  protected statusPill(statut: string): string {
    return pillClass(ACTIVITY_STATUS, statut);
  }

  protected priorityLabel(priorite: string): string {
    return label(PRIORITIES, priorite);
  }

  protected priorityPill(priorite: string): string {
    return pillClass(PRIORITIES, priorite);
  }

  protected due(activite: ActiviteCrmItem): string {
    return dueLabel(activite.dateEcheance);
  }

  protected overdue(activite: ActiviteCrmItem): boolean {
    return isOverdue(activite);
  }

  // --- Actions --------------------------------------------------------------

  protected changeStage(): void {
    const prospect = this.prospect();
    const options = this.options();
    if (!prospect || !options) return;
    StatusChoiceDialog.open(this.dialog, {
      title: 'Changer d’étape',
      intro: 'L’étape indique où en est la relation commerciale. « Perdu » demande une justification, conservée dans l’historique.',
      subject: `Prospect ${this.name()}`,
      current: prospect.statutPipeline,
      choices: statusChoices(PIPELINE, options.pipelineStages),
      justification: false,
    }).subscribe((result) => {
      if (!result) return;
      if (result.value === 'perdu') {
        const justification = window.prompt('Pourquoi ce prospect est-il perdu ? (obligatoire, conservé dans l’historique)')?.trim();
        if (!justification || justification.length < 3) {
          this.notify.info('Justification obligatoire (3 caractères minimum) pour marquer un prospect perdu.');
          return;
        }
        this.run(this.api.transitionPipeline(prospect.id, result.value, justification), 'Prospect marqué perdu');
        return;
      }
      this.run(this.api.transitionPipeline(prospect.id, result.value), `Étape : ${this.stageLabel(result.value)}`);
    });
  }

  protected assignCommercial(): void {
    const prospect = this.prospect();
    if (!prospect || !this.commercials().length) return;
    StatusChoiceDialog.open(this.dialog, {
      title: 'Affecter un commercial',
      intro: 'Le commercial responsable voit ce prospect dans sa liste et reçoit ses rappels.',
      subject: `Prospect ${this.name()}`,
      current: prospect.commercialResponsable?.id ?? '',
      choices: this.commercials().map((commercial) => ({ value: commercial.id, label: `${commercial.firstName} ${commercial.lastName}`, help: '', tone: 'primary' as const })),
      confirmLabel: 'Affecter',
    }).subscribe((result) => {
      if (result) this.run(this.api.assignCommercial(prospect.id, result.value), 'Commercial affecté');
    });
  }

  protected planActivity(type?: string): void {
    const prospect = this.prospect();
    if (!prospect) return;
    ActiviteDialog.open(this.dialog, { prospectName: this.name(), type }).subscribe((payload) => {
      if (payload) this.run(this.api.addActivite(prospect.id, payload), 'Action planifiée');
    });
  }

  protected editActivity(activite: ActiviteCrmItem): void {
    const prospect = this.prospect();
    if (!prospect) return;
    ActiviteDialog.open(this.dialog, { prospectName: this.name(), activite }).subscribe((payload) => {
      if (payload) this.run(this.api.updateActivite(prospect.id, activite.id, payload), 'Action mise à jour');
    });
  }

  protected completeActivity(activite: ActiviteCrmItem): void {
    const prospect = this.prospect();
    if (!prospect) return;
    this.run(this.api.updateActivite(prospect.id, activite.id, { statut: 'realise' }), 'Action marquée réalisée');
  }

  protected removeActivity(activite: ActiviteCrmItem): void {
    const prospect = this.prospect();
    if (!prospect || !confirm(`Supprimer l’action « ${activite.titre} » ?`)) return;
    this.run(this.api.removeActivite(prospect.id, activite.id), 'Action supprimée');
  }

  protected openCreateSalesDossier(): void {
    const prospect = this.prospect();
    if (!prospect || !this.canCreateSale) return;
    this.dialog
      .open(SalesDossierDialog, { width: '560px', maxWidth: 'calc(100vw - 32px)', data: { prospectId: prospect.id, prospectName: this.name(), budgetMax: prospect.budgetMax } })
      .afterClosed()
      .subscribe((created: { id: string } | undefined) => {
        if (!created) return;
        // « Ouvrir le dossier » : on arrive directement sur le dossier créé,
        // où se font la réservation et les paiements.
        this.notify.success('Dossier de vente ouvert : réservez le terrain puis enregistrez les paiements ici');
        void this.router.navigate(['/ventes', created.id]);
      });
  }

  protected openCreateClientAccount(): void {
    const prospect = this.prospect();
    if (!prospect?.email || !this.canCreateClient) return;
    this.dialog.open(ClientAccountDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)', data: { prospectId: prospect.id, email: prospect.email, name: this.name() } });
  }

  protected uploadDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const prospect = this.prospect();
    input.value = '';
    if (!files.length || !prospect) return;
    this.busy.set(true);
    let remaining = files.length;
    const done = () => {
      remaining -= 1;
      if (remaining > 0) return;
      this.notify.success(files.length > 1 ? `${files.length} documents ajoutés` : 'Document ajouté');
      this.load(prospect.id);
    };
    for (const file of files) {
      this.api.addDocument(prospect.id, file, 'justificatif', file.name.replace(/\.[^.]+$/, '')).subscribe({
        next: done,
        error: (error: unknown) => {
          this.notify.error(error, `Impossible d’ajouter ${file.name}`);
          done();
        },
      });
    }
  }

  protected removeDocument(documentId: string): void {
    const prospect = this.prospect();
    if (!prospect || !confirm('Supprimer ce document ?')) return;
    this.run(this.api.removeDocument(prospect.id, documentId), 'Document supprimé');
  }

  protected removeProspect(): void {
    const prospect = this.prospect();
    if (!prospect || !confirm(`Supprimer définitivement ${this.name()} ? Cette action est tracée.`)) return;
    this.busy.set(true);
    this.api.remove(prospect.id).subscribe({
      next: () => {
        this.notify.success('Prospect supprimé');
        this.goBack();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'Impossible de supprimer ce prospect');
      },
    });
  }

  protected openHistory(): void {
    const prospect = this.prospect();
    if (!prospect) return;
    HistoryDialog.open(this.dialog, {
      subject: `Prospect ${this.name()}`,
      load: () => this.api.getHistory(prospect.id),
      actionLabels: ACTION_LABELS,
      fieldLabels: FIELD_LABELS,
      moneyFields: ['budgetMin', 'budgetMax'],
    });
  }

  // --- Interne --------------------------------------------------------------

  private run(request$: { subscribe: (observer: { next: () => void; error: (error: unknown) => void }) => unknown }, successMessage: string): void {
    const prospect = this.prospect();
    if (!prospect) return;
    this.busy.set(true);
    request$.subscribe({
      next: () => {
        this.notify.success(successMessage);
        this.load(prospect.id);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'L’opération a échoué');
      },
    });
  }

  private load(id: string): void {
    this.api.findOne(id).subscribe({
      next: (prospect) => {
        this.prospect.set(prospect);
        this.loading.set(false);
        this.busy.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.busy.set(false);
        this.notify.error(error, 'Prospect introuvable');
        this.goBack();
      },
    });
  }
}
