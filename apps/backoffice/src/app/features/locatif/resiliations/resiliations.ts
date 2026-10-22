import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { SejoursApiService } from '../../../core/services/api/sejours-api.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import type { DemandeResiliation, ResiliationStats } from '../../../core/models/sejour.model';
import { TraiterResiliationDialog } from './resiliation-dialogs';
import {
  CANAUX_RESILIATION,
  MOTIFS_RESILIATION,
  STATUTS_RESILIATION,
  formatJour,
  libelle,
  nomVoyageur,
} from '../sejours/sejour-status';

const ONGLETS = [
  { value: 'en_attente', label: 'À traiter' },
  { value: '', label: 'Toutes' },
];

/**
 * Demandes de résiliation de bail : celles que les locataires déposent depuis
 * leur espace et celles que MTM enregistre après un appel ou un message. Accepter
 * ouvre le préavis du bail ; refuser explique pourquoi au locataire.
 */
@Component({
  selector: 'app-resiliations',
  imports: [DatePipe, RouterLink, MatButtonModule],
  templateUrl: './resiliations.html',
  styleUrl: './resiliations.scss',
})
export class Resiliations implements OnInit {
  private readonly api = inject(SejoursApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canModify = computed(() => this.session.hasPermission('locatif:modifier'));

  protected readonly onglets = ONGLETS;
  protected readonly onglet = signal('en_attente');
  protected readonly loading = signal(true);
  protected readonly items = signal<DemandeResiliation[]>([]);
  protected readonly stats = signal<ResiliationStats | null>(null);

  protected readonly statuts = STATUTS_RESILIATION;
  protected readonly motifs = MOTIFS_RESILIATION;
  protected readonly canaux = CANAUX_RESILIATION;
  protected readonly jour = formatJour;
  protected readonly libelle = libelle;
  protected readonly locataire = nomVoyageur;

  ngOnInit(): void {
    this.charger();
  }

  protected choisir(valeur: string): void {
    this.onglet.set(valeur);
    this.charger();
  }

  protected traiter(demande: DemandeResiliation): void {
    TraiterResiliationDialog.open(this.dialog, { demande, preavisJours: this.stats()?.preavisJours ?? 30 }).subscribe((resultat) => {
      if (!resultat) return;
      this.notify.success(
        resultat.statut === 'acceptee' ? 'Demande acceptée : le préavis du bail est ouvert' : 'Demande refusée : le locataire en est informé',
      );
      this.charger();
    });
  }

  private charger(): void {
    if (!this.chargementInitialFait) this.loading.set(true);
    this.api.getResiliationStats().subscribe({ next: (stats) => this.stats.set(stats), error: () => this.stats.set(null) });
    this.api.findResiliations(this.onglet() || undefined).subscribe({
      next: (page) => {
        this.items.set(page.items);
        this.finChargement();
      },
      error: (error: unknown) => {
        this.finChargement();
        this.notify.error(error, 'Impossible de charger les demandes');
      },
    });
  }

  /** Le squelette ne s'affiche qu'au premier chargement : ensuite l'écran se met à jour en place, sans clignoter ni remonter. */
  private chargementInitialFait = false;

  private finChargement(): void {
    this.loading.set(false);
    this.chargementInitialFait = true;
  }
}
