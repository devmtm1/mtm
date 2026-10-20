import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import {
  type Page,
  type PouvoirAutorisation,
  type Reversement,
  type SituationDossier,
  type SituationProprietaires,
  TresorerieApiService,
  peutAutoriserMontant,
} from '../../core/services/api/tresorerie-api.service';
import { SessionService } from '../../core/services/session.service';
import { JustificationDialog } from '../../shared/dialogs/justification-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from './finances-utils';
import {
  MODES_PAIEMENT,
  MODES_REVERSEMENT,
  aujourdhuiIso,
  dateFr,
  libelleMode,
  nomPersonne,
  selectionnerFichier,
} from './finances-outils';
import { FormDialog } from './form-dialog';

type Onglet = 'situation' | 'reversements';

const STATUTS: Record<string, { label: string; ton: string }> = {
  en_attente: { label: 'À autoriser', ton: 'warning' },
  autorise: { label: 'Autorisé : à payer', ton: 'primary' },
  paye: { label: 'Payé', ton: 'success' },
  rejete: { label: 'Rejeté', ton: 'red' },
};

/**
 * Terrains confiés par des propriétaires : MTM encaisse d'abord, déduit sa
 * commission contractuelle, puis reverse ce qui est dû. Le montant exigible
 * suit le mode du contrat. Une avance n'existe que sur autorisation expresse
 * de la Direction. Chaque reversement est autorisé, puis payé avec sa preuve.
 */
