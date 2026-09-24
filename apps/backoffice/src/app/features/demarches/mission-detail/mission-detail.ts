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
  LucideFileText,
  LucideMapPinned,
  LucidePlus,
  LucideTrash2,
  LucideUpload,
} from '@lucide/angular';
import type { Observable } from 'rxjs';
import { DemarchesApiService } from '../../../core/services/api/demarches-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { TerrainCatalogueItem } from '../../../core/models/terrain.model';
import type {
  DocumentMission,
  EtapeMission,
  MissionCollaborateur,
  MissionDetail as MissionDetailModel,
  MissionOptions,
} from '../../../core/models/mission.model';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { JustificationDialog } from '../../../shared/dialogs/justification-dialog';
import { ConstatDialog } from './constat-dialog';
import { estImageCloudinary, vignetteCloudinary } from '../../../shared/utils/cloudinary';
import {
  ADMINISTRATIONS,
  MODES_PAIEMENT,
  CONFORMITES,
  DECISIONS,
  ETAPES_TERMINALES,
  MISSION_ETAPES,
  RESULTATS_ADMINISTRATION,
  TYPES_DOCUMENT,
  TYPES_VERIFICATION,
  URGENCES,
  estEnRetard,
  help,
  label,
  nomPersonne,
  pillClass,
} from '../mission-status';

/**
 * Fiche d'une mission de vérification : les cinq étapes du cahier des
 * charges sur un seul écran, dans l'ordre où elles se déroulent — la demande,
 * l'étude de faisabilité, les constats de terrain, les administrations
 * consultées, puis la conclusion et le rapport.
 */
@Component({
  selector: 'app-mission-detail',
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
    LucideFileText,
    LucideMapPinned,
    LucidePlus,
    LucideTrash2,
    LucideUpload,
  ],
  templateUrl: './mission-detail.html',
  styleUrl: './mission-detail.scss',
})
export class MissionDetail implements OnInit {
  private readonly api = inject(DemarchesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessionService = inject(SessionService);
  private readonly terrainsApi = inject(TerrainsApiService);

  protected readonly mission = signal<MissionDetailModel | null>(null);
  protected readonly options = signal<Partial<MissionOptions>>({});
  protected readonly collaborateurs = signal<MissionCollaborateur[]>([]);
  protected readonly terrains = signal<TerrainCatalogueItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly canModify = computed(() =>
    this.sessionService.hasPermission('demarches:modifier'),
  );
  /**
   * Décision, conclusion, génération du rapport et clôture : ce que l'API
   * exige derrière `demarches:valider`, distinct de la simple saisie.
   */
  protected readonly canValidate = computed(() =>
    this.sessionService.hasPermission('demarches:valider'),
  );
  protected readonly canPublish = computed(() =>
    this.sessionService.hasPermission('demarches:publier'),
  );
  protected readonly canDelete = computed(() =>
    this.sessionService.hasPermission('demarches:supprimer'),
  );

  /** Étapes proposables dans le sélecteur : la clôture exige la validation. */
  protected readonly etapesSelectionnables = computed(() => {
    const toutes = this.options().statuts ?? [];
    return toutes.filter((etape) => etape !== 'cloturee' || this.canValidate());
  });

  /** Constats de terrain et administrations, séparés comme dans le rapport. */
  protected readonly constatsPhysiques = computed(() =>
    (this.mission()?.etapes ?? []).filter(
      (etape) => etape.type === 'verification_physique',
    ),
  );
  protected readonly constatsAdministratifs = computed(() =>
    (this.mission()?.etapes ?? []).filter(
      (etape) => etape.type === 'verification_administrative',
    ),
  );
  protected readonly rapports = computed(() =>
    (this.mission()?.documents ?? []).filter((doc) => doc.type === 'rapport'),
  );
  protected readonly pieces = computed(() =>
    (this.mission()?.documents ?? []).filter(
      (doc) => doc.type !== 'rapport' && !doc.etapeId,
    ),
  );
  protected readonly estTerminee = computed(() =>
    ETAPES_TERMINALES.includes(this.mission()?.statut ?? ''),
  );

  /**
   * La demande du client (étape 1). Modifiable : une localisation se précise
   * après un appel, une échéance se pose — et une mission déposée depuis
   * l'espace client arrive sans échéance ni terrain rattaché.
   */
  protected readonly demande = this.formBuilder.nonNullable.group({
    typeVerification: [''],
    objectif: [''],
    terrainId: [''],
    localisation: [''],
    commune: [''],
    region: [''],
    urgence: [''],
    dateEcheance: [''],
    budgetAnnonce: [null as number | null],
  });

  /** Étude de faisabilité et facturation (étape 2). */
  protected readonly faisabilite = this.formBuilder.nonNullable.group({
    faisabiliteConclusion: [''],
    faisabiliteNotes: [''],
    montantDevis: [null as number | null],
    fraisEtude: [null as number | null],
    montantPaye: [null as number | null],
    modePaiement: [''],
    referencePaiement: [''],
  });

  /** Conclusion du rapport (étape 5). */
  protected readonly conclusion = this.formBuilder.nonNullable.group({
    decision: [''],
    conclusion: [''],
    reserves: [''],
    recommandation: [''],
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set({}),
    });
    this.terrainsApi.catalogueProposition().subscribe({
      next: (items) => this.terrains.set(items),
      error: () => this.terrains.set([]),
    });
    this.api.getCollaborateurs().subscribe({
      next: (liste) => this.collaborateurs.set(liste),
      error: () => this.collaborateurs.set([]),
    });
    this.charger();
  }

