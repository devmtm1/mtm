import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import {
  type ClotureCaisse,
  type JourNonCloture,
  type MouvementFonds,
  type Page,
  type Soldes,
  type TypeMouvement,
  TresorerieApiService,
} from '../../core/services/api/tresorerie-api.service';
import { SessionService } from '../../core/services/session.service';
import { JustificationDialog } from '../../shared/dialogs/justification-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from './finances-utils';
import {
  TYPES_COMPTE,
  TYPES_MOUVEMENT,
  aujourdhuiIso,
  dateFr,
  nomPersonne,
  selectionnerFichier,
} from './finances-outils';
import { FormDialog } from './form-dialog';

type Onglet = 'soldes' | 'mouvements' | 'clotures';

const LIBELLES_DECISION: Record<string, { label: string; ton: string }> = {
  aucune: { label: 'Sans écart', ton: 'success' },
  en_attente: { label: 'Écart à décider', ton: 'warning' },
  acceptee: { label: 'Écart accepté', ton: 'neutral' },
  a_corriger: { label: 'À corriger', ton: 'red' },
};

const STATUTS_MOUVEMENT: Record<string, { label: string; ton: string }> = {
  en_attente: { label: 'À confirmer', ton: 'warning' },
  confirme: { label: 'Confirmé', ton: 'success' },
  rejete: { label: 'Rejeté', ton: 'red' },
};

/**
 * Trésorerie : soldes de la caisse, des banques et des portefeuilles mobiles,
 * remises de fonds sur bordereau, transferts entre comptes, et clôture
 * quotidienne de la caisse (solde théorique, argent compté, écart décidé par la Direction).
 */
