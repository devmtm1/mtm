import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArrowLeft,
  LucideBanknote,
  LucideBellRing,
  LucideCheck,
  LucideFileText,
  LucidePiggyBank,
  LucidePlus,
  LucideReceipt,
  LucideTrash2,
  LucideUpload,
  LucideUserRoundX,
  LucideX,
} from '@lucide/angular';
import type { Observable } from 'rxjs';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type {
  BailDetail,
  BienDetail,
  CautionBail,
  DocumentLocatif,
  EcheanceLoyer,
  IncidentLocatif,
  Locataire,
  LocatifOptions,
  LocatifPersonne,
  PaiementLoyer,
  RelanceLoyer,
  SoldeBail,
} from '../../../core/models/locatif.model';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { JustificationDialog } from '../../../shared/dialogs/justification-dialog';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  BAIL_STATUTS,
  BAIL_STATUTS_TERMINES,
  BIEN_STATUTS,
  CAUTION_STATUTS,
  ECHEANCE_STATUTS,
  MODELES_RELANCE,
  MODES_PAIEMENT,
  NATURES_SIGNALEMENT,
  SITUATIONS_PAIEMENT,
  STATUTS_INCIDENT,
  STATUTS_PAIEMENT,
  STATUTS_RELANCE,
  TYPES_BIEN,
  TYPES_DOCUMENT,
  TYPES_MOUVEMENT_CAUTION,
  TYPES_PAIEMENT,
  estARelancer,
  label,
  nomPersonne,
  pillClass,
  simpleLabel,
  typeSignalementLabel,
} from '../locatif-status';
import { BailDialog } from './bail-dialog';
import { CautionDialog } from './caution-dialog';
import { ChangementLocataireDialog } from './changement-locataire-dialog';
import { PaiementDialog } from './paiement-dialog';
import { PreavisDialog } from './preavis-dialog';
import { SignalementDialog } from './signalement-dialog';
import { SortieDialog } from './sortie-dialog';

/**
 * Fiche d'un bien locatif : ses informations, le bail en cours (ou son
 * historique complet), les échéances, les versements et leur validation, la
 * caution et son historique, les signalements, les relances et les documents
 * (J2.1, section 15 du cahier des charges).
 */
