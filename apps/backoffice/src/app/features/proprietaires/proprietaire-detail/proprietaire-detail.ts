import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideKeyRound,
  LucideLandPlot,
  LucidePencil,
  LucidePlus,
  LucideScrollText,
  LucideTrash2,
} from '@lucide/angular';
import { MenuActions, type GroupeMenu } from '../../../shared/components/menu-actions/menu-actions';
import {
  ProprietairesApiService,
  type ProprietaireDetail as ProprietaireDetailModel,
} from '../../../core/services/api/proprietaires-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type { BienListItem } from '../../../core/models/locatif.model';
import {
  BIEN_STATUTS,
  label as bienStatutLabel,
  pillClass as bienPill,
  help as bienHelp,
  simpleLabel,
  TYPES_BIEN,
} from '../../locatif/locatif-status';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import { SessionService } from '../../../core/services/session.service';
import { FicheEntete } from '../../../shared/components/fiche-client/fiche-entete';
import { FicheEspaceClient } from '../../../shared/components/fiche-client/fiche-espace-client';
import {
  FicheIdentite,
  type ComplementFiche,
} from '../../../shared/components/fiche-client/fiche-identite';
import {
  FicheOnglets,
  type OngletFiche,
} from '../../../shared/components/fiche-client/fiche-onglets';
import { type DonneesFiche } from '../../../core/models/fiche-client';
import {
  ProprietaireDialog,
  type ProprietaireDialogResult,
} from '../../terrains/proprietaire-dialog';
import { catchError, of, switchMap } from 'rxjs';
import { ClientAccountDialog } from '../../../shared/dialogs/client-account-dialog';
import type { ProprietaireSummary, TerrainListItem } from '../../../core/models/terrain.model';
import type { MandatListItem } from '../../../core/models/mandat.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  COMMERCIAL_STATUS,
  pillClass as terrainPill,
  statusHelp as terrainHelp,
} from '../../terrains/terrain-status';
import {
  MANDAT_STATUS,
  echeanceInfo,
  pillClass as mandatPill,
  statusHelp as mandatHelp,
} from '../../mandats/mandat-status';
import { ConfirmService } from '../../../shared/dialogs/confirm-dialog';

/**
 * Fiche propriétaire (J1.4) : coordonnées, puis tout ce qu'il a confié à
 * MTM — terrains et mandats — avec les raccourcis pour en créer.
 */
