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
  LucideShieldCheck,
  LucideTrash2,
  LucideUpload,
  LucideUser,
} from '@lucide/angular';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { ActiviteCrmItem, CommercialSummary, ProspectDetail as ProspectDetailModel, ProspectOptions, VisiteProspectItem } from '../../../core/models/prospect.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StatusChoiceDialog } from '../../../shared/dialogs/status-choice-dialog';
import { HistoryDialog } from '../../../shared/dialogs/history-dialog';
import { ActiviteDialog } from '../activite-dialog/activite-dialog';
import { ClientAccountDialog } from '../../../shared/dialogs/client-account-dialog';
import { SalesDossierDialog } from '../sales-dossier-dialog/sales-dossier-dialog';
import { VisiteDialog } from '../visite-dialog/visite-dialog';
import {
  ACTIVITY_STATUS,
  ACTIVITY_TYPES,
  CLOSED_STAGES,
  CONTACT_CHANNELS,
  EXIT_STAGES,
  INTEREST_LEVELS,
  OBJECTIONS,
  PIPELINE,
  PRICE_FEEDBACK,
  PRIORITIES,
  PURCHASE_GOALS,
  SOURCES,
  VISITE_CANCEL_REASONS,
  VISITE_FEEDBACK,
  VISITE_STATUS,
  dueLabel,
  help,
  isOverdue,
  label,
  pillClass,
  prospectName,
  relanceState,
  statusChoices,
  telLink,
  whatsappLink,
} from '../crm-status';

