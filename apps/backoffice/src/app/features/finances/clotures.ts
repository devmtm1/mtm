import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { type MoisCloture, FinancesApiService } from '../../core/services/api/finances-api.service';
import { SessionService } from '../../core/services/session.service';
import { ConfirmService } from '../../shared/dialogs/confirm-dialog';
import { JustificationDialog } from '../../shared/dialogs/justification-dialog';
import { periodeLabel } from '../../shared/charts/mtm-charts';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from './finances-utils';

/**
 * Clôture mensuelle : un mois clôturé garde ses chiffres et plus aucun
 * paiement, dépense ou saisie daté de ce mois ne peut le modifier. Une
 * correction se passe alors à la date du jour — ou le mois est rouvert, avec un
 * motif consigné.
 */
@Component({
  selector: 'app-clotures-financieres',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './clotures.html',
  styleUrl: './clotures.scss',
})
export class CloturesFinancieres implements OnInit {
  private readonly api = inject(FinancesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly confirmer = inject(ConfirmService);
  private readonly session = inject(SessionService);

  protected readonly peutAdministrer = this.session.hasPermission('finances:administrer');
  protected readonly loading = signal(true);
  protected readonly mois = signal<MoisCloture[]>([]);
  protected readonly toutAfficher = signal(false);
  /** Les six derniers mois et ceux déjà clôturés : la liste complète n'est qu'à un clic. */
  protected readonly affiches = computed(() =>
    this.toutAfficher() ? this.mois() : this.mois().filter((m, i) => i < 6 || m.cloture),
  );
  protected readonly masques = computed(() => this.mois().length - this.affiches().length);
  protected readonly occupe = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  protected cloturer(mois: MoisCloture): void {
    this.confirmer
      .ask({
        title: `Clôturer ${this.libelle(mois.periode)}`,
        message:
          'Les totaux du mois seront figés. Plus aucun paiement, aucune dépense ni aucune saisie daté de ce mois ne pourra être ajouté, validé ou annulé. Vous pourrez rouvrir le mois en indiquant un motif.',
        confirmLabel: 'Clôturer le mois',
        danger: false,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.occupe.set(mois.periode);
        this.api.cloturer(mois.periode).subscribe({
          next: () => {
            this.notify.success(`${this.libelle(mois.periode)} est clôturé`);
            this.charger();
          },
          error: (error: unknown) => {
            this.occupe.set(null);
            this.notify.error(error, 'Clôture impossible');
          },
        });
      });
  }

  protected rouvrir(mois: MoisCloture): void {
    JustificationDialog.ask(this.dialog, {
      title: `Rouvrir ${this.libelle(mois.periode)}`,
      description:
        'Rouvrir un mois autorise de nouveau les modifications datées de ce mois. Le motif est consigné dans l’historique des actions.',
      confirmLabel: 'Rouvrir le mois',
    }).subscribe((justification) => {
      if (!justification) return;
      this.occupe.set(mois.periode);
      this.api.rouvrir(mois.periode, justification).subscribe({
        next: () => {
          this.notify.success(`${this.libelle(mois.periode)} est rouvert`);
          this.charger();
        },
        error: (error: unknown) => {
          this.occupe.set(null);
          this.notify.error(error, 'Réouverture impossible');
        },
      });
    });
  }

  protected libelle = periodeLabel;
  protected fcfa = fcfa;

  protected date(valeur: string | null): string {
    return valeur ? new Date(valeur).toLocaleDateString('fr-FR') : '';
  }

  private charger(): void {
    if (!this.chargementInitialFait) this.loading.set(true);
    this.api.clotures().subscribe({
      next: (mois) => {
        this.mois.set(mois);
        this.finChargement();
        this.occupe.set(null);
      },
      error: (error: unknown) => {
        this.finChargement();
        this.notify.error(error, 'Impossible de charger les clôtures');
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