@Component({
  selector: 'app-reversements',
  standalone: true,
  imports: [MatButtonModule],
  styleUrl: './finances-pages.scss',
  template: `
    <div class="page-grille">
      <header class="page-header">
        <div>
          <p class="eyebrow">Finances</p>
          <h1 class="page-header__title">Propriétaires et reversements</h1>
          <p class="page-header__subtitle">
            L’argent encaissé pour le compte des propriétaires n’est pas celui de MTM. Ici : ce que MTM a encaissé, sa
            commission, ce qu’elle doit encore reverser, et chaque reversement, de la demande à la preuve de paiement.
          </p>
        </div>
      </header>

      <nav class="onglets" aria-label="Sections">
        <button type="button" [class.is-actif]="onglet() === 'situation'" (click)="aller('situation')">
          Ce que MTM doit aux propriétaires
        </button>
        <button type="button" [class.is-actif]="onglet() === 'reversements'" (click)="aller('reversements')">
          Reversements
        </button>
      </nav>

      @if (onglet() === 'situation') {
        @if (situation(); as s) {
          <section class="tuiles" aria-label="Totaux">
            <article class="tuile">
              <span>Commission acquise par MTM</span>
              <strong>{{ fcfa(s.totaux.commissionAcquise) }}</strong>
              <small>Au prorata de ce que les clients ont payé</small>
            </article>
            <article class="tuile">
              <span>Total dû aux propriétaires</span>
              <strong>{{ fcfa(s.totaux.du) }}</strong>
              <small>Prix de vente moins commission</small>
            </article>
            <article class="tuile">
              <span>Déjà reversé</span>
              <strong>{{ fcfa(s.totaux.reverse) }}</strong>
            </article>
            <article class="tuile" [class.tuile--attention]="s.totaux.aReverserMaintenant > 0">
              <span>À reverser maintenant</span>
              <strong>{{ fcfa(s.totaux.aReverserMaintenant) }}</strong>
              <small>Exigible selon le contrat, sans avance</small>
            </article>
            <article class="tuile">
              <span>Solde restant dû</span>
              <strong>{{ fcfa(s.totaux.soldeRestant) }}</strong>
              <small>Sur l’ensemble des ventes</small>
            </article>
          </section>

          @if (s.dossiers.length === 0) {
            <section class="page-card">
              <p class="vide">
                Aucune vente de terrain confié. Un terrain est « confié » quand sa fiche a un propriétaire et une
                commission de MTM, et n’est pas un produit détenu en direct.
              </p>
            </section>
          } @else {
            <section class="page-card">
              <h2>Par vente</h2>
              <div class="tableau-defilant">
                <table>
                  <thead>
                    <tr>
                      <th>Propriétaire</th>
                      <th>Dossier</th>
                      <th>Mode de reversement</th>
                      <th class="nombre">Prix</th>
                      <th class="nombre">Commission MTM</th>
                      <th class="nombre">Encaissé</th>
                      <th class="nombre">Dû</th>
                      <th class="nombre">Reversé</th>
                      <th class="nombre">Reste</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of s.dossiers; track d.dossierVenteId) {
                      <tr>
                        <td>{{ d.proprietaire.nom }}</td>
                        <td>
                          {{ d.reference ?? '—' }}
                          <br /><span class="meta">{{ d.terrain?.nom }} · {{ d.client }}</span>
                        </td>
                        <td>{{ mode(d.mode) }}</td>
                        <td class="nombre">{{ fcfa(d.prixVente) }}</td>
                        <td class="nombre">{{ fcfa(d.commission) }}</td>
                        <td class="nombre">{{ fcfa(d.encaisse) }}</td>
                        <td class="nombre">{{ fcfa(d.du) }}</td>
                        <td class="nombre">{{ fcfa(d.reverse) }}</td>
                        <td class="nombre">
                          <strong>{{ fcfa(d.soldeRestant) }}</strong>
                        </td>
                        <td>
                          @if (peutCreer && d.disponibleSansAvance > 0) {
                            <button mat-stroked-button type="button" (click)="demander(d, 'normal')">Reverser</button>
                          }
                          @if (peutCreer && d.disponibleAvecAvance > 0 && d.disponibleSansAvance < d.disponibleAvecAvance) {
                            <button mat-button type="button" (click)="demander(d, 'avance')">Avance</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="aide">
                Une avance, avant que le client ait fini de payer, est interdite par défaut : elle exige un motif précis et
                l’autorisation expresse de la Direction. Le mode de reversement est une clause du mandat.
              </p>
            </section>
          }
        } @else {
          <div class="skeleton" style="height: 220px"></div>
        }
      } @else {
        <section class="filtres">
          @for (f of filtres; track f.code) {
            <button
              mat-stroked-button
              type="button"
              [color]="statut() === f.code ? 'primary' : undefined"
              (click)="filtrer(f.code)"
            >
              {{ f.label }}
            </button>
          }
        </section>
        @if (liste(); as l) {
          @if (l.items.length === 0) {
            <section class="page-card"><p class="vide">Aucun reversement dans cette catégorie.</p></section>
          } @else {
            <ul class="liste">
              @for (r of l.items; track r.id) {
                <li class="element page-card">
                  <div class="element__principal">
                    <strong>
                      {{ r.type === 'avance' ? 'Avance' : 'Reversement' }} à {{ nom(r.proprietaire) }} · {{ r.numero }}
                    </strong>
                    <span class="meta">
                      Dossier {{ r.dossierVente.referenceInterne ?? '—' }}
                      @if (r.dossierVente.terrain) {
                        · {{ r.dossierVente.terrain.nom }}
                      }
                      · demandé le {{ dateFr(r.createdAt) }} par {{ nom(r.createdBy) }}
                    </span>
                    <span class="meta">{{ r.motif }}</span>
                    @if (r.autorisePar) {
                      <span class="meta">
                        Autorisé par {{ nom(r.autorisePar) }}@if (r.motifAutorisation) { : {{ r.motifAutorisation }} }
                      </span>
                    }
                    @if (r.statut === 'paye') {
                      <span class="meta">
                        Payé le {{ dateFr(r.datePaiement) }} par {{ nom(r.payePar) }} · {{ libelleMode(r.modePaiement) }} ·
                        réf. {{ r.reference }}
                      </span>
                    }
                    @if (r.motifRejet) {
                      <span class="meta">Rejeté : {{ r.motifRejet }}</span>
                    }
                    @if (r.justificatifUrl) {
                      <span class="meta"><a [href]="r.justificatifUrl" target="_blank" rel="noopener">Preuve de paiement</a></span>
                    }
                  </div>
                  <div class="element__droite">
                    <span class="montant">{{ fcfa(r.montant) }}</span>
                    <span [class]="'mtm-badge mtm-badge--' + etat(r.statut).ton">{{ etat(r.statut).label }}</span>
                    @if (r.type === 'avance') {
                      <span class="mtm-badge mtm-badge--red">Avance exceptionnelle</span>
                    }
                    <div class="actions">
                      @if (r.statut === 'en_attente' && r.createdById !== moi && peutAutoriserCe(r)) {
                        <button mat-flat-button color="primary" type="button" (click)="autoriser(r)">Autoriser</button>
                      }
                      @if ((r.statut === 'en_attente' || r.statut === 'autorise') && peutValider) {
                        <button mat-stroked-button type="button" (click)="rejeter(r)">Rejeter</button>
                      }
                      @if ((r.statut === 'en_attente' || r.statut === 'autorise') && peutPayer) {
                        <button mat-button type="button" (click)="joindre(r)">
                          {{ r.justificatifUrl ? 'Remplacer la preuve' : 'Joindre la preuve' }}
                        </button>
                      }
                      @if (r.statut === 'autorise' && peutPayer) {
                        <button mat-flat-button color="primary" type="button" (click)="payer(r)" [disabled]="!r.justificatifUrl">
                          Enregistrer le paiement
                        </button>
                      }
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        } @else {
          <div class="skeleton" style="height: 180px"></div>
        }
        <p class="aide">
          Un reversement est demandé par la comptable, autorisé par la Direction (ou un délégué habilité) puis payé avec
          sa preuve. Il sort de la trésorerie sans jamais peser sur le résultat de MTM.
        </p>
      }
    </div>
  `,
})
export class Reversements implements OnInit {
  private readonly api = inject(TresorerieApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutCreer = this.session.hasPermission('finances:creer');
  protected readonly peutValider = this.session.hasPermission('finances:valider');
  protected readonly peutPayer = this.session.hasPermission('finances:payer');
  protected readonly moi = this.session.user()?.id;

  protected readonly onglet = signal<Onglet>('situation');
  protected readonly situation = signal<SituationProprietaires | null>(null);
  protected readonly liste = signal<Page<Reversement> | null>(null);
  protected readonly statut = signal('en_attente');
  protected readonly pouvoir = signal<PouvoirAutorisation | null>(null);

  protected readonly filtres = [
    { code: 'en_attente', label: 'À autoriser' },
    { code: 'autorise', label: 'À payer' },
    { code: 'paye', label: 'Payés' },
    { code: 'rejete', label: 'Rejetés' },
    { code: '', label: 'Tous' },
  ];

  protected fcfa = fcfa;
  protected dateFr = dateFr;
  protected nom = nomPersonne;
  protected libelleMode = libelleMode;
  protected mode = (code: string) => MODES_REVERSEMENT[code] ?? code;
  protected etat = (code: string) => STATUTS[code] ?? { label: code, ton: 'neutral' };

  ngOnInit(): void {
    this.api.monPouvoir().subscribe({ next: (p) => this.pouvoir.set(p) });
    this.chargerSituation();
  }

  protected aller(onglet: Onglet): void {
    this.onglet.set(onglet);
    if (onglet === 'situation') this.chargerSituation();
    else this.chargerListe();
  }

  protected filtrer(statut: string): void {
    this.statut.set(statut);
    this.chargerListe();
  }

  /** Une avance ne s'autorise jamais par délégation : le droit complet est exigé. */
  protected peutAutoriserCe(r: Reversement): boolean {
    return r.type === 'avance' ? Boolean(this.pouvoir()?.complet) : peutAutoriserMontant(this.pouvoir(), r.montant);
  }

  protected demander(d: SituationDossier, type: 'normal' | 'avance'): void {
    const plafond = type === 'avance' ? d.disponibleAvecAvance : d.disponibleSansAvance;
    FormDialog.ouvrir(this.dialog, {
      titre: type === 'avance' ? 'Avance au propriétaire' : 'Demander un reversement',
      description:
        type === 'avance'
          ? `Le client n’a pas fini de payer : une avance est exceptionnelle et exige l’autorisation expresse de la Direction. Plafond : ${fcfa(plafond)}.`
          : `${d.proprietaire.nom} — dossier ${d.reference ?? ''}. Disponible sans avance : ${fcfa(plafond)}.`,
      confirmer: 'Envoyer pour autorisation',
      champs: [
        { cle: 'montant', label: 'Montant (FCFA)', type: 'number', requis: true, min: 1, max: plafond, valeur: plafond },
        {
          cle: 'motif',
          label: 'Motif',
          type: 'textarea',
          requis: true,
          minLength: type === 'avance' ? 10 : 3,
          aide: type === 'avance' ? 'Précisez pourquoi, et qui a donné son accord' : undefined,
        },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.creerReversement({
          dossierVenteId: d.dossierVenteId,
          montant: v['montant'] as number,
          type,
          motif: v['motif'] as string,
        }),
        'Demande envoyée : elle attend l’autorisation',
        'Demande impossible',
        () => this.chargerSituation(),
      );
    });
  }

  protected autoriser(r: Reversement): void {
    FormDialog.ouvrir(this.dialog, {
      titre: r.type === 'avance' ? 'Autoriser expressément cette avance' : 'Autoriser le reversement',
      description: `${fcfa(r.montant)} à ${nomPersonne(r.proprietaire)} — ${r.motif}`,
      confirmer: 'Autoriser',
      champs: [
        {
          cle: 'motif',
          label: 'Motif de l’autorisation',
          type: 'textarea',
          requis: r.type === 'avance',
          aide: r.type === 'avance' ? 'Obligatoire pour une avance' : 'Facultatif',
        },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.autoriserReversement(r.id, v['motif'] as string | undefined),
        'Reversement autorisé',
        'Autorisation impossible',
        () => this.chargerListe(),
      );
    });
  }

  protected rejeter(r: Reversement): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Rejeter le reversement',
      description: `La demande de ${nomPersonne(r.createdBy)} sera close avec votre motif.`,
      confirmLabel: 'Rejeter',
    }).subscribe((motif) => {
      if (!motif) return;
      this.executer(this.api.rejeterReversement(r.id, motif), 'Reversement rejeté', 'Rejet impossible', () =>
        this.chargerListe(),
      );
    });
  }

  protected async joindre(r: Reversement): Promise<void> {
    const { file, erreur } = await selectionnerFichier();
    if (erreur) this.notify.error(erreur);
    if (!file) return;
    this.executer(this.api.joindreReversement(r.id, file), 'Preuve jointe', 'Envoi impossible', () => this.chargerListe());
  }

  protected payer(r: Reversement): void {
    FormDialog.ouvrir(this.dialog, {
      titre: 'Enregistrer le paiement',
      description: `${fcfa(r.montant)} à ${nomPersonne(r.proprietaire)}. La preuve du paiement est déjà jointe.`,
      confirmer: 'Enregistrer comme payé',
      champs: [
        { cle: 'modePaiement', label: 'Moyen de paiement', type: 'select', requis: true, options: MODES_PAIEMENT, valeur: 'virement' },
        { cle: 'reference', label: 'Référence de la transaction', requis: true },
        { cle: 'datePaiement', label: 'Date du paiement', type: 'date', requis: true, valeur: aujourdhuiIso() },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.payerReversement(r.id, {
          modePaiement: v['modePaiement'] as string,
          reference: v['reference'] as string,
          datePaiement: v['datePaiement'] as string,
        }),
        'Paiement enregistré',
        'Enregistrement impossible',
        () => this.chargerListe(),
      );
    });
  }

  private chargerSituation(): void {
    this.api.situations().subscribe({
      next: (s) => this.situation.set(s),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger la situation'),
    });
  }

  private chargerListe(): void {
    this.api.reversements({ statut: this.statut(), pageSize: 50 }).subscribe({
      next: (l) => this.liste.set(l),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les reversements'),
    });
  }

  private executer<T>(obs: Observable<T>, succes: string, echec: string, apres: () => void): void {
    obs.subscribe({
      next: () => {
        this.notify.success(succes);
        apres();
      },
      error: (e: unknown) => this.notify.error(e, echec),
    });
  }
}