@Component({
  selector: 'app-tresorerie',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  styleUrl: './finances-pages.scss',
  template: `
    <div class="page-grille">
      <header class="page-header">
        <div>
          <p class="eyebrow">Finances</p>
          <h1 class="page-header__title">Trésorerie</h1>
          <p class="page-header__subtitle">
            Où est l’argent : la caisse, chaque banque et chaque portefeuille mobile, suivis séparément. Les soldes se
            calculent à partir du solde initial et des mouvements : ils ne se saisissent jamais.
          </p>
        </div>
        <div class="page-header__actions">
          <a mat-stroked-button routerLink="/finances/rapport-quotidien">Rapport du soir</a>
        </div>
      </header>

      <nav class="onglets" aria-label="Sections de la trésorerie">
        <button type="button" [class.is-actif]="onglet() === 'soldes'" (click)="aller('soldes')">Soldes et comptes</button>
        <button type="button" [class.is-actif]="onglet() === 'mouvements'" (click)="aller('mouvements')">
          Remises de fonds et transferts
        </button>
        <button type="button" [class.is-actif]="onglet() === 'clotures'" (click)="aller('clotures')">
          Clôture de caisse
        </button>
      </nav>

      @switch (onglet()) {
        @case ('soldes') {
          @if (soldes(); as s) {
            <section class="tuiles" aria-label="Soldes consolidés">
              <article class="tuile">
                <span>Trésorerie consolidée</span>
                <strong [class.negatif]="s.consolide.solde < 0">{{ fcfa(s.consolide.solde) }}</strong>
                <small>Au {{ dateFr(s.au) }}</small>
              </article>
              <article class="tuile">
                <span>Caisse</span>
                <strong>{{ fcfa(s.consolide.caisse) }}</strong>
              </article>
              <article class="tuile">
                <span>Banques</span>
                <strong>{{ fcfa(s.consolide.banques) }}</strong>
              </article>
              <article class="tuile">
                <span>Wave et Orange Money</span>
                <strong>{{ fcfa(s.consolide.mobile) }}</strong>
              </article>
            </section>

            @if (s.sansCompte.entrees > 0 || s.sansCompte.sorties > 0) {
              <aside class="alerte" role="status">
                <strong>Des mouvements ne sont rattachés à aucun compte</strong>
                {{ fcfa(s.sansCompte.entrees) }} d’entrées et {{ fcfa(s.sansCompte.sorties) }} de sorties ont un mode de
                paiement qu’aucun compte ne sert (ou n’en ont pas). Ajoutez ce mode à un compte pour qu’ils comptent dans
                ses soldes.
              </aside>
            }

            <section class="page-card">
              <div class="barre">
                <h2>Comptes</h2>
                @if (peutAdministrer) {
                  <button mat-flat-button color="primary" type="button" (click)="nouveauCompte()">Nouveau compte</button>
                }
              </div>
              @if (s.comptes.length === 0) {
                <p class="vide">Aucun compte n’est paramétré.</p>
              } @else {
                <div class="tableau-defilant">
                  <table>
                    <thead>
                      <tr>
                        <th>Compte</th>
                        <th>Modes de paiement</th>
                        <th class="nombre">Solde initial</th>
                        <th class="nombre">Entrées</th>
                        <th class="nombre">Sorties</th>
                        <th class="nombre">Solde</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (c of s.comptes; track c.id) {
                        <tr>
                          <td>
                            <strong>{{ c.nom }}</strong>
                            @if (!c.actif) {
                              <span class="mtm-badge mtm-badge--neutral">Inactif</span>
                            }
                          </td>
                          <td>{{ c.modes.join(', ') || '—' }}</td>
                          <td class="nombre">{{ fcfa(c.soldeInitial) }}</td>
                          <td class="nombre">{{ fcfa(c.entrees) }}</td>
                          <td class="nombre">{{ fcfa(c.sorties) }}</td>
                          <td class="nombre" [class.negatif]="c.solde < 0">
                            <strong>{{ fcfa(c.solde) }}</strong>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
              <p class="aide">
                Un mouvement est rattaché au compte qui sert son mode de paiement. Les transferts et les remises de fonds
                déplacent l’argent sans changer le total consolidé.
              </p>
            </section>
          } @else {
            <div class="skeleton" style="height: 220px"></div>
          }
        }

        @case ('mouvements') {
          <section class="barre">
            <div class="filtres">
              @for (f of filtresMouvement; track f.code) {
                <button
                  mat-stroked-button
                  type="button"
                  [color]="statutMouvement() === f.code ? 'primary' : undefined"
                  (click)="filtrerMouvements(f.code)"
                >
                  {{ f.label }}
                </button>
              }
            </div>
            @if (peutCreer) {
              <button mat-flat-button color="primary" type="button" (click)="nouveauMouvement()">Nouveau mouvement</button>
            }
          </section>
          @if (mouvements(); as m) {
            @if (m.items.length === 0) {
              <section class="page-card"><p class="vide">Aucun mouvement dans cette catégorie.</p></section>
            } @else {
              <ul class="liste">
                @for (mv of m.items; track mv.id) {
                  <li class="element page-card">
                    <div class="element__principal">
                      <strong>{{ typeMouvement(mv.type) }} · {{ mv.numero }}</strong>
                      <span class="meta">
                        {{ dateFr(mv.date) }} ·
                        {{ mv.compteSource?.nom ?? mv.remetNom ?? '—' }} → {{ mv.compteDestination?.nom ?? mv.recoitNom ?? '—' }}
                      </span>
                      <span class="meta">{{ mv.motif }}@if (mv.origine) { · origine : {{ mv.origine }} }</span>
                      <span class="meta">
                        Saisi par {{ nom(mv.createdBy) }}
                        @if (mv.confirmePar) {
                          · {{ mv.statut === 'rejete' ? 'rejeté' : 'confirmé' }} par {{ nom(mv.confirmePar) }}
                        }
                        @if (mv.motifRejet) {
                          · motif : {{ mv.motifRejet }}
                        }
                        @if (mv.justificatifUrl) {
                          · <a [href]="mv.justificatifUrl" target="_blank" rel="noopener">Pièce jointe</a>
                        }
                      </span>
                    </div>
                    <div class="element__droite">
                      <span class="montant">{{ fcfa(mv.montant) }}</span>
                      <span [class]="'mtm-badge mtm-badge--' + statutMv(mv.statut).ton">{{ statutMv(mv.statut).label }}</span>
                      <div class="actions">
                        @if (mv.statut === 'en_attente' && peutValider && mv.createdById !== moi) {
                          <button mat-flat-button color="primary" type="button" (click)="confirmer(mv)">Confirmer</button>
                          <button mat-stroked-button type="button" (click)="rejeter(mv)">Rejeter</button>
                        }
                        @if (mv.statut !== 'confirme' && peutModifier) {
                          <button mat-button type="button" (click)="joindre(mv)">
                            {{ mv.justificatifUrl ? 'Remplacer la pièce' : 'Joindre une pièce' }}
                          </button>
                        }
                        @if (mv.statut !== 'confirme' && mv.createdById === moi && peutModifier) {
                          <button mat-button type="button" (click)="supprimer(mv)">Supprimer</button>
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
            Une remise de fonds, une avance ou un transfert n’est pas une dépense : elle ne pèse pas sur le résultat. Elle
            compte dans les soldes une fois confirmée par une autre personne que celle qui l’a saisie.
          </p>
        }

        @case ('clotures') {
          @if (manquantes().length > 0) {
            <aside class="alerte" role="status">
              <strong>
                {{ manquantes().length }} clôture{{ manquantes().length > 1 ? 's' : '' }} de caisse manquante{{
                  manquantes().length > 1 ? 's' : ''
                }}
              </strong>
              La clôture est obligatoire chaque jour d’activité, même sans opération.
              <ul>
                @for (j of manquantes().slice(0, 6); track j.compteId + j.date) {
                  <li>{{ j.compte }} — {{ dateFr(j.date) }}</li>
                }
              </ul>
            </aside>
          }
          <section class="barre">
            <h2>Clôtures de caisse</h2>
            @if (peutCreer) {
              <button mat-flat-button color="primary" type="button" (click)="cloturer()">Clôturer la caisse</button>
            }
          </section>
          @if (clotures(); as c) {
            @if (c.items.length === 0) {
              <section class="page-card"><p class="vide">Aucune clôture de caisse enregistrée.</p></section>
            } @else {
              <ul class="liste">
                @for (cl of c.items; track cl.id) {
                  <li class="element page-card">
                    <div class="element__principal">
                      <strong>{{ cl.compte.nom }} · {{ dateFr(cl.date) }}</strong>
                      <span class="meta">
                        Solde initial {{ fcfa(cl.soldeInitial) }} + entrées {{ fcfa(cl.encaissements) }} − sorties
                        {{ fcfa(cl.decaissements) }} = théorique {{ fcfa(cl.soldeTheorique) }}
                      </span>
                      <span class="meta">
                        Compté : {{ fcfa(cl.montantCompte) }} · clôturé par {{ nom(cl.parUser) }}
                      </span>
                      @if (cl.explication) {
                        <span class="meta">Explication : {{ cl.explication }}</span>
                      }
                      @if (cl.decisionMotif) {
                        <span class="meta">Décision de {{ nom(cl.decisionPar) }} : {{ cl.decisionMotif }}</span>
                      }
                      @if (cl.justificatifUrl) {
                        <span class="meta"><a [href]="cl.justificatifUrl" target="_blank" rel="noopener">Pièce jointe</a></span>
                      }
                    </div>
                    <div class="element__droite">
                      <span class="montant" [class.negatif]="cl.ecart < 0">
                        {{ cl.ecart === 0 ? 'Aucun écart' : 'Écart ' + fcfa(cl.ecart) }}
                      </span>
                      <span [class]="'mtm-badge mtm-badge--' + decision(cl.decision).ton">{{ decision(cl.decision).label }}</span>
                      <div class="actions">
                        @if (cl.decision === 'en_attente' && peutAutoriser) {
                          <button mat-flat-button color="primary" type="button" (click)="deciderEcart(cl)">Décider</button>
                        }
                        @if (cl.ecart !== 0 && cl.decision !== 'acceptee' && peutCreer) {
                          <button mat-button type="button" (click)="joindreCloture(cl)">Joindre une pièce</button>
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
            Aucun écart n’est régularisé en silence : il est expliqué, documenté, puis accepté ou renvoyé à la comptable par
            la Direction. La décision est consignée dans le journal d’audit.
          </p>
        }
      }
    </div>
  `,
})
export class Tresorerie implements OnInit {
  private readonly api = inject(TresorerieApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutCreer = this.session.hasPermission('finances:creer');
  protected readonly peutModifier = this.session.hasPermission('finances:modifier');
  protected readonly peutValider = this.session.hasPermission('finances:valider');
  protected readonly peutAdministrer = this.session.hasPermission('finances:administrer');
  protected readonly peutAutoriser = this.session.hasPermission('finances:autoriser');
  protected readonly moi = this.session.user()?.id;

  protected readonly onglet = signal<Onglet>('soldes');
  protected readonly soldes = signal<Soldes | null>(null);
  protected readonly mouvements = signal<Page<MouvementFonds> | null>(null);
  protected readonly clotures = signal<Page<ClotureCaisse> | null>(null);
  protected readonly manquantes = signal<JourNonCloture[]>([]);
  protected readonly statutMouvement = signal('en_attente');

  protected readonly filtresMouvement = [
    { code: 'en_attente', label: 'À confirmer' },
    { code: 'confirme', label: 'Confirmés' },
    { code: 'rejete', label: 'Rejetés' },
    { code: '', label: 'Tous' },
  ];

  protected readonly comptesActifs = computed(() => (this.soldes()?.comptes ?? []).filter((c) => c.actif));

  protected fcfa = fcfa;
  protected dateFr = dateFr;
  protected nom = nomPersonne;
  protected typeMouvement = (code: string) => TYPES_MOUVEMENT[code] ?? code;
  protected statutMv = (code: string) => STATUTS_MOUVEMENT[code] ?? { label: code, ton: 'neutral' };
  protected decision = (code: string) => LIBELLES_DECISION[code] ?? { label: code, ton: 'neutral' };

  ngOnInit(): void {
    this.chargerSoldes();
  }

  protected aller(onglet: Onglet): void {
    this.onglet.set(onglet);
    if (onglet === 'soldes') this.chargerSoldes();
    if (onglet === 'mouvements') this.chargerMouvements();
    if (onglet === 'clotures') this.chargerClotures();
  }

  protected filtrerMouvements(statut: string): void {
    this.statutMouvement.set(statut);
    this.chargerMouvements();
  }

  // --- comptes ---

  protected nouveauCompte(): void {
    FormDialog.ouvrir(this.dialog, {
      titre: 'Nouveau compte de trésorerie',
      description:
        'Une caisse, un compte bancaire ou un portefeuille mobile. Les mouvements se rattachent au compte dont le mode de paiement est servi.',
      confirmer: 'Créer le compte',
      champs: [
        { cle: 'code', label: 'Code', requis: true, minLength: 2, aide: 'Ex. CAISSE2, BANQUE_CBAO' },
        { cle: 'nom', label: 'Nom', requis: true, minLength: 2 },
        { cle: 'type', label: 'Type', type: 'select', requis: true, valeur: 'caisse', options: TYPES_COMPTE },
        {
          cle: 'modes',
          label: 'Modes de paiement servis',
          requis: true,
          aide: 'Séparés par des virgules : especes, wave, orange_money, virement…',
          valeur: 'especes',
        },
        { cle: 'soldeInitial', label: 'Solde initial (FCFA)', type: 'number', min: 0, valeur: 0 },
        { cle: 'dateSoldeInitial', label: 'Date du solde initial', type: 'date', valeur: aujourdhuiIso() },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.creerCompte({
          code: String(v['code']),
          nom: String(v['nom']),
          type: v['type'] as never,
          modes: String(v['modes'])
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean),
          soldeInitial: v['soldeInitial'] as number | undefined,
          dateSoldeInitial: v['dateSoldeInitial'] as string | undefined,
        }),
        'Compte créé',
        'Création impossible',
        () => this.chargerSoldes(),
      );
    });
  }

