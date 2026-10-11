import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideFileText, LucidePlus } from '@lucide/angular';
import type { Observable } from 'rxjs';
import { DemarchesApiService } from '../../../core/services/api/demarches-api.service';
import type {
  MissionDetail,
  PaiementMission,
  ReglementsMission,
  StatutReglement,
} from '../../../core/models/mission.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { MODES_PAIEMENT, label } from '../mission-status';
import { PaiementDialog } from './paiement-dialog';

const STATUTS: Record<StatutReglement, { libelle: string; pill: string }> = {
  a_facturer: { libelle: 'Prix à fixer', pill: 'status-pill' },
  non_regle: { libelle: 'Non réglé', pill: 'status-pill status-pill--danger' },
  partiel: { libelle: 'Partiellement réglé', pill: 'status-pill status-pill--warning' },
  solde: { libelle: 'Soldé', pill: 'status-pill status-pill--success' },
  trop_percu: { libelle: 'Trop-perçu', pill: 'status-pill status-pill--info' },
};

/**
 * Prix convenu, règlements reçus et facture d'une mission. Un client paie
 * souvent en plusieurs fois et chaque transfert (Wave, Orange Money) a ses
 * frais : on garde donc chaque règlement, et le total réglé, le solde et le
 * statut s'en déduisent. La facture se génère à la demande, garde son numéro
 * et reflète la situation du jour.
 */
