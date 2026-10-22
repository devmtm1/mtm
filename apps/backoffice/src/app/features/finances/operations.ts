import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LucidePlus } from '@lucide/angular';
import {
  type PouvoirAutorisation,
  TresorerieApiService,
  peutAutoriserMontant,
} from '../../core/services/api/tresorerie-api.service';
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
import { NIVEAUX_VALIDATION, nomPersonne, selectionnerFichier } from './finances-outils';
import { FormDialog } from './form-dialog';

const ONGLETS: { code: string; label: string }[] = [
  { code: 'a_autoriser', label: 'À autoriser' },
  { code: 'en_attente', label: 'À valider' },
  { code: 'validee', label: 'Validées' },
  { code: 'rejetee', label: 'Rejetées' },
  { code: 'sans_piece', label: 'Sans pièce' },
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
  private readonly tresorerie = inject(TresorerieApiService);

  protected readonly peutCreer = this.session.hasPermission('finances:creer');
  protected readonly peutModifier = this.session.hasPermission('finances:modifier');
  protected readonly peutValider = this.session.hasPermission('finances:valider');
  protected readonly moi = this.session.user()?.id;

  protected readonly onglets = ONGLETS;
  protected readonly onglet = signal('en_attente');
  protected readonly pouvoir = signal<PouvoirAutorisation | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly resultat = signal<OperationsPage | null>(null);
  protected readonly pages = computed(() => {
    const r = this.resultat();
    return r ? Math.max(1, Math.ceil(r.total / r.pageSize)) : 1;
  });

  ngOnInit(): void {
    this.tresorerie.monPouvoir().subscribe({ next: (p) => this.pouvoir.set(p) });
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

  protected niveau = (n: number) => NIVEAUX_VALIDATION[n] ?? NIVEAUX_VALIDATION[0];
  protected nomPersonne = nomPersonne;

  /** Le bouton « Autoriser » n'est offert qu'à qui a le pouvoir pour ce montant ; le serveur tranche toujours. */
  protected peutAutoriserCette(operation: OperationFinanciere): boolean {
    return (
      operation.aAutoriser &&
      operation.createdById !== this.moi &&
      peutAutoriserMontant(this.pouvoir(), operation.montant)
    );
  }

  protected autoriser(operation: OperationFinanciere): void {
    FormDialog.ouvrir(this.dialog, {
      titre: 'Autoriser cette dépense',
      description: `${operation.libelle} — ${fcfa(operation.montant)} (${operation.niveauLibelle}). La comptable pourra ensuite la valider.`,
      confirmer: 'Autoriser',
      champs: [
        {
          cle: 'motif',
          label: 'Motif de l’autorisation',
          type: 'textarea',
          requis: operation.niveauValidation >= 2,
          aide: operation.niveauValidation >= 2 ? 'Obligatoire : autorisation expresse' : 'Facultatif',
        },
        {
          cle: 'distance',
          label: 'Paiement exceptionnel autorisé à distance (Direction en déplacement)',
          type: 'checkbox',
          aide: 'Si coché, le motif devient obligatoire et la trace est visible de la Direction.',
        },
      ],
    }).subscribe((v) => {
      if (!v) return;
      if (v['distance'] && !v['motif']) {
        this.notify.error('Un paiement autorisé à distance doit être motivé');
        return;
      }
      this.api
        .authorizeOperation(operation.id, { motif: v['motif'] as string | undefined, distance: v['distance'] === true })
        .subscribe({
          next: () => {
            this.notify.success('Dépense autorisée : la comptable peut la valider');
            this.charger();
          },
          error: (error: unknown) => this.notify.error(error, 'Autorisation impossible'),
        });
    });
  }

  /** Une écriture validée ne s'efface pas : on l'annule ou on l'ajuste par une écriture liée, motivée. */
  protected corriger(operation: OperationFinanciere): void {
    FormDialog.ouvrir(this.dialog, {
      titre: 'Corriger une écriture validée',
      description: `${operation.libelle} — ${fcfa(operation.montant)}. L’écriture d’origine reste consultable ; la correction la référence, porte votre motif et demande l’autorisation de la Direction.`,
      confirmer: 'Enregistrer la correction',
      champs: [
        {
          cle: 'type',
          label: 'Type de correction',
          type: 'select',
          requis: true,
          valeur: 'annulation',
          options: [
            { valeur: 'annulation', label: 'Annulation : écriture inverse du même montant' },
            { valeur: 'ajustement', label: 'Ajustement : nouvelle écriture d’un montant précis' },
          ],
        },
        {
          cle: 'sens',
          label: 'Sens de l’ajustement',
          type: 'select',
          options: [
            { valeur: 'depense', label: 'Dépense' },
            { valeur: 'recette', label: 'Recette' },
          ],
        },
        { cle: 'montant', label: 'Montant de l’ajustement (FCFA)', type: 'number', min: 1 },
        { cle: 'motif', label: 'Motif de la correction', type: 'textarea', requis: true, minLength: 5 },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.api
        .correctOperation(operation.id, {
          type: v['type'] as 'annulation' | 'ajustement',
          motif: v['motif'] as string,
          sens: v['sens'] as string | undefined,
          montant: v['montant'] as number | undefined,
        })
        .subscribe({
          next: () => {
            this.notify.success('Correction enregistrée : elle attend l’autorisation de la Direction');
            this.charger();
          },
          error: (error: unknown) => this.notify.error(error, 'Correction impossible'),
        });
    });
  }

  protected async joindrePiece(operation: OperationFinanciere): Promise<void> {
    const { file, erreur } = await selectionnerFichier();
    if (erreur) this.notify.error(erreur);
    if (!file) return;
    this.api.attachProof(operation.id, file).subscribe({
      next: () => {
        this.notify.success('Justificatif joint');
        this.charger();
      },
      error: (error: unknown) => this.notify.error(error, 'Envoi impossible'),
    });
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
    if (!this.chargementInitialFait) this.loading.set(true);
    const onglet = this.onglet();
    const filtre =
      onglet === 'a_autoriser'
        ? { aAutoriser: true }
        : onglet === 'sans_piece'
          ? { sansJustificatif: true }
          : { statut: onglet };
    this.api.operations({ ...filtre, page: this.page(), pageSize: 25 }).subscribe({
      next: (resultat) => {
        this.resultat.set(resultat);
        this.finChargement();
      },
      error: (error: unknown) => {
        this.finChargement();
        this.notify.error(error, 'Impossible de charger les saisies');
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
