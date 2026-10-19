import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import {
  type Page,
  type PouvoirAutorisation,
  type RegleDesistement,
  type Remboursement,
  TresorerieApiService,
  peutAutoriserMontant,
} from '../../core/services/api/tresorerie-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from './finances-utils';
import { MODES_PAIEMENT, aujourdhuiIso, dateFr, libelleMode, nomPersonne, selectionnerFichier } from './finances-outils';
import { FormDialog } from './form-dialog';

const STATUTS: Record<string, { label: string; ton: string }> = {
  demandee: { label: 'À décider', ton: 'warning' },
  acceptee: { label: 'Accepté : à payer', ton: 'primary' },
  refusee: { label: 'Refusé', ton: 'red' },
  payee: { label: 'Remboursé', ton: 'success' },
};

/**
 * Désistement d'un client : le protocole retient une part de l'avance et
 * rembourse le reste dans un délai. La règle se fige dans chaque demande ;
 * tant que la clause n'est pas validée juridiquement, la Direction ne peut
 * pas accepter un remboursement.
 */
@Component({
  selector: 'app-remboursements',
  standalone: true,
  imports: [MatButtonModule],
  styleUrl: './finances-pages.scss',
  template: `
    <div class="page-grille">
      <header class="page-header">
        <div>
          <p class="eyebrow">Finances</p>
          <h1 class="page-header__title">Désistements et remboursements</h1>
          <p class="page-header__subtitle">
            La demande est enregistrée avec sa date de réception, le montant réellement encaissé est vérifié, la Direction
            décide, puis le remboursement est payé avec sa preuve. L’historique complet est conservé.
          </p>
        </div>
        @if (peutCreer) {
          <button mat-flat-button color="primary" type="button" (click)="nouvelle()">Nouvelle demande</button>
        }
      </header>

      @if (regles(); as r) {
        <aside class="alerte" [class.page-card]="r.validee" role="status">
          <strong>Règle appliquée : {{ r.retenuePct }} % de l’avance retenus, remboursement sous {{ r.delaiMois }} mois</strong>
          @if (r.validee) {
            Clause validée juridiquement@if (r.version) { (protocole {{ r.version }}) }.
          } @else {
            Cette clause n’est pas encore validée juridiquement : les demandes peuvent être instruites, mais la Direction ne
            peut pas les accepter. Une fois la clause validée, passez « validee » à vrai dans le réglage
            <em>finances.desistement</em> (page Paramètres).
          }
        </aside>
      }

      <section class="filtres">
        @for (f of filtres; track f.code) {
          <button mat-stroked-button type="button" [color]="statut() === f.code ? 'primary' : undefined" (click)="filtrer(f.code)">
            {{ f.label }}
          </button>
        }
      </section>

      @if (liste(); as l) {
        @if (l.items.length === 0) {
          <section class="page-card"><p class="vide">Aucune demande dans cette catégorie.</p></section>
        } @else {
          <ul class="liste">
            @for (d of l.items; track d.id) {
              <li class="element page-card">
                <div class="element__principal">
                  <strong>
                    Dossier {{ d.dossierVente.referenceInterne ?? '—' }} · {{ client(d) }} · {{ d.numero }}
                  </strong>
                  <span class="meta">
                    Demande reçue le {{ dateFr(d.dateDemande) }} · saisie par {{ nom(d.createdBy) }}
                    @if (d.dossierVente.terrain) {
                      · {{ d.dossierVente.terrain.nom }}
                    }
                  </span>
                  <span class="meta">
                    Versé {{ fcfa(d.montantVerse) }} − retenue {{ d.retenuePct }} % ({{ fcfa(d.montantRetenu) }}) =
                    <strong>{{ fcfa(d.montantRembourse) }} à rembourser</strong> avant le {{ dateFr(d.dateLimite) }}
                    ({{ d.delaiMois }} mois)
                  </span>
                  @if (d.motif) {
                    <span class="meta">Motif du client : {{ d.motif }}</span>
                  }
                  @if (d.decisionMotif) {
                    <span class="meta">Décision de {{ nom(d.decisionPar) }} : {{ d.decisionMotif }}</span>
                  }
                  @if (d.statut === 'payee') {
                    <span class="meta">
                      Payé le {{ dateFr(d.datePaiement) }} · {{ libelleMode(d.modePaiement) }} · réf. {{ d.reference }}
                    </span>
                  }
                  @if (d.justificatifUrl) {
                    <span class="meta"><a [href]="d.justificatifUrl" target="_blank" rel="noopener">Preuve de paiement</a></span>
                  }
                </div>
                <div class="element__droite">
                  <span class="montant">{{ fcfa(d.montantRembourse) }}</span>
                  <span [class]="'mtm-badge mtm-badge--' + etat(d.statut).ton">{{ etat(d.statut).label }}</span>
                  @if (d.enRetard) {
                    <span class="mtm-badge mtm-badge--red">Délai dépassé</span>
                  }
                  @if (!d.regleValidee && d.statut === 'demandee') {
                    <span class="mtm-badge mtm-badge--warning">Clause non validée</span>
                  }
                  <div class="actions">
                    @if (d.statut === 'demandee' && peutDecider(d)) {
                      <button mat-flat-button color="primary" type="button" (click)="decider(d)">Décider</button>
                    }
                    @if (d.statut === 'acceptee' && peutPayer) {
                      <button mat-button type="button" (click)="joindre(d)">
                        {{ d.justificatifUrl ? 'Remplacer la preuve' : 'Joindre la preuve' }}
                      </button>
                      <button mat-flat-button color="primary" type="button" (click)="payer(d)" [disabled]="!d.justificatifUrl">
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
    </div>
  `,
})
export class Remboursements implements OnInit {
  private readonly api = inject(TresorerieApiService);
  private readonly ventes = inject(VentesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutCreer = this.session.hasPermission('finances:creer');
  protected readonly peutPayer = this.session.hasPermission('finances:payer');

  protected readonly liste = signal<Page<Remboursement> | null>(null);
  protected readonly regles = signal<RegleDesistement | null>(null);
  protected readonly pouvoir = signal<PouvoirAutorisation | null>(null);
  protected readonly statut = signal('demandee');

  protected readonly filtres = [
    { code: 'demandee', label: 'À décider' },
    { code: 'acceptee', label: 'À payer' },
    { code: 'payee', label: 'Remboursés' },
    { code: 'refusee', label: 'Refusés' },
    { code: '', label: 'Toutes' },
  ];

  protected fcfa = fcfa;
  protected dateFr = dateFr;
  protected nom = nomPersonne;
  protected libelleMode = libelleMode;
  protected etat = (code: string) => STATUTS[code] ?? { label: code, ton: 'neutral' };

  ngOnInit(): void {
    this.api.monPouvoir().subscribe({ next: (p) => this.pouvoir.set(p) });
    this.api.reglesDesistement().subscribe({ next: (r) => this.regles.set(r) });
    this.charger();
  }

  protected filtrer(statut: string): void {
    this.statut.set(statut);
    this.charger();
  }

  protected client(d: Remboursement): string {
    const p = d.dossierVente.prospect;
    return [p?.prenom, p?.nom].filter(Boolean).join(' ') || '—';
  }

  protected peutDecider(d: Remboursement): boolean {
    return peutAutoriserMontant(this.pouvoir(), d.montantRembourse);
  }

  protected nouvelle(): void {
    this.ventes.findAll().subscribe({
      next: (dossiers) => {
        const eligibles = dossiers.filter((d) => d.montantPaye > 0 && d.statut !== 'annule');
        if (eligibles.length === 0) {
          this.notify.error('Aucun dossier de vente avec un paiement validé.');
          return;
        }
        FormDialog.ouvrir(this.dialog, {
          titre: 'Nouvelle demande de désistement',
          description:
            'Le montant versé est repris des paiements validés du dossier. La retenue porte sur l’avance (acompte de la réservation, sauf indication contraire).',
          confirmer: 'Enregistrer la demande',
          champs: [
            {
              cle: 'dossierVenteId',
              label: 'Dossier de vente',
              type: 'select',
              requis: true,
              options: eligibles.map((d) => ({
                valeur: d.id,
                label: `${d.referenceInterne ?? 'Dossier'} — ${[d.prospect.prenom, d.prospect.nom].filter(Boolean).join(' ')} — payé ${fcfa(d.montantPaye)}`,
              })),
            },
            { cle: 'dateDemande', label: 'Date de réception de la demande', type: 'date', requis: true, valeur: aujourdhuiIso() },
            { cle: 'avance', label: 'Avance versée (FCFA)', type: 'number', min: 0, aide: 'Laisser vide pour l’acompte de la réservation' },
            { cle: 'versionProtocole', label: 'Version du protocole signé', aide: 'Conservée avec la demande' },
            { cle: 'motif', label: 'Motif du désistement', type: 'textarea' },
          ],
        }).subscribe((v) => {
          if (!v) return;
          this.executer(
            this.api.creerRemboursement({
              dossierVenteId: v['dossierVenteId'] as string,
              dateDemande: v['dateDemande'] as string,
              avance: v['avance'] as number | undefined,
              versionProtocole: v['versionProtocole'] as string | undefined,
              motif: v['motif'] as string | undefined,
            }),
            'Demande enregistrée : elle attend la décision de la Direction',
            'Enregistrement impossible',
          );
        });
      },
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les dossiers'),
    });
  }

  protected decider(d: Remboursement): void {
    FormDialog.ouvrir(this.dialog, {
      titre: `Remboursement de ${fcfa(d.montantRembourse)}`,
      description: `Versé ${fcfa(d.montantVerse)}, retenue ${fcfa(d.montantRetenu)} (${d.retenuePct} %). Dossier ${d.dossierVente.referenceInterne ?? ''}.`,
      confirmer: 'Enregistrer la décision',
      champs: [
        {
          cle: 'decision',
          label: 'Décision',
          type: 'select',
          requis: true,
          valeur: 'acceptee',
          options: [
            { valeur: 'acceptee', label: 'Accepter le remboursement' },
            { valeur: 'refusee', label: 'Refuser' },
          ],
        },
        { cle: 'motif', label: 'Motif de la décision', type: 'textarea', requis: true, minLength: 3 },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.deciderRemboursement(d.id, v['decision'] as 'acceptee' | 'refusee', v['motif'] as string),
        'Décision enregistrée',
        'Décision impossible',
      );
    });
  }

  protected async joindre(d: Remboursement): Promise<void> {
    const { file, erreur } = await selectionnerFichier();
    if (erreur) this.notify.error(erreur);
    if (!file) return;
    this.executer(this.api.joindreRemboursement(d.id, file), 'Preuve jointe', 'Envoi impossible');
  }

  protected payer(d: Remboursement): void {
    FormDialog.ouvrir(this.dialog, {
      titre: 'Enregistrer le remboursement',
      description: `${fcfa(d.montantRembourse)} à ${this.client(d)}.`,
      confirmer: 'Enregistrer comme payé',
      champs: [
        { cle: 'modePaiement', label: 'Moyen de paiement', type: 'select', requis: true, options: MODES_PAIEMENT, valeur: 'virement' },
        { cle: 'reference', label: 'Référence de la transaction', requis: true },
        { cle: 'datePaiement', label: 'Date du paiement', type: 'date', requis: true, valeur: aujourdhuiIso() },
      ],
    }).subscribe((v) => {
      if (!v) return;
      this.executer(
        this.api.payerRemboursement(d.id, {
          modePaiement: v['modePaiement'] as string,
          reference: v['reference'] as string,
          datePaiement: v['datePaiement'] as string,
        }),
        'Remboursement enregistré',
        'Enregistrement impossible',
      );
    });
  }

  private charger(): void {
    this.api.remboursements({ statut: this.statut(), pageSize: 50 }).subscribe({
      next: (l) => this.liste.set(l),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les demandes'),
    });
  }

  private executer<T>(obs: Observable<T>, succes: string, echec = 'Action impossible'): void {
    obs.subscribe({
      next: () => {
        this.notify.success(succes);
        this.charger();
      },
      error: (e: unknown) => this.notify.error(e, echec),
    });
  }
}
