import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LucidePlus } from '@lucide/angular';
import {
  type OperationFinanciere,
  type OperationsPage,
  FinancesApiService,
} from '../../core/services/api/finances-api.service';
import { SessionService } from '../../core/services/session.service';
import { ConfirmService } from '../../shared/dialogs/confirm-dialog';
import { JustificationDialog } from '../../shared/dialogs/justification-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { OperationDialog } from './operation-dialog';
import { STATUTS_OPERATION, fcfa, libelleActivite, libelleCategorie } from './finances-utils';

const ONGLETS: { code: string; label: string }[] = [
  { code: 'en_attente', label: 'À valider' },
  { code: 'validee', label: 'Validées' },
  { code: 'rejetee', label: 'Rejetées' },
  { code: '', label: 'Toutes' },
];

/**
 * Saisies manuelles : dépenses de fonctionnement, autres recettes, paiements
 * d'un client de chantier. Saisie par une personne, validation par une autre.
 */
@Component({
  selector: 'app-operations-financieres',
  standalone: true,
  imports: [RouterLink, MatButtonModule, LucidePlus],
  templateUrl: './operations.html',
  styleUrl: './operations.scss',
})
export class OperationsFinancieres implements OnInit {
  private readonly api = inject(FinancesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly confirmer = inject(ConfirmService);
  private readonly session = inject(SessionService);

  protected readonly peutCreer = this.session.hasPermission('finances:creer');
  protected readonly peutModifier = this.session.hasPermission('finances:modifier');
  protected readonly peutValider = this.session.hasPermission('finances:valider');
  protected readonly moi = this.session.user()?.id;

  protected readonly onglets = ONGLETS;
  protected readonly onglet = signal('en_attente');
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly resultat = signal<OperationsPage | null>(null);
  protected readonly pages = computed(() => {
    const r = this.resultat();
    return r ? Math.max(1, Math.ceil(r.total / r.pageSize)) : 1;
  });

  ngOnInit(): void {
    this.charger();
  }

  protected changerOnglet(code: string): void {
    this.onglet.set(code);
    this.page.set(1);
    this.charger();
  }

  protected aller(page: number): void {
    this.page.set(page);
    this.charger();
  }

  protected nouvelle(): void {
    OperationDialog.open(this.dialog, {}).subscribe((change) => change && this.charger());
  }

  protected modifier(operation: OperationFinanciere): void {
    OperationDialog.open(this.dialog, { existante: operation }).subscribe((change) => change && this.charger());
  }

  protected valider(operation: OperationFinanciere): void {
    this.api.validateOperation(operation.id).subscribe({
      next: () => {
        this.notify.success('Opération validée : elle compte désormais dans les totaux');
        this.charger();
      },
      error: (error: unknown) => this.notify.error(error, 'Validation impossible'),
    });
  }

  protected rejeter(operation: OperationFinanciere): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Rejeter la saisie',
      description: `« ${operation.libelle} » repart chez ${operation.createdBy.firstName} avec votre motif, pour correction.`,
      confirmLabel: 'Rejeter',
    }).subscribe((motif) => {
      if (!motif) return;
      this.api.rejectOperation(operation.id, motif).subscribe({
        next: () => {
          this.notify.success('Saisie rejetée');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Rejet impossible'),
      });
    });
  }

  protected supprimer(operation: OperationFinanciere): void {
    this.confirmer.ask(`Supprimer la saisie « ${operation.libelle} » ?`).subscribe((ok) => {
      if (!ok) return;
      this.api.removeOperation(operation.id).subscribe({
        next: () => {
          this.notify.success('Saisie supprimée');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
      });
    });
  }

  /** Modifiable tant qu'elle n'est pas validée ; seul l'auteur (ou l'administration) le peut, le serveur tranche. */
  protected modifiable(operation: OperationFinanciere): boolean {
    return this.peutModifier && operation.statut !== 'validee' && operation.createdById === this.moi;
  }

  protected fcfa = fcfa;
  protected libelleActivite = libelleActivite;
  protected categorie = libelleCategorie;
  protected statut = (code: OperationFinanciere['statut']) => STATUTS_OPERATION[code];

  protected date(valeur: string): string {
    return new Date(valeur).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  }

  protected auteur(operation: OperationFinanciere): string {
    return `${operation.createdBy.firstName} ${operation.createdBy.lastName}`.trim();
  }

  private charger(): void {
    this.loading.set(true);
    this.api.operations({ statut: this.onglet(), page: this.page(), pageSize: 25 }).subscribe({
      next: (resultat) => {
        this.resultat.set(resultat);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les saisies');
      },
    });
  }
}
