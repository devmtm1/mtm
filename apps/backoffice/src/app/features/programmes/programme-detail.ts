import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArchive,
  LucideArrowLeft,
  LucideBanknote,
  LucideChevronRight,
  LucideCircleCheck,
  LucideClock,
  LucideFileText,
  LucideLandPlot,
  LucideMapPin,
  LucidePencil,
  LucidePlus,
  LucideStar,
  LucideTrash2,
  LucideTriangleAlert,
  LucideUser,
  LucideUsers,
  LucideDownload,
} from '@lucide/angular';
import {
  type CategorieLot,
  type LigneClientProgramme,
  type LotProgramme,
  type ProgrammeDetail as Programme,
  type ProgrammeResume,
  type VentesProgramme,
  ProgrammesApiService,
} from '../../core/services/api/programmes-api.service';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import { SessionService } from '../../core/services/session.service';
import { FicheOnglets, type OngletFiche } from '../../shared/components/fiche-client/fiche-onglets';
import { ProspectPickerDialog } from '../ventes/prospect-picker-dialog';
import { VentePaiementDialog } from '../ventes/vente-paiement-dialog';
import { ProgrammeClients } from './pilotage/programme-clients';
import { ProgrammeDocuments } from './pilotage/programme-documents';
import { ProgrammeMandats } from './pilotage/programme-mandats';
import { ProgrammeSitePublic } from './pilotage/programme-site-public';
import { ProgrammeVersements } from './pilotage/programme-versements';
import { ProgrammeVisites } from './pilotage/programme-visites';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ConfirmService } from '../../shared/dialogs/confirm-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { Pagination } from '../../shared/components/pagination/pagination';
import { COMMERCIAL_STATUS, pillClass } from '../terrains/terrain-status';
import { CategorieDialog, type CategorieDialogData } from './categorie-dialog';
import { GenererLotsDialog, type GenererLotsDialogData } from './generer-lots-dialog';
import { ProgrammeDialog, type ProgrammeDialogData } from './programme-dialog';
import { tauxVendu } from './programmes';
import { ExportListeDialog } from '../../shared/dialogs/export-liste-dialog';
import { sourceDepuisLignes } from '../../shared/utils/export-lignes';

/** Réservé et Vendu viennent des dossiers de vente : un lot dans ces états ne se modifie pas en bloc. */
const FIGES = ['Réservé', 'Vendu'];

export function estFige(lot: Pick<LotProgramme, 'statutCommercial'>): boolean {
  return FIGES.includes(lot.statutCommercial);
}

/** Plusieurs prospects peuvent négocier le même lot : le dossier le plus avancé est celui qui compte. */
const AVANCEMENT_DOSSIER = ['en_cours', 'pre_reserve', 'reserve', 'paiement_partiel', 'solde'];

/** Le dossier le plus avancé d'un lot (un dossier annulé ne compte pas), et le nombre des autres. */
export function clientDuLot<T extends Pick<LigneClientProgramme, 'statut' | 'lot'>>(
  clients: readonly T[],
  lotId: string,
): { principal: T; autres: number } | undefined {
  const dossiers = clients
    .filter((c) => c.lot?.id === lotId && c.statut !== 'annule')
    .sort((a, b) => AVANCEMENT_DOSSIER.indexOf(b.statut) - AVANCEMENT_DOSSIER.indexOf(a.statut));
  return dossiers.length ? { principal: dossiers[0], autres: dossiers.length - 1 } : undefined;
}