@Component({
  selector: 'app-reglements-mission',
  imports: [DatePipe, MoneyPipe, MatButtonModule, MatTooltipModule, LucideFileText, LucidePlus],
  template: `
    <section class="page-card detail-section reglements">
      <div class="detail-section__head">
        <div>
          <h2>Règlements et facture</h2>
          <p class="detail-section__hint">
            Chaque règlement reçu est enregistré avec ses frais de transfert. Le solde se calcule sur le montant envoyé
            par le client.
          </p>
        </div>
        <span class="detail-section__actions">
          @if (canModify()) {
            <button mat-stroked-button type="button" (click)="ajouter()">
              <svg class="btn-icon" lucidePlus aria-hidden="true"></svg>Enregistrer un règlement
            </button>
          }
          @if (canValidate()) {
            <button
              mat-flat-button
              color="primary"
              type="button"
              [disabled]="!mission().montantDevis || occupe()"
              [matTooltip]="
                mission().montantDevis
                  ? 'Génère le PDF de la facture, avec les règlements reçus et le solde'
                  : 'Fixez d’abord le prix convenu de la mission'
              "
              (click)="genererFacture()"
            >
              <svg class="btn-icon" lucideFileText aria-hidden="true"></svg>
              {{ mission().factureReference ? 'Régénérer la facture' : 'Générer la facture' }}
            </button>
          }
        </span>
      </div>

      @if (donnees(); as reglements) {
        <div class="reglements__resume">
          <div>
            <span>Prix convenu</span>
            <strong>{{ reglements.synthese.montantConvenu | mtmMoney }}</strong>
          </div>
          <div>
            <span>Envoyé par le client</span>
            <strong>{{ reglements.synthese.totalEnvoye | mtmMoney }}</strong>
          </div>
          <div>
            <span>Frais de transfert</span>
            <strong>{{ reglements.synthese.totalFrais | mtmMoney }}</strong>
          </div>
          <div>
            <span>Net reçu</span>
            <strong>{{ reglements.synthese.totalNet | mtmMoney }}</strong>
          </div>
          <div class="reglements__solde">
            <span>{{ reglements.synthese.excedent > 0 ? 'Trop-perçu' : 'Reste à payer' }}</span>
            <strong>
              {{
                (reglements.synthese.excedent > 0 ? reglements.synthese.excedent : reglements.synthese.solde) | mtmMoney
              }}
            </strong>
            <em [class]="statut(reglements.synthese.statut).pill">{{ statut(reglements.synthese.statut).libelle }}</em>
          </div>
        </div>

        @if (mission().factureReference) {
          <p class="reglements__facture">
            Facture <strong>{{ mission().factureReference }}</strong>
            @if (mission().factureEmiseLe) {
              émise le {{ mission().factureEmiseLe | date: 'dd/MM/yyyy' }}
            }
            — le PDF est dans « Pièces du dossier ». Il n’est visible du client que si vous le publiez.
          </p>
        }

        @if (reglements.paiements.length) {
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Transaction</th>
                  <th class="is-right">Envoyé</th>
                  <th class="is-right">Frais</th>
                  <th class="is-right">Net reçu</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (paiement of reglements.paiements; track paiement.id) {
                  <tr>
                    <td>{{ paiement.datePaiement | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ mode(paiement.mode) }}</td>
                    <td>{{ paiement.reference || '—' }}</td>
                    <td class="is-right">
                      <strong>{{ paiement.montantEnvoye | mtmMoney }}</strong>
                    </td>
                    <td class="is-right">{{ paiement.frais | mtmMoney }}</td>
                    <td class="is-right">{{ paiement.montantNet | mtmMoney }}</td>
                    <td class="is-right">
                      @if (canModify()) {
                        <button mat-button type="button" (click)="corriger(paiement)">Corriger</button>
                      }
                      @if (canValidate()) {
                        <button mat-button type="button" (click)="supprimer(paiement)">Supprimer</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="detail-note">
            Aucun règlement enregistré.
            @if (canModify()) {
              <button mat-button type="button" (click)="ajouter()">Enregistrer le premier règlement</button>
            }
          </div>
        }
      } @else if (erreur()) {
        <div class="detail-note">Les règlements n’ont pas pu être chargés.</div>
      }
    </section>
  `,
  styles: `
    .reglements__resume { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 4px 0 16px; }
    .reglements__resume > div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border: 1px solid var(--mtm-border, #e5e7eb); border-radius: 10px; background: var(--mtm-surface, #fff); }
    .reglements__resume span { font-size: 0.75rem; color: var(--mtm-text-muted, #6b7280); }
    .reglements__resume strong { font-size: 1.02rem; }
    .reglements__resume em { align-self: flex-start; margin-top: 4px; font-style: normal; }
    .reglements__solde { border-color: var(--mtm-primary, #1a4974) !important; }
    .reglements__facture { margin: 0 0 14px; font-size: 0.88rem; color: var(--mtm-text-muted, #6b7280); }
    @media (max-width: 900px) { .reglements__resume { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
})
export class ReglementsMissionComponent {
  private readonly api = inject(DemarchesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  readonly mission = input.required<MissionDetail>();
  readonly modes = input<string[]>([]);
  readonly canModify = input(false);
  readonly canValidate = input(false);
  /** Le total réglé ou une pièce a changé : la fiche doit être relue. */
  readonly changed = output<void>();

  protected readonly donnees = signal<ReglementsMission | null>(null);
  protected readonly erreur = signal(false);
  protected readonly occupe = signal(false);

  constructor() {
    // Recharge les règlements quand la fiche est relue (prix modifié, etc.).
    effect(() => {
      // La fiche est relue après chaque action : ses règlements aussi.
      const { id } = this.mission();
      untracked(() => this.charger(id));
    });
  }

  protected statut(statut: StatutReglement) {
    return STATUTS[statut];
  }

  protected mode(mode: string): string {
    return label(MODES_PAIEMENT, mode);
  }

  protected ajouter(): void {
    const reglements = this.donnees();
    PaiementDialog.open(this.dialog, {
      modes: this.modes(),
      soldeRestant: reglements?.synthese.solde ?? null,
    }).subscribe((payload) => {
      if (payload) this.executer(this.api.addPaiement(this.mission().id, payload), 'Règlement enregistré');
    });
  }

  protected corriger(paiement: PaiementMission): void {
    PaiementDialog.open(this.dialog, { modes: this.modes(), paiement }).subscribe((payload) => {
      if (payload) {
        this.executer(this.api.updatePaiement(this.mission().id, paiement.id, payload), 'Règlement corrigé');
      }
    });
  }

  protected supprimer(paiement: PaiementMission): void {
    const reference = paiement.reference ? ` (${paiement.reference})` : '';
    if (!confirm(`Supprimer ce règlement${reference} ? Le solde de la mission sera recalculé. Cette action est tracée.`)) {
      return;
    }
    this.executer(this.api.removePaiement(this.mission().id, paiement.id), 'Règlement supprimé');
  }

  protected genererFacture(): void {
    this.executer(this.api.generateFacture(this.mission().id), 'Facture générée : elle est dans les pièces du dossier');
  }

  private charger(id: string): void {
    this.api.getPaiements(id).subscribe({
      next: (reglements) => {
        this.donnees.set(reglements);
        this.erreur.set(false);
      },
      error: () => this.erreur.set(true),
    });
  }

  private executer(action: Observable<unknown>, succes: string): void {
    this.occupe.set(true);
    action.subscribe({
      next: () => {
        this.occupe.set(false);
        this.notify.success(succes);
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.occupe.set(false);
        this.notify.error(error, 'Action impossible');
      },
    });
  }
}