  // --- mouvements de fonds ---

  protected nouveauMouvement(): void {
    const comptes = this.comptesActifs().map((c) => ({ valeur: c.id, label: c.nom }));
    FormDialog.ouvrir(this.dialog, {
      titre: 'Nouveau mouvement de fonds',
      description:
        'Remise de fonds (bordereau), avance, remboursement ou transfert entre comptes. Une autre personne le confirme avant qu’il ne compte.',
      confirmer: 'Envoyer à la confirmation',
      champs: [
        {
          cle: 'type',
          label: 'Nature',
          type: 'select',
          requis: true,
          valeur: 'transfert',
          options: Object.entries(TYPES_MOUVEMENT).map(([valeur, label]) => ({ valeur, label })),
        },
        { cle: 'compteSourceId', label: 'Compte de départ', type: 'select', options: comptes },
        { cle: 'compteDestinationId', label: 'Compte d’arrivée', type: 'select', options: comptes },
        { cle: 'montant', label: 'Montant (FCFA)', type: 'number', requis: true, min: 1 },
        { cle: 'date', label: 'Date', type: 'date', requis: true, valeur: aujourdhuiIso(), max: undefined },
        { cle: 'motif', label: 'Motif', requis: true, minLength: 3 },
        { cle: 'origine', label: 'Origine des fonds', aide: 'Recettes du jour, retrait bancaire…' },
        { cle: 'remetNom', label: 'Remis par', aide: 'Obligatoire pour une remise de fonds' },
        { cle: 'recoitNom', label: 'Reçu par', aide: 'Obligatoire pour une remise de fonds' },
        { cle: 'reference', label: 'Référence' },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.creerMouvement({
          type: v['type'] as TypeMouvement,
          compteSourceId: v['compteSourceId'] as string | undefined,
          compteDestinationId: v['compteDestinationId'] as string | undefined,
          montant: v['montant'] as number,
          date: v['date'] as string,
          motif: v['motif'] as string,
          origine: v['origine'] as string | undefined,
          remetNom: v['remetNom'] as string | undefined,
          recoitNom: v['recoitNom'] as string | undefined,
          reference: v['reference'] as string | undefined,
        }),
        'Mouvement enregistré : il attend sa confirmation',
        'Enregistrement impossible',
        () => this.chargerMouvements(),
      );
    });
  }