@Component({
  selector: 'app-bien-detail',
  imports: [
    DatePipe,
    MoneyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucideBanknote,
    LucideBellRing,
    LucideCheck,
    LucideFileText,
    LucidePiggyBank,
    LucidePlus,
    LucideReceipt,
    LucideTrash2,
    LucideUpload,
    LucideUserRoundX,
    LucideX,
  ],
  templateUrl: './bien-detail.html',
  styleUrl: './bien-detail.scss',
})
export class BienDetailPage implements OnInit {
  private readonly api = inject(LocatifApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessionService = inject(SessionService);

  protected readonly bien = signal<BienDetail | null>(null);
  protected readonly bauxHistorique = signal<BailDetail[]>([]);
  protected readonly bailActuel = signal<BailDetail | null>(null);
  protected readonly locataires = signal<Locataire[]>([]);
  protected readonly collaborateurs = signal<LocatifPersonne[]>([]);
  protected readonly options = signal<Partial<LocatifOptions>>({});
  protected readonly documents = signal<DocumentLocatif[]>([]);
  protected readonly paiements = signal<PaiementLoyer[]>([]);
  protected readonly caution = signal<CautionBail | null>(null);
  protected readonly solde = signal<SoldeBail | null>(null);
  protected readonly relances = signal<RelanceLoyer[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly canModify = computed(() => this.sessionService.hasPermission('locatif:modifier'));
  protected readonly canValidate = computed(() => this.sessionService.hasPermission('locatif:valider'));
  protected readonly canPublish = computed(() => this.sessionService.hasPermission('locatif:publier'));
  protected readonly canDelete = computed(() => this.sessionService.hasPermission('locatif:supprimer'));
  protected readonly canPay = computed(() => this.sessionService.hasPermission('locatif:payer'));

  protected readonly bauxTermines = computed(() =>
    this.bauxHistorique().filter((b) => BAIL_STATUTS_TERMINES.includes(b.statut)),
  );

  /** Versements en attente du contrôle : ce que le comptable doit trancher. */
  protected readonly paiementsAValider = computed(() =>
    this.paiements().filter((paiement) => paiement.statut === 'en_attente'),
  );

  protected readonly relancesAEnvoyer = computed(() =>
    this.relances().filter((relance) => relance.statut === 'a_envoyer'),
  );

  protected readonly incidents = computed(() =>
    (this.bailActuel()?.incidents ?? []).filter((item) => item.nature !== 'demande'),
  );

  protected readonly demandes = computed(() =>
    (this.bailActuel()?.incidents ?? []).filter((item) => item.nature === 'demande'),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    type: [''],
    adresse: [''],
    commune: [''],
    region: [''],
    superficie: [null as number | null],
    notes: [''],
    responsableId: [''],
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({ next: (o) => this.options.set(o), error: () => this.options.set({}) });
    this.api.getCollaborateurs().subscribe({
      next: (liste) => this.collaborateurs.set(liste),
      error: () => this.collaborateurs.set([]),
    });
    this.api.findLocataires().subscribe({
      next: (liste) => this.locataires.set(liste),
      error: () => this.locataires.set([]),
    });
    this.charger();
  }

  protected retour(): void {
    void this.router.navigate(['/locatif/biens']);
  }

  // --- Libellés ---

  protected typeLabel(v: string): string {
    return simpleLabel(TYPES_BIEN, v);
  }
  protected bienStatutLabel(v: string): string {
    return label(BIEN_STATUTS, v);
  }
  protected bienStatutPill(v: string): string {
    return pillClass(BIEN_STATUTS, v);
  }
  protected bailStatutLabel(v: string): string {
    return label(BAIL_STATUTS, v);
  }
  protected bailStatutPill(v: string): string {
    return pillClass(BAIL_STATUTS, v);
  }
  protected situationLabel(v: string): string {
    return label(SITUATIONS_PAIEMENT, v);
  }
  protected situationPill(v: string): string {
    return pillClass(SITUATIONS_PAIEMENT, v);
  }
  protected situationHelp(v: string): string {
    return SITUATIONS_PAIEMENT[v]?.help ?? '';
  }
  protected echeanceLabel(v: string): string {
    return label(ECHEANCE_STATUTS, v);
  }
  protected echeancePill(v: string): string {
    return pillClass(ECHEANCE_STATUTS, v);
  }
  protected cautionLabel(v: string): string {
    return label(CAUTION_STATUTS, v);
  }
  protected cautionPill(v: string): string {
    return pillClass(CAUTION_STATUTS, v);
  }
  protected mouvementLabel(v: string): string {
    return simpleLabel(TYPES_MOUVEMENT_CAUTION, v);
  }
  protected paiementTypeLabel(v: string): string {
    return simpleLabel(TYPES_PAIEMENT, v);
  }
  protected paiementStatutLabel(v: string): string {
    return label(STATUTS_PAIEMENT, v);
  }
  protected paiementStatutPill(v: string): string {
    return pillClass(STATUTS_PAIEMENT, v);
  }
  protected modeLabel(v: string): string {
    return simpleLabel(MODES_PAIEMENT, v);
  }
  protected natureLabel(v: string): string {
    return simpleLabel(NATURES_SIGNALEMENT, v);
  }
  protected signalementTypeLabel(incident: IncidentLocatif): string {
    return typeSignalementLabel(incident.nature, incident.type);
  }
  protected incidentStatutLabel(v: string): string {
    return label(STATUTS_INCIDENT, v);
  }
  protected incidentStatutPill(v: string): string {
    return pillClass(STATUTS_INCIDENT, v);
  }
  protected relanceModeleLabel(v: string): string {
    return simpleLabel(MODELES_RELANCE, v);
  }
  protected relanceStatutLabel(v: string): string {
    return label(STATUTS_RELANCE, v);
  }
  protected relanceStatutPill(v: string): string {
    return pillClass(STATUTS_RELANCE, v);
  }
  protected documentLabel(v: string): string {
    return simpleLabel(TYPES_DOCUMENT, v);
  }
  protected personne(v: { firstName: string | null; lastName: string | null } | null): string {
    return nomPersonne(v);
  }
  protected relance(v: string): boolean {
    return estARelancer(v);
  }

  // --- Bien ---

  protected enregistrerBien(): void {
    const bien = this.bien();
    if (!bien) return;
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.executer(
      this.api.updateBien(bien.id, {
        type: valeur.type || undefined,
        adresse: texte(valeur.adresse),
        commune: texte(valeur.commune),
        region: texte(valeur.region),
        superficie: valeur.superficie ?? undefined,
        notes: texte(valeur.notes),
        responsableId: valeur.responsableId || undefined,
      }),
      'Bien mis à jour',
    );
  }

  protected supprimerBien(): void {
    const bien = this.bien();
    if (!bien) return;
    if (!confirm(`Supprimer définitivement le bien ${bien.referenceInterne} ?`)) return;
    this.api.removeBien(bien.id).subscribe({
      next: () => {
        this.notify.success('Bien supprimé');
        this.retour();
      },
      error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
    });
  }

  /** Relevé de gestion publié au propriétaire (backlog J2.1). */
  protected genererReleve(): void {
    const bien = this.bien();
    if (!bien) return;
    this.executer(
      this.api.genererReleve(bien.id),
      'Relevé de gestion publié dans l’espace propriétaire',
    );
  }

  // --- Bail ---

  protected creerBail(): void {
    const bien = this.bien();
    if (!bien) return;
    BailDialog.open(this.dialog, { locataires: this.locataires() }).subscribe((payload) => {
      if (!payload) return;
      this.executer(this.api.createBail(bien.id, payload), 'Bail créé');
    });
  }

  protected donnerPreavis(): void {
    const bail = this.bailActuel();
    if (!bail) return;
    PreavisDialog.open(this.dialog).subscribe((payload) => {
      if (!payload) return;
      this.executer(this.api.donnerPreavis(bail.id, payload), 'Préavis enregistré');
    });
  }

  /**
   * Clôture : on demande d'abord à l'API son calcul de régularisation, pour
   * que l'écran propose des montants au lieu de les laisser deviner.
   */
  protected cloturerBail(): void {
    const bail = this.bailActuel();
    if (!bail) return;
    this.api.getRegularisation(bail.id).subscribe({
      next: (regularisation) => this.ouvrirSortie(bail.id, regularisation),
      error: () => this.ouvrirSortie(bail.id, null),
    });
  }

  private ouvrirSortie(
    bailId: string,
    regularisation: Parameters<typeof SortieDialog.open>[1]['regularisation'],
  ): void {
    SortieDialog.open(this.dialog, { regularisation }).subscribe((payload) => {
      if (!payload) return;
      this.executer(
        this.api.cloturerBail(bailId, payload),
        'Bail clôturé, le bien est de nouveau disponible',
      );
    });
  }

  protected resilierSansPreavis(): void {
    const bail = this.bailActuel();
    if (!bail) return;
    JustificationDialog.ask(this.dialog, {
      title: 'Résilier sans préavis',
      description: 'Départ constaté sans préavis ni restitution normale : le motif reste sur le dossier.',
      confirmLabel: 'Résilier le bail',
    }).subscribe((motif) => {
      if (!motif) return;
      this.executer(this.api.resilierSansPreavis(bail.id, { motifCloture: motif }), 'Bail résilié');
    });
  }

  protected changerLocataire(): void {
    const bien = this.bien();
    if (!bien) return;
    ChangementLocataireDialog.open(this.dialog, { locataires: this.locataires() }).subscribe((payload) => {
      if (!payload) return;
      this.executer(this.api.changerLocataire(bien.id, payload), 'Locataire changé');
    });
  }

  // --- Paiements, validation et quittances ---

  protected enregistrerPaiement(echeance?: EcheanceLoyer): void {
    const bail = this.bailActuel();
    if (!bail) return;
    PaiementDialog.open(this.dialog, { options: this.options(), echeance }).subscribe((payload) => {
      if (!payload) return;
      this.executer(
        this.api.createPaiement(bail.id, payload),
        'Versement enregistré : il sera imputé à sa validation',
      );
    });
  }

  protected validerPaiement(paiement: PaiementLoyer): void {
    const bail = this.bailActuel();
    if (!bail) return;
    this.executer(
      this.api.validerPaiement(bail.id, paiement.id),
      'Encaissement validé et imputé',
    );
  }

  protected rejeterPaiement(paiement: PaiementLoyer): void {
    const bail = this.bailActuel();
    if (!bail) return;
    JustificationDialog.ask(this.dialog, {
      title: 'Rejeter l’encaissement',
      description:
        'Le motif reste au dossier. Un versement déjà validé est retiré des échéances.',
      confirmLabel: 'Rejeter',
    }).subscribe((motif) => {
      if (!motif) return;
      this.executer(
        this.api.rejeterPaiement(bail.id, paiement.id, { motif }),
        'Encaissement rejeté',
      );
    });
  }

  protected genererQuittance(echeance: EcheanceLoyer): void {
    const bail = this.bailActuel();
    if (!bail) return;
    this.executer(
      this.api.genererQuittance(bail.id, echeance.id),
      'Quittance générée et publiée dans l’espace locataire',
    );
  }

  // --- Caution ---

  protected enregistrerMouvementCaution(): void {
    const bail = this.bailActuel();
    if (!bail) return;
    CautionDialog.open(this.dialog, {
      options: this.options(),
      etat: this.caution()?.etat ?? null,
      peutPayer: this.canPay(),
    }).subscribe((payload) => {
      if (!payload) return;
      this.executer(
        this.api.enregistrerMouvementCaution(bail.id, payload),
        'Mouvement de caution enregistré',
      );
    });
  }

  // --- Incidents et demandes ---

  protected creerSignalement(): void {
    const bail = this.bailActuel();
    if (!bail) return;
    SignalementDialog.open(this.dialog, { options: this.options() }).subscribe((payload) => {
      if (!payload) return;
      this.executer(this.api.createIncident(bail.id, payload), 'Signalement enregistré');
    });
  }

  protected resoudreIncident(incidentId: string): void {
    const bail = this.bailActuel();
    if (!bail) return;
    this.executer(
      this.api.updateIncident(bail.id, incidentId, { statut: 'resolu' }),
      'Signalement marqué résolu',
    );
  }

  // --- Relances ---

  protected envoyerRelance(relance: RelanceLoyer): void {
    this.executer(
      this.api.envoyerRelance(relance.id, { canal: relance.canal }),
      'Relance envoyée',
    );
  }

  protected annulerRelance(relance: RelanceLoyer): void {
    this.executer(this.api.annulerRelance(relance.id), 'Relance abandonnée');
  }

  // --- Documents ---

  protected televerser(evenement: Event, type: string): void {
    const bail = this.bailActuel();
    const input = evenement.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!bail || !fichier) return;
    this.executer(this.api.addDocument(bail.id, type, fichier), 'Pièce ajoutée');
    input.value = '';
  }

  /** Deux audiences distinctes : publier au locataire n'expose rien au propriétaire. */
  protected basculerVisibiliteLocataire(document: DocumentLocatif): void {
    const bail = this.bailActuel();
    if (!bail) return;
    this.executer(
      this.api.setDocumentVisibility(bail.id, document.id, {
        visibleLocataire: !document.visibleLocataire,
      }),
      document.visibleLocataire
        ? 'Pièce retirée de l’espace locataire'
        : 'Pièce visible par le locataire',
    );
  }

  protected basculerVisibiliteProprietaire(document: DocumentLocatif): void {
    const bail = this.bailActuel();
    if (!bail) return;
    this.executer(
      this.api.setDocumentVisibility(bail.id, document.id, {
        visibleProprietaire: !document.visibleProprietaire,
      }),
      document.visibleProprietaire
        ? 'Pièce retirée de l’espace propriétaire'
        : 'Pièce visible par le propriétaire',
    );
  }

  protected supprimerDocument(document: DocumentLocatif): void {
    const bail = this.bailActuel();
    if (!bail) return;
    if (!confirm('Supprimer cette pièce ?')) return;
    this.executer(this.api.removeDocument(bail.id, document.id), 'Pièce supprimée');
  }

  // --- Chargement ---

  private charger(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.api.findBien(id).subscribe({
      next: (bien) => {
        this.bien.set(bien);
        this.form.patchValue({
          type: bien.type,
          adresse: bien.adresse,
          commune: bien.commune ?? '',
          region: bien.region ?? '',
          superficie: bien.superficie === null ? null : Number(bien.superficie),
          notes: bien.notes ?? '',
          responsableId: bien.responsable?.id ?? '',
        });
        this.chargerBaux(bien.id);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Bien introuvable');
        this.retour();
      },
    });
  }

  private chargerBaux(bienId: string): void {
    this.api.findBaux(bienId).subscribe({
      next: (baux) => {
        this.bauxHistorique.set(baux);
        const actuel = baux.find((b) => !BAIL_STATUTS_TERMINES.includes(b.statut));
        if (actuel) this.chargerBailDetail(actuel.id);
        else {
          this.bailActuel.set(null);
          this.documents.set([]);
          this.paiements.set([]);
          this.caution.set(null);
          this.solde.set(null);
          this.relances.set([]);
          this.loading.set(false);
        }
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des baux');
      },
    });
  }

  private chargerBailDetail(bailId: string): void {
    this.api.findBail(bailId).subscribe({
      next: (bail) => {
        this.bailActuel.set(bail);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement du bail');
      },
    });
    this.api.findDocuments(bailId).subscribe({
      next: (documents) => this.documents.set(documents),
      error: () => this.documents.set([]),
    });
    this.api.findPaiements(bailId).subscribe({
      next: (paiements) => this.paiements.set(paiements),
      error: () => this.paiements.set([]),
    });
    this.api.getCaution(bailId).subscribe({
      next: (caution) => this.caution.set(caution),
      error: () => this.caution.set(null),
    });
    this.api.getSolde(bailId).subscribe({
      next: (solde) => this.solde.set(solde),
      error: () => this.solde.set(null),
    });
    this.api.findRelancesDuBail(bailId).subscribe({
      next: (relances) => this.relances.set(relances),
      error: () => this.relances.set([]),
    });
  }

  private executer(action: Observable<unknown>, succes: string): void {
    this.saving.set(true);
    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(succes);
        this.charger();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Action impossible');
      },
    });
  }
}