  protected retour(): void {
    void this.router.navigate(['/demarches/missions']);
  }

  // --- Libellés ---

  protected etapeLabel(etape: string | null): string {
    return label(MISSION_ETAPES, etape);
  }

  protected etapePill(etape: string | null): string {
    return pillClass(MISSION_ETAPES, etape);
  }

  protected etapeAide(etape: string | null): string {
    return help(MISSION_ETAPES, etape);
  }

  protected typeLabel(type: string | null): string {
    return label(TYPES_VERIFICATION, type);
  }

  protected urgenceLabel(urgence: string | null): string {
    return label(URGENCES, urgence);
  }

  protected urgencePill(urgence: string | null): string {
    return pillClass(URGENCES, urgence);
  }

  protected decisionLabel(decision: string | null): string {
    return label(DECISIONS, decision);
  }

  protected decisionPill(decision: string | null): string {
    return pillClass(DECISIONS, decision);
  }

  protected conformiteLabel(valeur: string | null): string {
    return label(CONFORMITES, valeur);
  }

  protected conformitePill(valeur: string | null): string {
    return pillClass(CONFORMITES, valeur);
  }

  protected administrationLabel(valeur: string | null): string {
    return label(ADMINISTRATIONS, valeur);
  }

  protected resultatLabel(valeur: string | null): string {
    return label(RESULTATS_ADMINISTRATION, valeur);
  }

  protected resultatPill(valeur: string | null): string {
    return pillClass(RESULTATS_ADMINISTRATION, valeur);
  }

  protected documentLabel(type: string): string {
    return label(TYPES_DOCUMENT, type);
  }

  protected modePaiementLabel(mode: string): string {
    return label(MODES_PAIEMENT, mode);
  }

  protected personne(
    valeur: { firstName: string | null; lastName: string | null } | null,
  ): string {
    return nomPersonne(valeur);
  }

  /** Pièces rattachées à un constat précis : photos de cette visite-là. */
  protected piecesDuConstat(constatId: string): DocumentMission[] {
    return (this.mission()?.documents ?? []).filter(
      (document) => document.etapeId === constatId,
    );
  }

  protected photosDuConstat(constatId: string): DocumentMission[] {
    return this.piecesDuConstat(constatId).filter((document) =>
      estImageCloudinary(document.secureUrl),
    );
  }

  protected autresPiecesDuConstat(constatId: string): DocumentMission[] {
    return this.piecesDuConstat(constatId).filter(
      (document) => !estImageCloudinary(document.secureUrl),
    );
  }

  /** Photos du dossier sans constat rattaché (pièces fournies par le client). */
  protected readonly photosLibres = computed(() =>
    this.pieces().filter((document) => estImageCloudinary(document.secureUrl)),
  );

  protected readonly autresPieces = computed(() =>
    this.pieces().filter((document) => !estImageCloudinary(document.secureUrl)),
  );

  protected vignette(url: string): string {
    return vignetteCloudinary(url, 320);
  }

