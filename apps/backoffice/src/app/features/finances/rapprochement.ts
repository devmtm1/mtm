import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import {
  type CompteSolde,
  type EtatRapprochement,
  type LigneReleve,
  TresorerieApiService,
} from '../../core/services/api/tresorerie-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { fcfa } from './finances-utils';
import { dateFr, nomPersonne, selectionnerFichier } from './finances-outils';
import { FormDialog } from './form-dialog';

const STATUTS: Record<string, { label: string; ton: string }> = {
  non_rapproche: { label: 'À rapprocher', ton: 'warning' },
  rapproche: { label: 'Rapprochée', ton: 'success' },
  ignore: { label: 'Ignorée', ton: 'neutral' },
};

function ilYaJours(n: number): string {
  const d = new Date(Date.now() - n * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Rapprochement bancaire : le relevé de la banque (ou l'historique Wave et
 * Orange Money) est importé en CSV, puis chaque ligne est mise en face du
 * mouvement du logiciel qu'elle confirme. Une transaction ne se tient pas
 * pour confirmée sur la seule foi d'une capture d'écran : ce qui n'est pas
 * rapproché reste signalé à la Direction.
 */
@Component({
  selector: 'app-rapprochement-bancaire',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  styleUrl: './finances-pages.scss',
  template: `
    <div class="page-grille">
      <header class="page-header">
        <div>
          <p class="eyebrow">Finances</p>
          <h1 class="page-header__title">Rapprochement bancaire</h1>
          <p class="page-header__subtitle">
            Comparez le relevé de la banque, de Wave ou d’Orange Money aux mouvements du logiciel. Un virement ou un paiement
            mobile n’est confirmé que lorsqu’il apparaît sur le relevé : une capture d’écran ne suffit pas.
          </p>
        </div>
      </header>

      <section class="page-card filtres" aria-label="Compte et période">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" style="min-width: 260px">
          <mat-label>Compte</mat-label>
          <mat-select [ngModel]="compteId()" (ngModelChange)="choisirCompte($event)">
            @for (c of comptes(); track c.id) {
              <mat-option [value]="c.id">{{ c.nom }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Du</mat-label>
          <input matInput type="date" [ngModel]="du()" (ngModelChange)="du.set($event); charger()" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Au</mat-label>
          <input matInput type="date" [ngModel]="au()" (ngModelChange)="au.set($event); charger()" />
        </mat-form-field>
        <span style="flex: 1"></span>
        @if (peutCreer) {
          <button mat-stroked-button type="button" (click)="importer()" [disabled]="!compteId()">Importer un relevé (CSV)</button>
        }
        @if (peutValider) {
          <button mat-flat-button color="primary" type="button" (click)="automatique()" [disabled]="!compteId()">
            Rapprocher automatiquement
          </button>
        }
      </section>

      @if (comptes().length === 0) {
        <section class="page-card">
          <p class="vide">
            Aucun compte bancaire ou portefeuille mobile n’est paramétré : créez-en un dans la page Trésorerie.
          </p>
        </section>
      }

      @if (etat(); as e) {
        <section class="tuiles" aria-label="Résumé">
          <article class="tuile" [class.tuile--attention]="e.resume.nonRapprochees > 0">
            <span>Lignes du relevé à rapprocher</span>
            <strong>{{ e.resume.nonRapprochees }}</strong>
            <small>{{ fcfa(e.resume.montantNonRapproche) }} net</small>
          </article>
          <article class="tuile">
            <span>Lignes rapprochées</span>
            <strong>{{ e.resume.rapprochees }}</strong>
            <small>sur {{ e.resume.lignes }} importées ({{ e.resume.ignorees }} ignorées)</small>
          </article>
          <article class="tuile" [class.tuile--attention]="e.resume.mouvementsNonRapproches > 0">
            <span>Mouvements du logiciel sans ligne de relevé</span>
            <strong>{{ e.resume.mouvementsNonRapproches }}</strong>
            <small>{{ fcfa(e.resume.montantMouvementsNonRapproches) }} net — non confirmés par la banque</small>
          </article>
        </section>

        <div class="deux-colonnes">
          <section class="page-card">
            <h2>Relevé de {{ e.compte.nom }}</h2>
            @if (e.lignes.length === 0) {
              <p class="vide">Aucune ligne de relevé sur cette période : importez un fichier CSV.</p>
            } @else {
              <ul class="liste">
                @for (l of e.lignes; track l.id) {
                  <li class="element">
                    <div class="element__principal">
                      <strong>{{ l.libelle }}</strong>
                      <span class="meta">{{ dateFr(l.date) }}@if (l.reference) { · réf. {{ l.reference }} }</span>
                      @if (l.statut === 'rapproche') {
                        <span class="meta">
                          ↔ {{ l.mouvementLibelle }} — par {{ nom(l.rapprochePar) }}
                        </span>
                      }
                      @if (l.motifIgnore) {
                        <span class="meta">Ignorée : {{ l.motifIgnore }}</span>
                      }
                      @if (l.statut === 'non_rapproche') {
                        <div class="actions">
                          @for (s of l.suggestions; track s.id) {
                            <button mat-stroked-button type="button" (click)="rapprocher(l, s.id)" [disabled]="!peutValider">
                              {{ s.referenceCommune ? '★ ' : '' }}Rapprocher avec {{ s.numero }}
                            </button>
                          }
                          @if (peutValider) {
                            <button mat-button type="button" (click)="choisirMouvement(l)">Autre mouvement…</button>
                            <button mat-button type="button" (click)="ignorer(l)">Ignorer</button>
                          }
                        </div>
                      }
                    </div>
                    <div class="element__droite">
                      <span class="montant" [class.negatif]="l.montant < 0">{{ fcfa(l.montant) }}</span>
                      <span [class]="'mtm-badge mtm-badge--' + statut(l.statut).ton">{{ statut(l.statut).label }}</span>
                      @if (l.statut !== 'non_rapproche' && peutValider) {
                        <button mat-button type="button" (click)="annuler(l)">Annuler</button>
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="page-card">
            <h2>Mouvements du logiciel non confirmés par le relevé</h2>
            @if (e.mouvementsNonRapproches.length === 0) {
              <p class="vide">Tout ce que le logiciel enregistre sur ce compte figure sur un relevé.</p>
            } @else {
              <ul class="liste">
                @for (m of e.mouvementsNonRapproches; track m.id) {
                  <li class="element">
                    <div class="element__principal">
                      <strong>{{ m.libelle }}</strong>
                      <span class="meta">
                        {{ dateFr(m.date) }} · {{ m.numero }}@if (m.tiers) { · {{ m.tiers }} }@if (m.reference) { · réf. {{ m.reference }} }
                      </span>
                    </div>
                    <span class="montant" [class.negatif]="m.montant < 0">{{ fcfa(m.montant) }}</span>
                  </li>
                }
              </ul>
            }
            <p class="aide">
              Un mouvement qui n’apparaît pas sur le relevé après quelques jours est à vérifier : paiement non reçu, erreur
              de saisie ou mauvais compte.
            </p>
          </section>
        </div>

        <p class="aide">
          Format du fichier : une ligne d’en-tête avec une colonne « date », un « libellé », une « référence » facultative et
          soit un « montant » (négatif pour une sortie), soit un « débit » et un « crédit ». Séparateur « ; » ou « , ». Réimporter
          le même relevé ne crée aucun doublon. Le rapprochement automatique ne retient que ce qui est sans ambiguïté
          (même montant, date proche, un seul candidat ou une référence identique).
        </p>
      } @else if (compteId()) {
        <div class="skeleton" style="height: 200px"></div>
      }
    </div>
  `,
})
export class RapprochementBancaire implements OnInit {
  private readonly api = inject(TresorerieApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutCreer = this.session.hasPermission('finances:creer');
  protected readonly peutValider = this.session.hasPermission('finances:valider');

  protected readonly comptes = signal<CompteSolde[]>([]);
  protected readonly compteId = signal('');
  protected readonly du = signal(ilYaJours(60));
  protected readonly au = signal(ilYaJours(0));
  protected readonly etat = signal<EtatRapprochement | null>(null);

  protected readonly mouvementsLibres = computed(() => this.etat()?.mouvementsNonRapproches ?? []);

  protected fcfa = fcfa;
  protected dateFr = dateFr;
  protected nom = nomPersonne;
  protected statut = (code: string) => STATUTS[code] ?? { label: code, ton: 'neutral' };

  ngOnInit(): void {
    this.api.soldes().subscribe({
      next: (s) => {
        const hors = s.comptes.filter((c) => c.actif && c.type !== 'caisse');
        this.comptes.set(hors);
        if (hors[0]) this.choisirCompte(hors[0].id);
      },
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger les comptes'),
    });
  }

  protected choisirCompte(id: string): void {
    this.compteId.set(id);
    this.charger();
  }

  protected charger(): void {
    if (!this.compteId()) return;
    this.etat.set(null);
    this.api.etatRapprochement(this.compteId(), this.du(), this.au()).subscribe({
      next: (e) => this.etat.set(e),
      error: (e: unknown) => this.notify.error(e, 'Impossible de charger le rapprochement'),
    });
  }

  protected async importer(): Promise<void> {
    const { file, erreur } = await selectionnerFichier(['.csv', '.txt', 'text/csv', 'text/plain']);
    if (erreur) this.notify.error(erreur);
    if (!file) return;
    this.api.importerReleve(this.compteId(), file).subscribe({
      next: (r) => {
        const erreurs = r.erreurs.length > 0 ? ` ${r.erreurs.length} ligne(s) illisible(s) : ${r.erreurs.slice(0, 3).map((x) => `ligne ${x.ligne} (${x.message})`).join(', ')}.` : '';
        this.notify.success(`${r.importees} ligne(s) importée(s), ${r.dejaImportees} déjà connue(s).${erreurs}`);
        this.charger();
      },
      error: (e: unknown) => this.notify.error(e, 'Import impossible'),
    });
  }

  protected automatique(): void {
    this.api.rapprocherAutomatiquement(this.compteId(), this.du(), this.au()).subscribe({
      next: (r) => {
        this.notify.success(`${r.rapprochees} ligne(s) rapprochée(s) ; ${r.restantes} à traiter à la main`);
        this.charger();
      },
      error: (e: unknown) => this.notify.error(e, 'Rapprochement impossible'),
    });
  }

  protected rapprocher(ligne: LigneReleve, mouvementId: string): void {
    this.agir(this.api.rapprocherLigne(ligne.id, mouvementId), 'Ligne rapprochée');
  }

  protected choisirMouvement(ligne: LigneReleve): void {
    const memeSens = this.mouvementsLibres().filter((m) => Math.sign(m.montant) === Math.sign(ligne.montant));
    if (memeSens.length === 0) {
      this.notify.error('Aucun mouvement du logiciel de même sens n’attend de rapprochement');
      return;
    }
    FormDialog.ouvrir(this.dialog, {
      titre: 'Rapprocher avec un autre mouvement',
      description: `${ligne.libelle} — ${fcfa(ligne.montant)}. Le montant doit être identique : sinon, corrigez d’abord le mouvement ou la saisie.`,
      confirmer: 'Rapprocher',
      champs: [
        {
          cle: 'mouvementId',
          label: 'Mouvement du logiciel',
          type: 'select',
          requis: true,
          options: memeSens.map((m) => ({
            valeur: m.id,
            label: `${dateFr(m.date)} — ${m.libelle} — ${fcfa(m.montant)}`,
          })),
        },
      ],
    }).subscribe((v) => {
      if (v) this.rapprocher(ligne, v['mouvementId'] as string);
    });
  }

  protected ignorer(ligne: LigneReleve): void {
    FormDialog.ouvrir(this.dialog, {
      titre: 'Ignorer cette ligne',
      description: `${ligne.libelle} — ${fcfa(ligne.montant)}. Elle n’a pas de mouvement correspondant (frais bancaires, intérêts…). Elle reste consultable avec son motif.`,
      confirmer: 'Ignorer',
      champs: [{ cle: 'motif', label: 'Motif', type: 'textarea', requis: true, minLength: 3 }],
    }).subscribe((v) => {
      if (v) this.agir(this.api.ignorerLigne(ligne.id, v['motif'] as string), 'Ligne ignorée');
    });
  }

  protected annuler(ligne: LigneReleve): void {
    this.agir(this.api.annulerLigne(ligne.id), 'Rapprochement annulé');
  }

  private agir<T>(obs: Observable<T>, succes: string): void {
    obs.subscribe({
      next: () => {
        this.notify.success(succes);
        this.charger();
      },
      error: (e: unknown) => this.notify.error(e, 'Action impossible'),
    });
  }
}