  protected confirmer(mouvement: MouvementFonds): void {
    this.executer(
      this.api.confirmerMouvement(mouvement.id),
      'Mouvement confirmé : il compte dans les soldes',
      'Confirmation impossible',
      () => this.chargerMouvements(),
    );
  }

  protected rejeter(mouvement: MouvementFonds): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Rejeter le mouvement',
      description: `« ${mouvement.motif} » repart chez ${mouvement.createdBy.firstName} avec votre motif.`,
      confirmLabel: 'Rejeter',
    }).subscribe((motif) => {
      if (!motif) return;
      this.executer(this.api.rejeterMouvement(mouvement.id, motif), 'Mouvement rejeté', 'Rejet impossible', () =>
        this.chargerMouvements(),
      );
    });
  }

  protected async joindre(mouvement: MouvementFonds): Promise<void> {
    const { file, erreur } = await selectionnerFichier();
    if (erreur) this.notify.error(erreur);
    if (!file) return;
    this.executer(this.api.joindreMouvement(mouvement.id, file), 'Pièce jointe', 'Envoi impossible', () =>
      this.chargerMouvements(),
    );
  }

  protected supprimer(mouvement: MouvementFonds): void {
    this.executer(this.api.supprimerMouvement(mouvement.id), 'Mouvement supprimé', 'Suppression impossible', () =>
      this.chargerMouvements(),
    );
  }

  // --- clôture de caisse ---

  protected cloturer(): void {
    const caisses = this.comptesActifs().map((c) => ({ valeur: c.id, label: c.nom }));
    FormDialog.ouvrir(this.dialog, {
      titre: 'Clôturer la caisse',
      description:
        'Comptez l’argent, saisissez le montant : l’écart avec le solde théorique est calculé. S’il y en a un, expliquez-le : la Direction décidera.',
      confirmer: 'Clôturer',
      champs: [
        { cle: 'compteId', label: 'Caisse', type: 'select', requis: true, options: caisses },
        { cle: 'date', label: 'Jour clôturé', type: 'date', requis: true, valeur: aujourdhuiIso() },
        { cle: 'montantCompte', label: 'Montant réellement compté (FCFA)', type: 'number', requis: true, min: 0 },
        { cle: 'explication', label: 'Explication de l’écart', type: 'textarea', aide: 'Obligatoire dès qu’il y a un écart' },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.cloturerCaisse({
          compteId: v['compteId'] as string,
          date: v['date'] as string,
          montantCompte: v['montantCompte'] as number,
          explication: v['explication'] as string | undefined,
        }),
        'Caisse clôturée',
        'Clôture impossible',
        () => this.chargerClotures(),
      );
    });
  }

  protected deciderEcart(cloture: ClotureCaisse): void {
    FormDialog.ouvrir(this.dialog, {
      titre: `Écart de ${fcfa(cloture.ecart)} — ${cloture.compte.nom}`,
      description: `Explication de ${nomPersonne(cloture.parUser)} : ${cloture.explication ?? '—'}`,
      confirmer: 'Enregistrer la décision',
      champs: [
        {
          cle: 'decision',
          label: 'Décision',
          type: 'select',
          requis: true,
          valeur: 'acceptee',
          options: [
            { valeur: 'acceptee', label: 'Accepter l’écart' },
            { valeur: 'a_corriger', label: 'Renvoyer à la comptable pour correction' },
          ],
        },
        { cle: 'motif', label: 'Motif de la décision', type: 'textarea', requis: true, minLength: 3 },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.deciderEcart(cloture.id, v['decision'] as 'acceptee' | 'a_corriger', v['motif'] as string),
        'Décision enregistrée',
        'Décision impossible',
        () => this.chargerClotures(),
      );
    });
  }

  protected async joindreCloture(cloture: ClotureCaisse): Promise<void> {
    const { file, erreur } = await selectionnerFichier();
    if (erreur) this.notify.error(erreur);
    if (!file) return;
    this.executer(this.api.joindreCloture(cloture.id, file), 'Pièce jointe', 'Envoi impossible', () =>
      this.chargerClotures(),
    );
  }

  // --- chargements ---

  private chargerSoldes(): void {
    this.api.soldes().subscribe({
      next: (s) => this.soldes.set(s),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les soldes'),
    });
  }

  private chargerMouvements(): void {
    if (!this.soldes()) this.chargerSoldes();
    this.api.mouvements({ statut: this.statutMouvement(), pageSize: 50 }).subscribe({
      next: (m) => this.mouvements.set(m),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les mouvements'),
    });
  }

  private chargerClotures(): void {
    if (!this.soldes()) this.chargerSoldes();
    this.api.cloturesCaisse({ pageSize: 50 }).subscribe({
      next: (c) => this.clotures.set(c),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les clôtures'),
    });
    this.api.joursNonClotures().subscribe({ next: (j) => this.manquantes.set(j) });
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