const ACTION_LABELS: Record<string, string> = {
  'prospect.created': 'Création du prospect',
  'prospect.updated': 'Modification de la fiche',
  'prospect.deleted': 'Suppression',
  'prospect.pipeline.transition': 'Changement d’étape',
  'prospect.commercial.assigned': 'Affectation à un commercial',
  'prospect.activite.created': 'Action planifiée',
  'prospect.activite.updated': 'Action modifiée',
  'prospect.activite.deleted': 'Action supprimée',
  'prospect.visite.created': 'Terrain proposé',
  'prospect.visite.updated': 'Visite ou retour mis à jour',
  'prospect.visite.deleted': 'Proposition supprimée',
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
  sourceAcquisition: 'Source',
  whatsapp: 'WhatsApp',
  villeResidence: 'Ville',
  niveauInteret: 'Niveau d’intérêt',
  zoneRecherchee: 'Zone recherchée',
  surfaceSouhaitee: 'Surface souhaitée',
  typeDocumentSouhaite: 'Document attendu',
  objectifAchat: 'Objectif',
  premierContactLe: 'Premier contact',
  premierContactMoyen: 'Moyen du premier contact',
  prochaineAction: 'Prochaine action',
  prochaineRelanceLe: 'Date de relance',
  motifSortie: 'Motif de sortie',
  terrainChoisiId: 'Terrain choisi',
  offreClient: 'Offre du client',
  prixNegocie: 'Prix négocié',
  commentaireNegociation: 'Commentaire de négociation',
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
    LucideShieldCheck,
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
  private readonly ventesApi = inject(VentesApiService);
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
  /** Ce client peut se voir ouvrir une mission de vérification foncière (J2.2). */
  protected readonly canCreateMission = computed(() => this.session.hasPermission('demarches:creer'));
  protected readonly canSeeSales = this.session.hasPermission('ventes:consulter');
  protected readonly isSupervisor = this.session.hasSupervisionScope('crm');

  protected readonly name = computed(() => (this.prospect() ? prospectName(this.prospect()!) : ''));
  /** Fil du parcours : les sorties n'y figurent pas, elles l'interrompent. */
  protected readonly stages = computed(() => (this.options()?.pipelineStages ?? []).filter((stage) => !EXIT_STAGES.includes(stage)));
  protected readonly stageIndex = computed(() => this.stages().indexOf(this.prospect()?.statutPipeline ?? ''));
  protected readonly isLost = computed(() => EXIT_STAGES.includes(this.prospect()?.statutPipeline ?? ''));
  protected readonly isClosed = computed(() => CLOSED_STAGES.includes(this.prospect()?.statutPipeline ?? ''));

  protected readonly visites = computed(() => this.prospect()?.visites ?? []);
  protected readonly telHref = computed(() => telLink(this.prospect()?.telephone));
  protected readonly whatsappHref = computed(() => (this.prospect()?.whatsapp ? whatsappLink(this.prospect()?.telephone) : null));
  /** État de la relance : sert à colorer le bandeau de suivi. */
  protected readonly relance = computed(() => relanceState(this.prospect()?.prochaineRelanceLe));

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
    if (!prospect.prochaineRelanceLe && !this.isClosed()) items.push({ label: 'Programmer la prochaine relance', hint: 'Règle MTM : aucun prospect actif ne reste sans prochaine action.' });
    if (this.relance() === 'en_retard') items.push({ label: 'Relance en retard', hint: 'La date de relance est dépassée : appelez ou reprogrammez.' });
    if (this.visites().some((visite) => visite.statut === 'effectuee' && !visite.terrainPlait)) items.push({ label: 'Saisir le retour après visite', hint: 'Après chaque visite, notez ce que le client en a pensé.' });
    if (this.overdueCount() > 0) items.push({ label: `Traiter ${this.overdueCount()} action${this.overdueCount() > 1 ? 's' : ''} en retard`, hint: 'Marquez-les réalisées ou reportez-les.' });
    if (!prospect.budgetMax && !prospect.zoneRecherchee && !prospect.besoins) items.push({ label: 'Qualifier le besoin', hint: 'Zone, surface, budget et objectif de l’achat.' });
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

  /** « Dakar, Sénégal » — ce qui est renseigné, sans virgule orpheline. */
  protected residence(prospect: ProspectDetailModel): string {
    return [prospect.villeResidence, prospect.paysResidence].filter(Boolean).join(', ') || '—';
  }

  protected interestLabel(niveau: string | null | undefined): string {
    return label(INTEREST_LEVELS, niveau);
  }

  protected interestPill(niveau: string | null | undefined): string {
    return pillClass(INTEREST_LEVELS, niveau);
  }

  protected sourceLabel(source: string | null | undefined): string {
    return label(SOURCES, source);
  }

  protected channelLabel(moyen: string | null | undefined): string {
    return label(CONTACT_CHANNELS, moyen);
  }

  protected goalLabel(objectif: string | null | undefined): string {
    return label(PURCHASE_GOALS, objectif);
  }

  protected visiteLabel(statut: string): string {
    return label(VISITE_STATUS, statut);
  }

  protected visitePill(statut: string): string {
    return pillClass(VISITE_STATUS, statut);
  }

  protected feedbackLabel(avis: string | null): string {
    return label(VISITE_FEEDBACK, avis);
  }

  protected feedbackPill(avis: string | null): string {
    return pillClass(VISITE_FEEDBACK, avis);
  }

  protected priceLabel(avis: string | null): string {
    return label(PRICE_FEEDBACK, avis);
  }

  protected objectionLabel(objection: string | null): string {
    return label(OBJECTIONS, objection);
  }

  protected cancelLabel(motif: string | null): string {
    return label(VISITE_CANCEL_REASONS, motif);
  }

  protected relanceLabel(): string {
    const prospect = this.prospect();
    if (!prospect?.prochaineRelanceLe) return 'Aucune relance programmée';
    return dueLabel(prospect.prochaineRelanceLe);
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
      intro:
        'L’étape indique où en est la relation commerciale. Une sortie (refusé, projet abandonné, injoignable) demande un motif, conservé dans l’historique.',
      subject: `Prospect ${this.name()}`,
      current: prospect.statutPipeline,
      choices: statusChoices(PIPELINE, options.pipelineStages),
      justification: false,
    }).subscribe((result) => {
      if (!result) return;
      if (EXIT_STAGES.includes(result.value)) {
        const motif = window.prompt(`Motif : pourquoi ce prospect passe-t-il en « ${this.stageLabel(result.value)} » ? (obligatoire, conservé dans l’historique)`)?.trim();
        if (!motif || motif.length < 3) {
          this.notify.info('Motif obligatoire (3 caractères minimum) pour sortir un prospect du parcours.');
          return;
        }
        this.run(this.api.transitionPipeline(prospect.id, result.value, motif), `Prospect : ${this.stageLabel(result.value)}`);
        return;
      }
      // Règle MTM : un prospect qui reste actif doit avoir une suite prévue.
      const suivi = prospect.prochaineRelanceLe || result.value === 'vente' ? undefined : this.askNextAction();
      if (suivi === null) return;
      this.run(this.api.transitionPipeline(prospect.id, result.value, undefined, suivi), `Étape : ${this.stageLabel(result.value)}`);
    });
  }

  /**
   * Demande la prochaine action et sa date. Renvoie `null` si l'utilisateur
   * renonce — la transition est alors abandonnée plutôt que refusée par l'API.
   */
  private askNextAction(): { prochaineAction: string; prochaineRelanceLe: string } | null {
    const action = window.prompt('Prochaine action à mener ? (obligatoire : aucun prospect actif ne reste sans suite)')?.trim();
    if (!action) {
      this.notify.info('Indiquez la prochaine action pour faire avancer ce prospect.');
      return null;
    }
    const jours = window.prompt('Dans combien de jours le relancer ?', '3')?.trim();
    const delai = Number(jours);
    if (!jours || Number.isNaN(delai) || delai < 0) {
      this.notify.info('Indiquez un nombre de jours valide pour la relance.');
      return null;
    }
    const date = new Date();
    date.setDate(date.getDate() + delai);
    return { prochaineAction: action, prochaineRelanceLe: date.toISOString() };
  }

  /** Reprogrammer la relance sans changer d'étape. */
  protected planRelance(): void {
    const prospect = this.prospect();
    if (!prospect) return;
    const suivi = this.askNextAction();
    if (!suivi) return;
    this.run(this.api.update(prospect.id, suivi), 'Relance programmée');
  }

  protected proposeTerrain(): void {
    const prospect = this.prospect();
    if (!prospect) return;
    VisiteDialog.open(this.dialog, { prospectName: this.name(), commercials: this.commercials() }).subscribe((payload) => {
      if (payload) this.run(this.api.addVisite(prospect.id, payload), 'Terrain proposé au client');
    });
  }

  protected editVisite(visite: VisiteProspectItem): void {
    const prospect = this.prospect();
    if (!prospect) return;
    VisiteDialog.open(this.dialog, { prospectName: this.name(), visite, commercials: this.commercials() }).subscribe((payload) => {
      if (payload) this.run(this.api.updateVisite(prospect.id, visite.id, payload), 'Visite mise à jour');
    });
  }

  /** Fiche du terrain proposé : photos, documents et caractéristiques à montrer au client. */
  protected openTerrain(terrainId: string): void {
    void this.router.navigate(['/terrains', terrainId]);
  }

  protected removeVisite(visite: VisiteProspectItem): void {
    const prospect = this.prospect();
    if (!prospect || !confirm(`Retirer la proposition « ${visite.terrain.referenceInterne} · ${visite.terrain.nom} » ?`)) return;
    this.run(this.api.removeVisite(prospect.id, visite.id), 'Proposition retirée');
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

  /**
   * Ouvre le formulaire de mission avec ce client déjà sélectionné : le
   * collaborateur n'a plus qu'à décrire ce qu'il faut vérifier.
   */
  protected demanderVerification(): void {
    const prospect = this.prospect();
    if (!prospect) return;
    void this.router.navigate(['/demarches/missions/nouvelle'], {
      queryParams: { prospectId: prospect.id },
    });
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
    ClientAccountDialog.open(this.dialog, {
      email: prospect.email,
      name: this.name(),
      scopeDescription: 'suivre ses dossiers, paiements et documents',
      create: (password) => this.ventesApi.createClientAccount(prospect.id, password),
    });
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