/** Un programme : ses chiffres, ses catégories de lots et le tableau de ses lots. */
@Component({
  selector: 'app-programme-detail',
  imports: [LucideDownload, 
    DecimalPipe,
    MatButtonModule,
    MatSelectModule,
    MatTooltipModule,
    RouterLink,
    LucideArchive,
    LucideArrowLeft,
    LucideBanknote,
    LucideChevronRight,
    LucideCircleCheck,
    LucideClock,
    LucideFileText,
    LucideLandPlot,
    LucideMapPin,
    LucidePencil,
    LucidePlus,
    LucideStar,
    LucideTrash2,
    LucideTriangleAlert,
    LucideUser,
    LucideUsers,
    MoneyPipe,
    Pagination,
    FicheOnglets,
    ProgrammeClients,
    ProgrammeDocuments,
    ProgrammeMandats,
    ProgrammeSitePublic,
    ProgrammeVersements,
    ProgrammeVisites,
  ],
  templateUrl: './programme-detail.html',
  styleUrl: './programme-detail.scss',
})
export class ProgrammeDetail implements OnInit {
  private readonly api = inject(ProgrammesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutExporterListe = computed(() => this.session.hasPermission('terrains:exporter'));
  protected readonly canCreate = this.session.hasPermission('terrains:creer');
  protected readonly canEdit = this.session.hasPermission('terrains:modifier');

  private readonly ventesApi = inject(VentesApiService);
  /** Enregistrer un versement ou ouvrir un dossier : les mêmes droits que sur la page Ventes. */
  protected readonly canPay = this.session.hasPermission('ventes:modifier');
  protected readonly canSell = this.session.hasPermission('ventes:creer');

  protected readonly programme = signal<Programme | null>(null);
  /** Clients, versements et commissions : chargés une fois, partagés par les onglets. */
  protected readonly ventes = signal<VentesProgramme | null>(null);
  protected readonly onglet = signal('apercu');
  protected readonly onglets = computed<OngletFiche[]>(() => {
    const p = this.programme();
    const v = this.ventes();
    return [
      { id: 'apercu', libelle: 'Vue d’ensemble', icone: 'conditions' },
      { id: 'lots', libelle: 'Lots', icone: 'biens', pastille: p?.nombreLots ?? null },
      { id: 'clients', libelle: 'Clients', icone: 'identite', pastille: v?.acces ? v.clients.length : null },
      {
        id: 'versements',
        libelle: 'Versements',
        icone: 'paiements',
        pastille: v?.acces ? v.echeances.filter((e) => e.joursRetard > 0).length : null,
        alerte: true,
      },
      { id: 'visites', libelle: 'Visites', icone: 'agenda' },
      { id: 'mandats', libelle: 'Mandats et commissions', icone: 'baux' },
      { id: 'documents', libelle: 'Documents', icone: 'documents' },
      { id: 'site', libelle: 'Site public', icone: 'photos' },
    ];
  });
  protected readonly introuvable = signal(false);
  protected readonly filtre = signal<string>('');
  protected readonly selectionActive = signal(false);
  protected readonly selection = signal<ReadonlySet<string>>(new Set());

  protected readonly tauxVendu = tauxVendu;
  protected readonly estFige = estFige;
  protected readonly pillClass = pillClass;
  protected readonly commercialStatus = COMMERCIAL_STATUS;

  protected readonly page = signal(1);
  protected readonly taillePage = signal(25);

  protected readonly lotsAffiches = computed(() => {
    const p = this.programme();
    const statut = this.filtre();
    if (!p) return [];
    return statut ? p.lots.filter((l) => l.statutCommercial === statut) : p.lots;
  });

  /** Les lots de la page courante (un lotissement peut en compter des centaines). */
  protected readonly lotsPage = computed(() => {
    const debut = (this.page() - 1) * this.taillePage();
    return this.lotsAffiches().slice(debut, debut + this.taillePage());
  });

  /** Les lots affichés qu'on peut cocher : ni réservés, ni vendus. */
  protected readonly lotsSelectionnables = computed(() => this.lotsAffiches().filter((l) => !estFige(l)).length);

  protected readonly toutEstSelectionne = computed(() => {
    const cochables = this.lotsAffiches().filter((l) => !estFige(l));
    return cochables.length > 0 && cochables.every((l) => this.selection().has(l.id));
  });

  /** Les puces de filtre : un statut et le nombre de lots qu'il contient (les statuts vides n'apparaissent pas). */
  protected readonly puces = computed(() => {
    const p = this.programme();
    if (!p) return [];
    return [
      { code: '', label: 'Tous', n: p.nombreLots },
      { code: 'Disponible', label: 'Disponibles', n: p.lotsDisponibles },
      { code: 'Réservé', label: 'Réservés', n: p.lotsReserves },
      { code: 'Vendu', label: 'Vendus', n: p.lotsVendus },
      { code: 'Brouillon', label: 'À mettre en vente', n: p.lotsBrouillon },
    ].filter((puce) => puce.code === '' || puce.n > 0);
  });

  protected readonly nombreSelectionnes = computed(() => this.selection().size);

  ngOnInit(): void {
    this.charger();
  }

  protected categorie(lot: LotProgramme): CategorieLot | undefined {
    return this.programme()?.categories.find((c) => c.id === lot.categorieLotId);
  }

  protected lotsDeCategorie(categorie: CategorieLot): number {
    return this.programme()?.lots.filter((l) => l.categorieLotId === categorie.id).length ?? 0;
  }

  protected conditions(c: {
    modalitePaiement?: string | null;
    dureeMoratoireMois?: number | null;
    acompteMontant?: number | string | null;
  }): string {
    const parties: string[] = [];
    if (c.modalitePaiement) parties.push(c.modalitePaiement);
    if (c.dureeMoratoireMois) parties.push(`moratoire ${c.dureeMoratoireMois} mois`);
    if (c.acompteMontant && Number(c.acompteMontant) > 0) parties.push('acompte');
    return parties.join(' · ');
  }

  // --- Lots -----------------------------------------------------------------

  protected cliquerLot(lot: LotProgramme): void {
    if (!this.selectionActive()) {
      void this.router.navigate(['/terrains', lot.id]);
      return;
    }
    if (estFige(lot)) return;
    const suivante = new Set(this.selection());
    if (!suivante.delete(lot.id)) suivante.add(lot.id);
    this.selection.set(suivante);
  }

  protected basculerSelection(): void {
    this.selectionActive.update((v) => !v);
    this.selection.set(new Set());
  }

  /** La case de l'en-tête : tout cocher (les lots affichés non figés), ou tout décocher. */
  protected basculerToutSelectionner(): void {
    this.selection.set(
      this.toutEstSelectionne()
        ? new Set()
        : new Set(this.lotsAffiches().filter((l) => !estFige(l)).map((l) => l.id)),
    );
  }

  protected choisirFiltre(code: string): void {
    this.filtre.set(code);
    this.page.set(1);
  }

  /** Commission, marge et produit direct sont des données sensibles : réservées à la direction et aux habilités. */
  protected readonly peutVoirFinancier =
    this.session.hasPermission('terrains:consulter_financier') ||
    this.session.hasRole('administrateur') ||
    this.session.hasRole('direction');

  /** Un bien confié par un propriétaire rapporte une commission ; en propre ou en direct, une marge. */
  protected confie(p: Programme): boolean {
    return Boolean(p.proprietaireId) && !p.produitDirect;
  }

  protected detention(p: Programme): string {
    if (p.produitDirect) return 'Produit direct de MTM';
    return p.proprietaire ? `Confié par ${p.proprietaire.firstName} ${p.proprietaire.lastName}` : 'Bien en propre de MTM';
  }

  /** Recopie les conditions du programme sur ses lots libres (jamais sur un lot réservé ou vendu). */
  protected appliquerAuxLots(): void {
    const p = this.programme();
    if (!p) return;
    this.confirm
      .ask({
        title: 'Appliquer le programme à ses lots',
        message:
          'Les conditions du programme (prix, paiement, propriétaire, commission ou marge) et celles de chaque catégorie remplaceront celles de ses lots libres.\nLes lots réservés ou vendus ne changent pas.',
        confirmLabel: 'Appliquer',
        danger: false,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.appliquerAuxLots(p.id).subscribe({
          next: (res) => {
            this.notifications.success(`${res.lotsMisAJour} lot${res.lotsMisAJour > 1 ? 's' : ''} mis à jour.`);
            this.charger();
          },
          error: (erreur) => this.notifications.error(erreur, 'Les conditions n’ont pas pu être appliquées'),
        });
      });
  }

  /** Une tuile de chiffres ouvre l'onglet des lots, déjà filtré. */
  protected voirLots(code: string): void {
    this.choisirFiltre(code);
    this.onglet.set('lots');
  }

  /** Le client d'un lot : le dossier le plus avancé, et combien d'autres dossiers visent le même lot. */
  protected acheteur(lot: LotProgramme): { principal: LigneClientProgramme; autres: number } | undefined {
    return clientDuLot(this.ventes()?.clients ?? [], lot.id);
  }

  /** Vendre un lot : on choisit le client, le dossier s'ouvre au prix du lot et se gère dans Ventes. */
  protected vendre(lot: LotProgramme): void {
    ProspectPickerDialog.ask(this.dialog).subscribe((prospect) => {
      if (!prospect) return;
      this.ventesApi
        .createDossier({
          prospectId: prospect.id,
          terrainId: lot.id,
          ...(lot.prixPublic !== null ? { prixVente: Number(lot.prixPublic) } : {}),
        })
        .subscribe({
          next: (dossier) => {
            this.notifications.success(`Dossier ouvert pour ${prospect.nom} sur le lot ${lot.numeroLot || lot.referenceInterne}.`);
            void this.router.navigate(['/ventes', dossier.id]);
          },
          error: (erreur) => this.notifications.error(erreur, 'Le dossier de vente n’a pas pu être ouvert'),
        });
    });
  }

  /** Enregistrer un versement depuis la liste des clients : même boîte de dialogue que sur le dossier. */
  protected enregistrerVersement(client: LigneClientProgramme): void {
    this.ventesApi.getOptions().subscribe({
      next: (options) => {
        VentePaiementDialog.open(this.dialog, {
          dossierLabel: `${client.reference ?? client.dossierId} · ${client.client.nom}`,
          prixVente: client.prixVente,
          montantPaye: client.montantPaye,
          soldeRestant: client.soldeRestant,
          modes: options.modesPaiement,
        }).subscribe((resultat) => {
          if (!resultat) return;
          this.ventesApi.createPaiement(client.dossierId, resultat).subscribe({
            next: () => {
              this.notifications.success('Versement enregistré : il reste à valider.');
              this.chargerVentes();
            },
            error: (erreur) => this.notifications.error(erreur, 'Le versement n’a pas pu être enregistré'),
          });
        });
      },
      error: (erreur) => this.notifications.error(erreur, 'Les modes de paiement n’ont pas pu être chargés'),
    });
  }

  protected changerTaille(taille: number): void {
    this.taillePage.set(taille);
    this.page.set(1);
  }

  protected mettreEnVente(): void {
    this.changerStatut('Disponible', 'Lots mis en vente.');
  }

  protected retirerDeLaVente(): void {
    this.changerStatut('Suspendu', 'Lots suspendus.');
  }

  protected ranger(categorieLotId: string | null): void {
    const p = this.programme();
    if (!p || !this.selection().size) return;
    this.api.affecterLots(p.id, [...this.selection()], categorieLotId).subscribe({
      next: (res) => {
        this.notifications.success(
          categorieLotId
            ? `${res.lotsMisAJour} lot${res.lotsMisAJour > 1 ? 's' : ''} rangé${res.lotsMisAJour > 1 ? 's' : ''}, conditions appliquées.`
            : `${res.lotsMisAJour} lot${res.lotsMisAJour > 1 ? 's' : ''} sorti${res.lotsMisAJour > 1 ? 's' : ''} de leur catégorie.`,
        );
        this.basculerSelection();
        this.charger();
      },
      error: (erreur) => this.notifications.error(erreur, 'Les lots n’ont pas pu être rangés'),
    });
  }

  private changerStatut(statut: 'Disponible' | 'Suspendu', message: string): void {
    const p = this.programme();
    if (!p || !this.selection().size) return;
    this.api.changerStatut(p.id, [...this.selection()], statut).subscribe({
      next: () => {
        this.notifications.success(message);
        this.basculerSelection();
        this.charger();
      },
      error: (erreur) => this.notifications.error(erreur, 'Les lots n’ont pas pu être modifiés'),
    });
  }

  // --- Programme et catégories ---------------------------------------------

  protected archiver(): void {
    const p = this.programme();
    if (!p) return;
    this.confirm
      .ask({
        title: 'Archiver le programme',
        message: `« ${p.nom} » disparaît des listes. Ses lots et leurs ventes restent consultables.`,
        confirmLabel: 'Archiver',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.archiver(p.id).subscribe({
          next: () => {
            this.notifications.success('Programme archivé.');
            void this.router.navigate(['/programmes']);
          },
          error: (erreur) => this.notifications.error(erreur, 'Le programme n’a pas pu être archivé'),
        });
      });
  }

  protected modifier(): void {
    const p = this.programme();
    if (!p) return;
    this.dialog
      .open<ProgrammeDialog, ProgrammeDialogData, ProgrammeResume>(ProgrammeDialog, {
        width: '640px',
        maxWidth: '96vw',
        data: { existant: p },
      })
      .afterClosed()
      .subscribe((maj) => {
        if (maj) this.charger();
      });
  }

  protected generer(): void {
    const p = this.programme();
    if (!p) return;
    this.dialog
      .open<GenererLotsDialog, GenererLotsDialogData, boolean>(GenererLotsDialog, {
        width: '600px',
        maxWidth: '96vw',
        data: {
          programmeId: p.id,
          nomProgramme: p.nom,
          categories: p.categories,
          numerosExistants: p.lots.map((l) => l.numeroLot ?? ''),
        },
      })
      .afterClosed()
      .subscribe((fait) => {
        if (fait) this.charger();
      });
  }

  protected ajouterCategorie(): void {
    this.ouvrirCategorie();
  }

  protected modifierCategorie(categorie: CategorieLot): void {
    this.ouvrirCategorie(categorie);
  }

  private ouvrirCategorie(existante?: CategorieLot): void {
    const p = this.programme();
    if (!p) return;
    this.dialog
      .open<CategorieDialog, CategorieDialogData, CategorieLot>(CategorieDialog, {
        width: '600px',
        maxWidth: '96vw',
        data: { programmeId: p.id, existante },
      })
      .afterClosed()
      .subscribe((categorie) => {
        if (!categorie) return;
        this.charger();
        if (existante && this.lotsDeCategorie(existante) > 0) {
          this.notifications.info('Catégorie enregistrée. « Appliquer aux lots » met à jour leurs conditions.');
        }
      });
  }

  protected appliquer(categorie: CategorieLot): void {
    this.confirm
      .ask({
        title: `Appliquer « ${categorie.nom} »`,
        message: `Les conditions de cette catégorie (prix, paiement) remplaceront celles de ses ${this.lotsDeCategorie(categorie)} lots.\nLes lots réservés ou vendus ne changent pas.`,
        confirmLabel: 'Appliquer',
        danger: false,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.appliquerCategorie(categorie.id).subscribe({
          next: (res) => {
            this.notifications.success(`${res.lotsMisAJour} lot${res.lotsMisAJour > 1 ? 's' : ''} mis à jour.`);
            this.charger();
          },
          error: (erreur) => this.notifications.error(erreur, 'Les conditions n’ont pas pu être appliquées'),
        });
      });
  }

  protected supprimer(categorie: CategorieLot): void {
    this.confirm
      .ask({
        title: 'Supprimer la catégorie',
        message: `Supprimer la catégorie « ${categorie.nom} » ?`,
        confirmLabel: 'Supprimer',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.supprimerCategorie(categorie.id).subscribe({
          next: () => this.charger(),
          error: (erreur) => this.notifications.error(erreur, 'La catégorie n’a pas pu être supprimée'),
        });
      });
  }

  private chargerVentes(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.ventes(id).subscribe({
      next: (ventes) => this.ventes.set(ventes),
      // Le pilotage est un plus : sans lui, la fiche reste utilisable.
      error: () => this.ventes.set(null),
    });
  }

  protected charger(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.chargerVentes();
    this.api.findOne(id).subscribe({
      next: (p) => {
        this.programme.set(p);
        // Un filtre sur un statut devenu vide ramènerait une grille vide.
        if (this.filtre() && !p.lots.some((l) => l.statutCommercial === this.filtre())) this.choisirFiltre('');
      },
      error: () => this.introuvable.set(true),
    });
  }

  /** Exporte l'état des lots affichés (filtre par statut compris) en Excel ou en PDF. */
  protected exporterListe(): void {
    const programme = this.programme();
    if (!programme) return;
    ExportListeDialog.open(
      this.dialog,
      sourceDepuisLignes<LotProgramme>(
        { module: 'programmes', titre: `État des lots — ${programme.nom}`, sousTitre: this.filtre() ? `Lots ${this.filtre().toLowerCase()}` : 'Tous les lots' },
        [
          { libelle: 'Lot', valeur: (l) => l.numeroLot ?? l.referenceInterne },
          { libelle: 'Référence', valeur: (l) => l.referenceInterne },
          { libelle: 'Superficie (m²)', type: 'nombre', valeur: (l) => (l.superficie === null ? null : Number(l.superficie)) },
          { libelle: 'Catégorie', valeur: (l) => this.categorie(l)?.nom },
          { libelle: 'Prix public (FCFA)', type: 'montant', valeur: (l) => (l.prixPublic === null ? null : Number(l.prixPublic)) },
          { libelle: 'Statut', valeur: (l) => l.statutCommercial },
          { libelle: 'Client', valeur: (l) => this.acheteur(l)?.principal.client.nom },
        ],
        this.lotsAffiches(),
      ),
    ).subscribe();
  }
}
