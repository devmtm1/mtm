import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucidePencil } from '@lucide/angular';
import { LocatifApiService } from '../../../../core/services/api/locatif-api.service';
import { SessionService } from '../../../../core/services/session.service';
import type { Locataire, LocataireBail } from '../../../../core/models/locatif.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FicheEntete } from '../../../../shared/components/fiche-client/fiche-entete';
import { FicheEspaceClient } from '../../../../shared/components/fiche-client/fiche-espace-client';
import { FicheIdentite, type ComplementFiche } from '../../../../shared/components/fiche-client/fiche-identite';
import { FicheOnglets, type OngletFiche } from '../../../../shared/components/fiche-client/fiche-onglets';
import { type DonneesFiche } from '../../../../core/models/fiche-client';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import {
  BAIL_STATUTS,
  BAIL_STATUTS_TERMINES,
  help as bailHelp,
  label as bailLabel,
  nomPropre,
  pillClass as bailPill,
} from '../../locatif-status';
import { LocataireDialog } from '../locataire-dialog';
import { ClientAccountDialog } from '../../../../shared/dialogs/client-account-dialog';

/**
 * Fiche locataire (J2.1) : coordonnées et historique complet de ses baux,
 * tous biens confondus.
 */
@Component({
  selector: 'app-locataire-detail',
  imports: [
    FicheEntete,
    FicheEspaceClient,
    FicheIdentite,
    FicheOnglets,
    MoneyPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    LucidePencil,
  ],
  templateUrl: './locataire-detail.html',
  styleUrl: './locataire-detail.scss',
})
export class LocataireDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(LocatifApiService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  protected readonly locataire = signal<Locataire | null>(null);
  protected readonly onglet = signal('identite');
  /** L'identité rangée au format commun des fiches. */
  protected readonly donneesFiche = computed<DonneesFiche>(() => {
    const l = this.locataire();
    return {
      prenom: l?.firstName,
      nom: l?.lastName,
      telephone: l?.phone,
      email: l?.email,
      adresse: l?.adresse,
      dateNaissance: l?.dateNaissance,
      lieuNaissance: l?.lieuNaissance,
      nationalite: l?.nationalite,
      profession: l?.profession,
      typePiece: l?.typePiece,
      numeroPiece: l?.numeroPiece,
      pieceValiditeLe: l?.pieceValiditeLe,
      pieceUrl: l?.pieceUrl,
      urgenceNom: l?.urgenceNom,
      urgenceLien: l?.urgenceLien,
      urgenceTelephone: l?.urgenceTelephone,
    };
  });
  /** Notes du dossier, à la suite de l'identité. */
  protected readonly complements = computed<ComplementFiche[]>(() => {
    const l = this.locataire();
    return l ? [{ titre: 'Dossier', lignes: [{ libelle: 'Notes internes', valeur: l.notes }] }] : [];
  });
  protected readonly onglets = computed<OngletFiche[]>(() => {
    return [
      { id: 'identite', libelle: 'Identité', icone: 'identite' },
      { id: 'baux', libelle: 'Baux', icone: 'baux', pastille: this.baux()?.length ?? null },
      { id: 'espace-client', libelle: 'Espace client', icone: 'espace' },
    ];
  });
  protected readonly baux = signal<LocataireBail[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('locatif:modifier');
  protected readonly canSeeBien = this.session.hasPermission('locatif:consulter');
  protected readonly canCreateClient = this.session.hasPermission('clients:creer');

  /** Le nom tel qu'on le présente : capitales initiales, sans toucher la donnée. */
  protected nom(locataire: Locataire): string {
    return nomPropre(locataire);
  }

  protected readonly bauxActifs = computed(
    () => (this.baux() ?? []).filter((bail) => !BAIL_STATUTS_TERMINES.includes(bail.statut)).length,
  );

  private id: string | null = null;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) {
      this.goBack();
      return;
    }
    this.load(this.id);
  }

  protected goBack(): void {
    void this.router.navigate(['/locatif/locataires']);
  }

  protected openBien(bail: LocataireBail): void {
    void this.router.navigate(['/locatif/biens', bail.bienLocatif.id]);
  }

  protected bailLabel(value: string): string {
    return bailLabel(BAIL_STATUTS, value);
  }

  protected bailHelp(value: string): string {
    return bailHelp(BAIL_STATUTS, value);
  }

  protected bailPill(value: string): string {
    return bailPill(BAIL_STATUTS, value);
  }

  protected edit(): void {
    const current = this.locataire();
    if (!current || !this.id) return;
    LocataireDialog.open(this.dialog, { locataire: current }).subscribe((updated) => {
      if (!updated || !this.id) return;
      this.notify.success('Locataire mis à jour');
      this.load(this.id);
    });
  }

  protected openCreateClientAccount(): void {
    const current = this.locataire();
    if (!current?.email || !this.canCreateClient) return;
    ClientAccountDialog.open(this.dialog, {
      email: current.email,
      name: `${current.firstName} ${current.lastName}`,
      scopeDescription: 'suivre son bail, ses échéances, ses quittances et ses paiements',
      create: (password) => this.api.createLocataireClientAccount(current.id, password),
    }).subscribe((cree) => {
      // L'accès vient d'être ouvert : l'onglet montre aussitôt « Accès ouvert ».
      if (cree && this.id) this.load(this.id);
    });
  }

  private load(id: string): void {
    if (!this.chargementInitialFait) this.loading.set(true);
    this.api.findLocataire(id).subscribe({
      next: (locataire) => {
        this.locataire.set(locataire);
        this.finChargement();
      },
      error: (error: unknown) => {
        this.finChargement();
        this.notify.error(error, 'Locataire introuvable');
        this.goBack();
      },
    });
    this.api.findLocataireBaux(id).subscribe({
      next: (baux) => this.baux.set(baux),
      error: () => this.baux.set([]),
    });
  }

  /** Le squelette ne s'affiche qu'au premier chargement : ensuite l'écran se met à jour en place, sans clignoter ni remonter. */
  private chargementInitialFait = false;

  private finChargement(): void {
    this.loading.set(false);
    this.chargementInitialFait = true;
  }
}
