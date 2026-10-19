import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { type FicheChantier, type PaiementChantier, TresorerieApiService } from '../../core/services/api/tresorerie-api.service';
import { SessionService } from '../../core/services/session.service';
import { JustificationDialog } from '../../shared/dialogs/justification-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from './finances-utils';
import { MODES_PAIEMENT, aujourdhuiIso, dateFr, libelleMode, nomPersonne, selectionnerFichier } from './finances-outils';
import { FormDialog } from './form-dialog';

const STATUTS: Record<string, { label: string; ton: string }> = {
  en_attente: { label: 'À valider', ton: 'warning' },
  valide: { label: 'Validé', ton: 'success' },
  rejete: { label: 'Rejeté', ton: 'red' },
};

const ECHEANCES: Record<string, { label: string; ton: string }> = {
  payee: { label: 'Payée', ton: 'success' },
  partielle: { label: 'Partielle', ton: 'warning' },
  a_payer: { label: 'À payer', ton: 'neutral' },
};

/**
 * Fiche financière d'un chantier : échéancier du client (acompte d'environ
 * 50 %, puis paiements selon l'avancement), recettes confirmées, coût réel,
 * marge prévisionnelle et marge réelle, coût final estimé.
 */
@Component({
  selector: 'app-chantier-finance-fiche',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  styleUrl: './finances-pages.scss',
  template: `
    <div class="page-grille">
      @if (fiche(); as f) {
        <header class="page-header">
          <div>
            <p class="eyebrow"><a routerLink="/finances/chantiers">Rentabilité des chantiers</a></p>
            <h1 class="page-header__title">{{ f.projet.referenceInterne }} — {{ f.projet.intitule }}</h1>
            <p class="page-header__subtitle">
              Client : {{ f.projet.client ?? '—' }} · avancement {{ f.projet.avancement }} % · statut {{ f.projet.statut }}
            </p>
          </div>
          <div class="page-header__actions">
            <a mat-stroked-button [routerLink]="['/construction/chantiers', f.projet.id]">Ouvrir le chantier</a>
          </div>
        </header>

        @if (f.depassementBudget) {
          <aside class="alerte" role="status">
            <strong>Le coût réel dépasse le budget prévu</strong>
            {{ fcfa(f.coutReel) }} dépensés pour {{ fcfa(f.budgetPrevu) }} de budget.
          </aside>
        }

        <section class="tuiles" aria-label="Chiffres du chantier">
          <article class="tuile"><span>Prix du chantier</span><strong>{{ fcfa(f.prixTotal) }}</strong></article>
          <article class="tuile"><span>Budget prévisionnel</span><strong>{{ fcfa(f.budgetPrevu) }}</strong></article>
          <article class="tuile">
            <span>Recettes confirmées</span>
            <strong>{{ fcfa(f.recettesConfirmees) }}</strong>
            @if (f.recettesEnAttente > 0) {
              <small>+ {{ fcfa(f.recettesEnAttente) }} à valider</small>
            }
          </article>
          <article class="tuile">
            <span>Coût réel (payé par MTM)</span>
            <strong>{{ fcfa(f.coutReel) }}</strong>
            @if (f.depensesEnAttente > 0) {
              <small>+ {{ fcfa(f.depensesEnAttente) }} de dépenses à valider</small>
            }
          </article>
          <article class="tuile"><span>Marge prévisionnelle</span><strong>{{ fcfa(f.margePrevisionnelle) }}</strong></article>
          <article class="tuile" [class.tuile--danger]="f.margeReelle < 0">
            <span>Marge réelle</span>
            <strong [class.negatif]="f.margeReelle < 0">{{ fcfa(f.margeReelle) }}</strong>
            <small>Recettes confirmées − coût réel</small>
          </article>
          <article class="tuile">
            <span>Coût final estimé</span>
            <strong>{{ fcfa(f.coutFinalEstime) }}</strong>
            <small>Reste à engager : {{ fcfa(f.resteAEngager) }}</small>
          </article>
          <article class="tuile" [class.tuile--attention]="f.resteACollecter > 0">
            <span>Reste à collecter</span>
            <strong>{{ fcfa(f.resteACollecter) }}</strong>
          </article>
          <article class="tuile">
            <span>Achats directs du client</span>
            <strong>{{ fcfa(f.achatsClient) }}</strong>
            <small>Hors trésorerie de MTM</small>
          </article>
        </section>

        <div class="deux-colonnes">
          <section class="page-card">
            <div class="barre">
              <h2>Échéancier du client</h2>
              @if (peutModifier) {
                <button mat-stroked-button type="button" (click)="definirEcheances(f)">
                  {{ f.echeances.length ? 'Refaire l’échéancier' : 'Définir l’échéancier' }}
                </button>
              }
            </div>
            @if (f.echeances.length === 0) {
              <p class="vide">
                Aucun échéancier : l’usage est un acompte d’environ 50 % au démarrage, puis des paiements selon
                l’avancement.
              </p>
            } @else {
              <div class="tableau-defilant">
                <table>
                  <thead>
                    <tr>
                      <th>Échéance</th>
                      <th>Date</th>
                      <th class="nombre">Prévu</th>
                      <th class="nombre">Payé</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (e of f.echeances; track e.id) {
                      <tr>
                        <td>{{ e.ordre }}. {{ e.libelle }}</td>
                        <td>{{ dateFr(e.dateEcheance) }}</td>
                        <td class="nombre">{{ fcfa(e.montantPrevu) }}</td>
                        <td class="nombre">{{ fcfa(e.montantPaye) }}</td>
                        <td>
                          <span [class]="'mtm-badge mtm-badge--' + echeance(e.statut).ton">{{ echeance(e.statut).label }}</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="page-card">
            <h2>Dépenses payées par MTM, par poste</h2>
            @if (f.depensesParPoste.length === 0) {
              <p class="vide">Aucune dépense validée.</p>
            } @else {
              <div class="tableau-defilant">
                <table>
                  <tbody>
                    @for (d of f.depensesParPoste; track d.poste) {
                      <tr>
                        <td>{{ d.poste }}</td>
                        <td class="nombre">{{ fcfa(d.montant) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            <p class="aide">Les dépenses se saisissent et se valident dans le module Chantiers.</p>
          </section>
        </div>

        <section class="page-card">
          <div class="barre">
            <h2>Paiements du client</h2>
            @if (peutCreer) {
              <button mat-flat-button color="primary" type="button" (click)="nouveauPaiement(f)">Enregistrer un paiement</button>
            }
          </div>
          @if (f.paiements.length === 0) {
            <p class="vide">Aucun paiement enregistré.</p>
          } @else {
            <ul class="liste">
              @for (p of f.paiements; track p.id) {
                <li class="element">
                  <div class="element__principal">
                    <strong>{{ p.numero }}@if (p.echeance) { · {{ p.echeance.libelle }} }</strong>
                    <span class="meta">
                      {{ dateFr(p.date) }} · {{ libelleMode(p.mode) }}@if (p.reference) { · réf. {{ p.reference }} } · saisi par
                      {{ nom(p.recordedBy) }}@if (p.validatedBy) { · {{ p.statut === 'rejete' ? 'rejeté' : 'validé' }} par {{ nom(p.validatedBy) }} }
                    </span>
                    @if (p.motifRejet) {
                      <span class="meta">Rejeté : {{ p.motifRejet }}</span>
                    }
                    @if (p.justificatifUrl) {
                      <span class="meta"><a [href]="p.justificatifUrl" target="_blank" rel="noopener">Pièce jointe</a></span>
                    }
                  </div>
                  <div class="element__droite">
                    <span class="montant">{{ fcfa(p.montant) }}</span>
                    <span [class]="'mtm-badge mtm-badge--' + statut(p.statut).ton">{{ statut(p.statut).label }}</span>
                    <div class="actions">
                      @if (p.statut === 'en_attente' && peutValider && p.recordedById !== moi) {
                        <button mat-flat-button color="primary" type="button" (click)="valider(p)">Valider</button>
                        <button mat-stroked-button type="button" (click)="rejeter(p)">Rejeter</button>
                      }
                      @if (p.statut !== 'valide' && peutCreer) {
                        <button mat-button type="button" (click)="joindre(p)">
                          {{ p.justificatifUrl ? 'Remplacer la pièce' : 'Joindre une pièce' }}
                        </button>
                      }
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      } @else {
        <div class="skeleton" style="height: 260px"></div>
      }
    </div>
  `,
})
export class ChantierFinanceFiche implements OnInit {
  private readonly api = inject(TresorerieApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutCreer = this.session.hasPermission('finances:creer');
  protected readonly peutModifier = this.session.hasPermission('finances:modifier');
  protected readonly peutValider = this.session.hasPermission('finances:valider');
  protected readonly moi = this.session.user()?.id;

  protected readonly fiche = signal<FicheChantier | null>(null);
  private projetId = '';

  protected fcfa = fcfa;
  protected dateFr = dateFr;
  protected nom = nomPersonne;
  protected libelleMode = libelleMode;
  protected statut = (code: string) => STATUTS[code] ?? { label: code, ton: 'neutral' };
  protected echeance = (code: string) => ECHEANCES[code] ?? { label: code, ton: 'neutral' };

  ngOnInit(): void {
    this.projetId = this.route.snapshot.paramMap.get('id') ?? '';
    this.charger();
  }

  /** Une ligne par échéance : « libellé ; montant ; date (facultative) ». Proposition de départ : 50 % puis le solde. */
  protected definirEcheances(f: FicheChantier): void {
    const acompte = Math.round(f.prixTotal * 0.5);
    const proposition = f.echeances.length
      ? f.echeances
          .map((e) => [e.libelle, e.montantPrevu, e.dateEcheance?.slice(0, 10) ?? ''].join(' ; '))
          .join('\n')
      : `Acompte au démarrage ; ${acompte}\nSolde à la réception ; ${f.prixTotal - acompte}`;
    FormDialog.ouvrir(this.dialog, {
      titre: 'Échéancier de paiement du client',
      description: `Une ligne par échéance : libellé ; montant ; date (facultative, AAAA-MM-JJ). Prix du chantier : ${fcfa(f.prixTotal)}.`,
      confirmer: 'Enregistrer l’échéancier',
      champs: [{ cle: 'lignes', label: 'Échéances', type: 'textarea', requis: true, valeur: proposition }],
    }).subscribe((v) => {
      if (!v) return;
      const echeances: { libelle: string; montantPrevu: number; dateEcheance?: string }[] = [];
      for (const ligne of String(v['lignes']).split('\n')) {
        if (!ligne.trim()) continue;
        const [libelle, montant, date] = ligne.split(';').map((x) => x.trim());
        const montantPrevu = Number(montant);
        if (!libelle || !Number.isFinite(montantPrevu) || montantPrevu <= 0) {
          this.notify.error(`Ligne invalide : « ${ligne.trim()} ». Attendu : libellé ; montant ; date`);
          return;
        }
        echeances.push({ libelle, montantPrevu, ...(date ? { dateEcheance: date } : {}) });
      }
      this.api.definirEcheances(this.projetId, echeances).subscribe({
        next: (fiche) => {
          this.fiche.set(fiche);
          this.notify.success('Échéancier enregistré');
        },
        error: (e: unknown) => this.notify.error(e, 'Enregistrement impossible'),
      });
    });
  }

  protected nouveauPaiement(f: FicheChantier): void {
    FormDialog.ouvrir(this.dialog, {
      titre: 'Paiement reçu du client',
      description: 'Il compte dans les recettes du chantier une fois validé par une autre personne.',
      confirmer: 'Envoyer à la validation',
      champs: [
        {
          cle: 'echeanceId',
          label: 'Échéance concernée',
          type: 'select',
          options: f.echeances.map((e) => ({ valeur: e.id, label: `${e.ordre}. ${e.libelle} (${fcfa(e.reste)} restant)` })),
        },
        { cle: 'montant', label: 'Montant (FCFA)', type: 'number', requis: true, min: 1 },
        { cle: 'date', label: 'Date du paiement', type: 'date', requis: true, valeur: aujourdhuiIso() },
        { cle: 'mode', label: 'Moyen de paiement', type: 'select', requis: true, options: MODES_PAIEMENT, valeur: 'virement' },
        { cle: 'reference', label: 'Référence de la transaction' },
        { cle: 'notes', label: 'Notes', type: 'textarea' },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.api
        .enregistrerPaiementChantier(this.projetId, {
          echeanceId: v['echeanceId'] as string | undefined,
          montant: v['montant'] as number,
          date: v['date'] as string,
          mode: v['mode'] as string,
          reference: v['reference'] as string | undefined,
          notes: v['notes'] as string | undefined,
        })
        .subscribe({
          next: () => {
            this.notify.success('Paiement enregistré : il attend sa validation');
            this.charger();
          },
          error: (e: unknown) => this.notify.error(e, 'Enregistrement impossible'),
        });
    });
  }

  protected valider(p: PaiementChantier): void {
    this.api.validerPaiementChantier(p.id).subscribe({
      next: () => {
        this.notify.success('Paiement validé');
        this.charger();
      },
      error: (e: unknown) => this.notify.error(e, 'Validation impossible'),
    });
  }

  protected rejeter(p: PaiementChantier): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Rejeter le paiement',
      description: 'Le paiement repart chez son auteur avec votre motif.',
      confirmLabel: 'Rejeter',
    }).subscribe((motif) => {
      if (!motif) return;
      this.api.rejeterPaiementChantier(p.id, motif).subscribe({
        next: () => {
          this.notify.success('Paiement rejeté');
          this.charger();
        },
        error: (e: unknown) => this.notify.error(e, 'Rejet impossible'),
      });
    });
  }

  protected async joindre(p: PaiementChantier): Promise<void> {
    const { file, erreur } = await selectionnerFichier();
    if (erreur) this.notify.error(erreur);
    if (!file) return;
    this.api.joindrePaiementChantier(p.id, file).subscribe({
      next: () => {
        this.notify.success('Pièce jointe');
        this.charger();
      },
      error: (e: unknown) => this.notify.error(e, 'Envoi impossible'),
    });
  }

  private charger(): void {
    this.api.fiche(this.projetId).subscribe({
      next: (f) => this.fiche.set(f),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger la fiche'),
    });
  }
}