  protected enRetard(): boolean {
    const mission = this.mission();
    return mission ? estEnRetard(mission) : false;
  }

  /** Localisation affichée : le terrain du catalogue, sinon la description libre. */
  protected lieu(): string {
    const mission = this.mission();
    if (!mission) return '—';
    if (mission.terrain) {
      return [mission.terrain.nom, mission.terrain.commune, mission.terrain.region]
        .filter(Boolean)
        .join(' · ');
    }
    return (
      [mission.localisation, mission.commune, mission.region]
        .filter(Boolean)
        .join(', ') || 'Localisation non précisée'
    );
  }

  protected coordonnees(): string | null {
    const mission = this.mission();
    if (!mission?.latitude || !mission?.longitude) return null;
    return `${mission.latitude}, ${mission.longitude}`;
  }

  // --- Actions ---

  protected ajouterConstat(type: string): void {
    const mission = this.mission();
    if (!mission) return;
    ConstatDialog.open(this.dialog, {
      type,
      conformites: this.options().conformites ?? [],
      administrations: this.options().administrations ?? [],
      resultats: this.options().resultatsAdministration ?? [],
    }).subscribe((payload) => {
      if (!payload) return;
      this.executer(
        this.api.addEtape(mission.id, payload),
        'Constat enregistré',
      );
    });
  }

  protected modifierConstat(constat: EtapeMission): void {
    const mission = this.mission();
    if (!mission) return;
    ConstatDialog.open(this.dialog, {
      type: constat.type,
      constat,
      conformites: this.options().conformites ?? [],
      administrations: this.options().administrations ?? [],
      resultats: this.options().resultatsAdministration ?? [],
    }).subscribe((payload) => {
      if (!payload) return;
      this.executer(
        this.api.updateEtape(mission.id, constat.id, payload),
        'Constat mis à jour',
      );
    });
  }

  protected supprimerConstat(constat: EtapeMission): void {
    const mission = this.mission();
    if (!mission) return;
    if (
      !confirm(
        `Supprimer le constat « ${constat.titre} » ? Il disparaîtra du rapport remis au client.`,
      )
    ) {
      return;
    }
    this.executer(
      this.api.removeEtape(mission.id, constat.id),
      'Constat supprimé',
    );
  }

  protected enregistrerDemande(): void {
    const mission = this.mission();
    if (!mission) return;
    const valeur = this.demande.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.executer(
      this.api.update(mission.id, {
        typeVerification: valeur.typeVerification || undefined,
        objectif: texte(valeur.objectif),
        terrainId: valeur.terrainId || undefined,
        localisation: texte(valeur.localisation),
        commune: texte(valeur.commune),
        region: texte(valeur.region),
        urgence: valeur.urgence || undefined,
        dateEcheance: valeur.dateEcheance
          ? new Date(valeur.dateEcheance).toISOString()
          : undefined,
        budgetAnnonce: valeur.budgetAnnonce ?? undefined,
      }),
      'Demande mise à jour',
    );
  }

  /** Supprime la mission : réservé à la direction, et tracé. */
  protected supprimerMission(): void {
    const mission = this.mission();
    if (!mission) return;
    if (
      !confirm(
        `Supprimer définitivement la mission ${mission.referenceInterne ?? ''} ? Constats et pièces seront perdus. Cette action est tracée.`,
      )
    ) {
      return;
    }
    this.api.remove(mission.id).subscribe({
      next: () => {
        this.notify.success('Mission supprimée');
        this.retour();
      },
      error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
    });
  }

  protected enregistrerFaisabilite(): void {
    const mission = this.mission();
    if (!mission) return;
    const valeur = this.faisabilite.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.executer(
      this.api.update(mission.id, {
        faisabiliteConclusion: valeur.faisabiliteConclusion || undefined,
        faisabiliteNotes: texte(valeur.faisabiliteNotes),
        montantDevis: valeur.montantDevis ?? undefined,
        fraisEtude: valeur.fraisEtude ?? undefined,
        montantPaye: valeur.montantPaye ?? undefined,
        modePaiement: valeur.modePaiement || undefined,
        referencePaiement: texte(valeur.referencePaiement),
      }),
      'Étude de faisabilité enregistrée',
    );
  }