@Component({
  selector: 'app-proprietaire-detail',
  imports: [
    MenuActions,
    FicheEntete,
    FicheEspaceClient,
    FicheIdentite,
    FicheOnglets,
    MoneyPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    LucideKeyRound,
    LucideLandPlot,
    LucidePencil,
    LucidePlus,
    LucideScrollText,
  ],
  templateUrl: './proprietaire-detail.html',
  styleUrl: './proprietaire-detail.scss',
})
export class ProprietaireDetail implements OnInit {
  private readonly confirmer = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProprietairesApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly locatifApi = inject(LocatifApiService);
  private readonly mandatsApi = inject(MandatsApiService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  protected readonly proprietaire = signal<ProprietaireDetailModel | null>(null);
  protected readonly onglet = signal('identite');
  /** L'identité rangée au format commun des fiches, avec ce que la fiche porte vraiment. */
  protected readonly donneesFiche = computed<DonneesFiche>(() => {
    const p = this.proprietaire();
    return {
      prenom: p?.firstName,
      nom: p?.lastName,
      telephone: p?.phone,
      email: p?.email,
      adresse: p?.adresse,
      dateNaissance: p?.dateNaissance,
      lieuNaissance: p?.lieuNaissance,
      nationalite: p?.nationalite,
      profession: p?.profession,
      typePiece: p?.typePiece,
      numeroPiece: p?.numeroPiece,
      pieceValiditeLe: p?.pieceValiditeLe,
      pieceUrl: p?.pieceUrl,
      urgenceNom: p?.urgenceNom,
      urgenceLien: p?.urgenceLien,
      urgenceTelephone: p?.urgenceTelephone,
    };
  });
  /** Le dossier du propriétaire, à la suite de l'identité. */
  protected readonly complements = computed<ComplementFiche[]>(() => {
    const p = this.proprietaire();
    if (!p) return [];
    const jour = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');
    return [
      {
        titre: 'Dossier',
        lignes: [
          { libelle: 'Matricule', valeur: p.matricule },
          { libelle: 'Notes internes', valeur: p.notes },
          { libelle: 'Enregistré le', valeur: jour(p.createdAt) },
          { libelle: 'Dernière modification', valeur: jour(p.updatedAt) },
        ],
      },
    ];
  });
  protected readonly onglets = computed<OngletFiche[]>(() => {
    const p = this.proprietaire();
    return [
      { id: 'identite', libelle: 'Identité', icone: 'identite' },
      {
        id: 'biens',
        libelle: 'Biens et mandats',
        icone: 'dossiers',
        pastille: p ? p._count.terrains + p._count.biensLocatifs + p._count.mandats : null,
      },
      { id: 'espace-client', libelle: 'Espace client', icone: 'espace' },
    ];
  });
  protected readonly terrains = signal<TerrainListItem[] | null>(null);
  protected readonly mandats = signal<MandatListItem[] | null>(null);
  /** Biens que MTM gère en location (au mois ou en courte durée) pour ce propriétaire. */
  protected readonly biensLocatifs = signal<BienListItem[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('proprietaires:modifier');
  protected readonly canDelete = this.session.hasPermission('proprietaires:supprimer');
  protected readonly canSeeTerrains = this.session.hasPermission('terrains:consulter');
  protected readonly canCreateTerrain = this.session.hasPermission('terrains:creer');
  protected readonly canSeeLocatif = this.session.hasPermission('locatif:consulter');
  protected readonly canCreateBienLocatif = this.session.hasPermission('locatif:creer');
  protected readonly canSeeMandats = this.session.hasPermission('mandats:consulter');
  protected readonly canCreateMandat = this.session.hasPermission('mandats:creer');
  protected readonly canCreateClient = this.session.hasPermission('clients:creer');

  protected readonly activeMandats = computed(
    () => (this.mandats() ?? []).filter((mandat) => mandat.statut === 'Actif').length,
  );
  protected readonly terrainsDisponibles = computed(
    () =>
      (this.terrains() ?? []).filter((terrain) => terrain.statutCommercial === 'Disponible').length,
  );

  /** Ce qui manque pour que la relation soit exploitable. */
  protected readonly todo = computed(() => {
    const proprietaire = this.proprietaire();
    const terrains = this.terrains();
    const mandats = this.mandats();
    const biensLocatifs = this.biensLocatifs();
    if (!proprietaire || terrains === null || mandats === null || biensLocatifs === null) return [];
    const items: { label: string; hint: string }[] = [];
    if (!proprietaire.phone && !proprietaire.email)
      items.push({
        label: 'Renseigner un moyen de contact',
        hint: 'Téléphone ou e-mail, pour le joindre.',
      });
    if (terrains.length === 0 && biensLocatifs.length === 0)
      items.push({
        label: 'Enregistrer ses biens',
        hint: 'Créez la fiche de chaque parcelle à vendre, ou de chaque bien à mettre en gestion locative.',
      });
    // Le mandat de vente ne concerne que les terrains : un bien en gestion se suit par son bail ou ses séjours.
    if (terrains.length > 0 && mandats.length === 0)
      items.push({
        label: 'Formaliser un mandat',
        hint: 'Sans mandat signé, MTM n’est pas autorisée à commercialiser.',
      });
    return items;
  });

  private id: string | null = null;


  protected readonly actionsPlus = computed<GroupeMenu[]>(() => [
    {
      actions: [
        {
          libelle: 'Supprimer le propriétaire',
          aide: 'Possible uniquement sans mandat rattaché',
          icone: LucideTrash2,
          danger: true,
          action: () => this.remove(),
        },
      ],
    },
  ]);

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) {
      this.goBack();
      return;
    }
    this.load(this.id);
  }

  protected goBack(): void {
    void this.router.navigate(['/proprietaires']);
  }

  protected openTerrain(id: string): void {
    void this.router.navigate(['/terrains', id]);
  }

  protected openBienLocatif(id: string): void {
    void this.router.navigate(['/locatif/biens', id]);
  }

  protected newBienLocatif(): void {
    void this.router.navigate(['/locatif/biens/nouveau'], {
      queryParams: { proprietaireId: this.id },
    });
  }

  protected bienPill(value: string): string {
    return bienPill(BIEN_STATUTS, value);
  }

  protected bienLabel(value: string): string {
    return bienStatutLabel(BIEN_STATUTS, value);
  }

  protected bienHelp(value: string): string {
    return bienHelp(BIEN_STATUTS, value);
  }

  protected typeBien(value: string): string {
    return simpleLabel(TYPES_BIEN, value);
  }

  protected openMandat(id: string): void {
    void this.router.navigate(['/mandats', id]);
  }

  protected newTerrain(): void {
    void this.router.navigate(['/terrains/nouveau'], { queryParams: { proprietaireId: this.id } });
  }

  protected newMandat(): void {
    void this.router.navigate(['/mandats/nouveau'], { queryParams: { proprietaireId: this.id } });
  }

