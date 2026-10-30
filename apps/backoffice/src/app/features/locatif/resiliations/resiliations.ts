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
import { Pagination } from '../../../shared/components/pagination/pagination';

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
  imports: [Pagination, DatePipe, RouterLink, MatButtonModule],
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
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly total = signal(0);
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
    this.page.set(1);
    this.charger();
  }

  protected aller(page: number): void {
    this.page.set(page);
    this.charger();
  }

  protected changerTaille(taille: number): void {
    this.pageSize.set(taille);
    this.page.set(1);
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
    this.api.findResiliations(this.onglet() || undefined, this.page(), this.pageSize()).subscribe({
      next: (page) => {
        // Une page devenue vide (la dernière demande vient d'être traitée) : on revient à la dernière page qui existe.
        if (page.items.length === 0 && page.total > 0 && page.page > 1) {
          this.page.set(Math.ceil(page.total / page.pageSize));
          this.charger();
          return;
        }
        this.items.set(page.items);
        this.page.set(page.page);
        this.total.set(page.total);
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