  protected enregistrerConclusion(): void {
    const mission = this.mission();
    if (!mission) return;
    const valeur = this.conclusion.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.executer(
      this.api.update(mission.id, {
        decision: valeur.decision || undefined,
        conclusion: texte(valeur.conclusion),
        reserves: texte(valeur.reserves),
        recommandation: texte(valeur.recommandation),
      }),
      'Conclusion enregistrée',
    );
  }

  protected changerEtape(statut: string): void {
    const mission = this.mission();
    if (!mission || statut === mission.statut) return;
    if (statut === 'abandonnee') {
      JustificationDialog.ask(this.dialog, {
        title: 'Abandonner la mission',
        description:
          'Le motif reste sur la fiche et explique au client pourquoi la mission s’arrête.',
        confirmLabel: 'Abandonner la mission',
      }).subscribe((justification) => {
        if (!justification) return;
        this.executer(
          this.api.transition(mission.id, statut, justification),
          'Mission abandonnée',
        );
      });
      return;
    }
    this.executer(
      this.api.transition(mission.id, statut),
      `Mission passée à « ${this.etapeLabel(statut)} »`,
    );
  }

  /**
   * Confie la mission à un collaborateur. C'est ce qui vide la vue « sans
   * responsable » : une mission que personne ne porte n'avance pas.
   */
  protected affecter(responsableId: string): void {
    const mission = this.mission();
    if (!mission || responsableId === (mission.responsable?.id ?? '')) return;
    this.executer(
      this.api.update(mission.id, { responsableId }),
      'Mission confiée',
    );
  }

  protected genererRapport(): void {
    const mission = this.mission();
    if (!mission) return;
    this.executer(
      this.api.generateReport(mission.id),
      'Rapport généré et publié dans l’espace client',
    );
  }

  protected televerser(evenement: Event, type: string, etapeId?: string): void {
    const mission = this.mission();
    const input = evenement.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!mission || !fichier) return;
    this.executer(
      this.api.addDocument(mission.id, type, fichier, { etapeId }),
      etapeId ? 'Photo ajoutée au constat' : 'Pièce ajoutée',
    );
    input.value = '';
  }

  protected basculerVisibilite(document: DocumentMission): void {
    const mission = this.mission();
    if (!mission) return;
    this.executer(
      this.api.setDocumentVisibility(mission.id, document.id, !document.isPublic),
      document.isPublic
        ? 'Pièce retirée de l’espace client'
        : 'Pièce visible par le client',
    );
  }

  protected supprimerDocument(document: DocumentMission): void {
    const mission = this.mission();
    if (!mission) return;
    if (!confirm('Supprimer cette pièce du dossier ?')) return;
    this.executer(
      this.api.removeDocument(mission.id, document.id),
      'Pièce supprimée',
    );
  }

  private charger(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (mission) => {
        this.appliquer(mission);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Mission introuvable');
        this.retour();
      },
    });
  }

  private appliquer(mission: MissionDetailModel): void {
    this.mission.set(mission);
    const nombre = (valeur: number | string | null): number | null =>
      valeur === null || valeur === undefined ? null : Number(valeur);
    this.demande.patchValue({
      typeVerification: mission.typeVerification,
      objectif: mission.objectif ?? '',
      terrainId: mission.terrain?.id ?? '',
      localisation: mission.localisation ?? '',
      commune: mission.commune ?? '',
      region: mission.region ?? '',
      urgence: mission.urgence,
      dateEcheance: mission.dateEcheance ? mission.dateEcheance.slice(0, 10) : '',
      budgetAnnonce: nombre(mission.budgetAnnonce),
    });
    this.faisabilite.patchValue({
      faisabiliteConclusion: mission.faisabiliteConclusion ?? '',
      faisabiliteNotes: mission.faisabiliteNotes ?? '',
      montantDevis: nombre(mission.montantDevis),
      fraisEtude: nombre(mission.fraisEtude),
      montantPaye: nombre(mission.montantPaye),
      modePaiement: mission.modePaiement ?? '',
      referencePaiement: mission.referencePaiement ?? '',
    });
    this.conclusion.patchValue({
      decision: mission.decision ?? '',
      conclusion: mission.conclusion ?? '',
      reserves: mission.reserves ?? '',
      recommandation: mission.recommandation ?? '',
    });
  }

  /** Exécute une action puis recharge la fiche : un seul point d'erreur. */
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