  protected terrainPill(value: string): string {
    return terrainPill(COMMERCIAL_STATUS, value);
  }

  protected terrainHelp(value: string): string {
    return terrainHelp(COMMERCIAL_STATUS, value);
  }

  protected mandatPill(value: string): string {
    return mandatPill(MANDAT_STATUS, value);
  }

  protected mandatHelp(value: string): string {
    return mandatHelp(MANDAT_STATUS, value);
  }

  protected echeance(mandat: MandatListItem): { label: string; tone: string } {
    return echeanceInfo(mandat.dateFin, mandat.statut, mandat.alerteEcheanceJours);
  }

  protected location(terrain: TerrainListItem): string {
    return (
      [terrain.commune, terrain.region].filter(Boolean).join(', ') || 'Localisation non renseignée'
    );
  }

  protected edit(): void {
    const current = this.proprietaire();
    if (!current || !this.id) return;
    this.dialog
      .open(ProprietaireDialog, {
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
        data: { proprietaire: current as ProprietaireSummary },
      })
      .afterClosed()
      .subscribe((result: ProprietaireDialogResult | undefined) => {
        if (!result || !this.id) return;
        const id = this.id;
        this.api
          .update(id, result.payload)
          .pipe(
            switchMap(() =>
              this.api.enregistrerPiece(id, result.fichierPiece, result.retirerPiece).pipe(
                catchError((error: unknown) => {
                  this.notify.error(
                    error,
                    'Fiche enregistrée, mais la copie de la pièce n’a pas pu être mise à jour',
                  );
                  return of(null);
                }),
              ),
            ),
          )
          .subscribe({
            next: () => {
              this.notify.success('Propriétaire mis à jour');
              this.load(this.id!);
            },
            error: (error: unknown) =>
              this.notify.error(error, 'Impossible de mettre à jour le propriétaire'),
          });
      });
  }

  protected openCreateClientAccount(): void {
    const current = this.proprietaire();
    if (!current?.email || !this.canCreateClient) return;
    ClientAccountDialog.open(this.dialog, {
      email: current.email,
      name: `${current.firstName} ${current.lastName}`,
      scopeDescription: 'suivre son bien, le locataire en place et les loyers encaissés',
      create: (password) => this.api.createClientAccount(current.id, password),
    }).subscribe((cree) => {
      // L'accès vient d'être ouvert : l'onglet montre aussitôt « Accès ouvert ».
      if (cree && this.id) this.load(this.id);
    });
  }

  protected remove(): void {
    const current = this.proprietaire();
    const id = this.id;
    if (!id || !current) return;
    this.confirmer
      .ask(
        `Supprimer ${current.firstName} ${current.lastName} ? Impossible s’il a encore un mandat.`,
      )
      .subscribe((confirme) => {
        if (!confirme) return;
        this.api.remove(id).subscribe({
          next: () => {
            this.notify.success('Propriétaire supprimé');
            this.goBack();
          },
          error: (error: unknown) =>
            this.notify.error(
              error,
              'Impossible de supprimer : des mandats y sont encore rattachés',
            ),
        });
      });
  }

  private load(id: string): void {
    if (!this.chargementInitialFait) this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (proprietaire) => {
        this.proprietaire.set(proprietaire);
        this.finChargement();
      },
      error: (error: unknown) => {
        this.finChargement();
        this.notify.error(error, 'Propriétaire introuvable');
        this.goBack();
      },
    });
    if (this.canSeeTerrains) {
      this.terrainsApi.findAll({ proprietaireId: id, pageSize: 100 }).subscribe({
        next: (page) => this.terrains.set(page.items),
        error: () => this.terrains.set([]),
      });
    } else {
      this.terrains.set([]);
    }
    if (this.canSeeLocatif) {
      this.locatifApi.findBiens({ proprietaireId: id, pageSize: 100 }).subscribe({
        next: (page) => this.biensLocatifs.set(page.items),
        error: () => this.biensLocatifs.set([]),
      });
    } else {
      this.biensLocatifs.set([]);
    }
    if (this.canSeeMandats) {
      this.mandatsApi.findAll({ proprietaireId: id, pageSize: 100 }).subscribe({
        next: (page) => this.mandats.set(page.items),
        error: () => this.mandats.set([]),
      });
    } else {
      this.mandats.set([]);
    }
  }

  /** Le squelette ne s'affiche qu'au premier chargement : ensuite l'écran se met à jour en place, sans clignoter ni remonter. */
  private chargementInitialFait = false;

  private finChargement(): void {
    this.loading.set(false);
    this.chargementInitialFait = true;
  }
}
