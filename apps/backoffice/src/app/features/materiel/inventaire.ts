import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft } from '@lucide/angular';
import {
  MaterielApiService,
  type InventaireResume,
  type OptionsMateriel,
  type RapportInventaire,
} from '../../core/services/api/materiel-api.service';
import { NotificationService } from '../../shared/services/notification.service';

interface Saisie {
  texte: string;
  ton: 'ok' | 'inconnu';
}

/**
 * Inventaire physique d'un lieu, en trois temps : choisir la pièce, taper le numéro de chaque autocollant (Entrée valide, le
 * champ se vide pour le suivant), puis terminer. Pendant l'inventaire, un objet qu'on n'a pas encore saisi « reste à trouver »
 * (rien d'alarmant) ; il ne devient « manquant » qu'à la fin. Le rapport se met à jour à chaque saisie.
 */
@Component({
  selector: 'app-inventaire-materiel',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideArrowLeft,
  ],
  template: `
    <section class="inventaire-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Services</p>
          <h1 class="page-header__title">Inventaire du matériel</h1>
          <p class="page-header__subtitle">
            Parcourez une pièce et tapez le numéro de chaque autocollant que vous voyez.
            L’application repère ce qui n’est pas à sa place, ce qui reste à trouver et les numéros
            qu’aucune fiche ne connaît.
          </p>
        </div>
        <div class="page-header__actions">
          <a mat-stroked-button routerLink="/materiel"
            ><svg class="btn-icon" lucideArrowLeft aria-hidden="true"></svg>Retour au parc</a
          >
        </div>
      </header>

      @if (!rapport()) {
        <section class="page-section carte" aria-label="Commencer">
          <h2>1. Choisissez le lieu à parcourir</h2>
          <form class="debut" [formGroup]="formLieu" (ngSubmit)="commencer()">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Lieu</mat-label>
              <mat-select formControlName="lieu">
                @for (lieu of options()?.lieux ?? []; track lieu) {
                  <mat-option [value]="lieu">{{ lieu }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="!formLieu.controls.lieu.value || envoi()"
            >
              Commencer l’inventaire
            </button>
          </form>
          <p class="aide">
            Un lieu qui a déjà un inventaire en cours se reprend dans la liste ci-dessous.
          </p>
        </section>

        <section class="page-section carte" aria-label="Inventaires">
          <h2>Inventaires</h2>
          @if (!inventaires().length) {
            <p class="vide">Aucun inventaire pour le moment.</p>
          } @else {
            <ul class="liste">
              @for (i of inventaires(); track i.id) {
                <li>
                  <span class="liste__titre">
                    <strong>{{ i.lieu }}</strong>
                    <small>
                      {{ i.commenceLe | date: 'dd/MM/yyyy HH:mm' }} · {{ i.numerosSaisis }} numéro{{
                        i.numerosSaisis > 1 ? 's' : ''
                      }}
                      saisi{{ i.numerosSaisis > 1 ? 's' : '' }}
                      @if (i.par) {
                        · {{ i.par }}
                      }
                    </small>
                  </span>
                  <span class="etiquette" [class.etiquette--cours]="i.statut === 'en_cours'">{{
                    i.statut === 'en_cours' ? 'En cours' : 'Terminé'
                  }}</span>
                  <button mat-stroked-button type="button" (click)="ouvrir(i.id)">
                    {{ i.statut === 'en_cours' ? 'Reprendre' : 'Voir le rapport' }}
                  </button>
                </li>
              }
            </ul>
          }
        </section>
      } @else {
        @let r = rapport()!;
        @let enCours = r.statut === 'en_cours';
        <section class="page-section carte">
          <div class="entete">
            <h2>
              {{ r.lieu }}
              <span class="etiquette" [class.etiquette--cours]="enCours">{{
                enCours ? 'En cours' : 'Terminé'
              }}</span>
            </h2>
            <button mat-button type="button" (click)="quitter()">
              {{ enCours ? 'Mettre de côté' : 'Fermer' }}
            </button>
          </div>

          @if (enCours) {
            <h3 class="etape">2. Tapez les numéros des autocollants</h3>
            <form class="saisie" [formGroup]="formNumero" (ngSubmit)="saisir()">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Numéro de l’autocollant</mat-label>
                <input
                  #champ
                  matInput
                  formControlName="numero"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="Ex. 3 ou MTM 0003"
                />
              </mat-form-field>
              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="!formNumero.controls.numero.value.trim() || envoi()"
              >
                Ajouter
              </button>
            </form>
            @if (derniere()) {
              <p
                class="retour"
                [class.retour--inconnu]="derniere()!.ton === 'inconnu'"
                role="status"
              >
                {{ derniere()!.texte }}
              </p>
            }
          }

          <div class="resume" aria-label="Résumé">
            <div>
              <strong
                >{{ r.conformes.length }}<small> / {{ r.aSaisir }}</small></strong
              >
              <span>à leur place</span>
            </div>
            <div [class.attention]="r.deplaces.length">
              <strong>{{ r.deplaces.length }}</strong>
              <span>trouvé{{ r.deplaces.length > 1 ? 's' : '' }} ailleurs</span>
            </div>
            <div [class.attention]="!enCours && r.manquants.length" [class.neutre]="enCours">
              <strong>{{ r.manquants.length }}</strong>
              <span>{{
                enCours ? 'restent à trouver' : r.manquants.length > 1 ? 'manquants' : 'manquant'
              }}</span>
            </div>
            <div [class.attention]="r.inconnus.length">
              <strong>{{ r.inconnus.length }}</strong>
              <span>numéro{{ r.inconnus.length > 1 ? 's' : '' }} sans fiche</span>
            </div>
          </div>

          @if (r.deplaces.length) {
            <h3>Trouvés ailleurs que dans leur fiche</h3>
            <ul class="liste">
              @for (d of r.deplaces; track d.id) {
                <li>
                  <span class="liste__titre">
                    <strong>{{ d.reference }}</strong> · {{ d.designation }}
                    <small>Sa fiche indique : {{ d.lieuFiche || 'pas de lieu' }}</small>
                  </span>
                </li>
              }
            </ul>
          }
          @if (r.inconnus.length) {
            <h3>Numéros sans fiche</h3>
            <ul class="liste">
              @for (d of r.inconnus; track d.numero) {
                <li>
                  <span class="liste__titre">
                    <strong>{{ d.reference }}</strong>
                    <small
                      >Aucun matériel n’a ce numéro : créez sa fiche, ou vérifiez ce que dit
                      l’autocollant.</small
                    >
                  </span>
                </li>
              }
            </ul>
          }
          @if (r.manquants.length) {
            <h3>
              {{
                enCours
                  ? 'Restent à trouver dans « ' + r.lieu + ' »'
                  : 'Manquants dans « ' + r.lieu + ' »'
              }}
            </h3>
            @if (enCours) {
              <p class="aide">
                Les objets de la fiche rangés ici que vous n’avez pas encore saisis. Ils seront
                signalés manquants à la fin.
              </p>
            }
            <ul class="liste">
              @for (d of r.manquants; track d.id) {
                <li>
                  <span class="liste__titre">
                    <strong>{{ d.reference }}</strong> · {{ d.designation }}
                    @if (d.explique) {
                      <small
                        >{{ d.statut === 'affecte' ? 'Confié à quelqu’un' : 'En maintenance' }} :
                        son absence est normale.</small
                      >
                    }
                  </span>
                </li>
              }
            </ul>
          }
          @if (r.sortisRetrouves.length) {
            <h3>Sortis du parc, pourtant retrouvés</h3>
            <ul class="liste">
              @for (d of r.sortisRetrouves; track d.id) {
                <li>
                  <span class="liste__titre"
                    ><strong>{{ d.reference }}</strong> · {{ d.designation }}</span
                  >
                </li>
              }
            </ul>
          }
          @if (r.conformes.length) {
            <details class="vus">
              <summary>Déjà vus à leur place ({{ r.conformes.length }})</summary>
              <ul class="liste">
                @for (d of r.conformes; track d.id) {
                  <li>
                    <span class="liste__titre"
                      ><strong>{{ d.reference }}</strong> · {{ d.designation }}</span
                    >
                  </li>
                }
              </ul>
            </details>
          }

          @if (enCours) {
            <div class="fin">
              <div class="fin__texte">
                <h3 class="etape">3. Terminez quand la pièce est parcourue</h3>
                <label class="case" [class.case--inactive]="!r.deplaces.length">
                  <input
                    type="checkbox"
                    [checked]="mettreAJour()"
                    (change)="mettreAJour.set($any($event.target).checked)"
                    [disabled]="!r.deplaces.length"
                  />
                  Ranger à « {{ r.lieu }} » les objets trouvés ailleurs
                </label>
                @if (r.manquants.length) {
                  <p class="aide">
                    {{ r.manquants.length }} objet{{ r.manquants.length > 1 ? 's' : '' }} non
                    saisi{{ r.manquants.length > 1 ? 's' : '' }} sera{{
                      r.manquants.length > 1 ? 'ont' : ''
                    }}
                    signalé{{ r.manquants.length > 1 ? 's' : '' }} manquant{{
                      r.manquants.length > 1 ? 's' : ''
                    }}.
                  </p>
                }
              </div>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="terminer()"
                [disabled]="envoi()"
              >
                Terminer l’inventaire
              </button>
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .inventaire-page {
      display: grid;
      gap: 16px;
    }
    .carte {
      padding: 16px 20px;
      display: grid;
      gap: 12px;
    }
    .carte h2,
    .carte h3 {
      margin: 0;
    }
    .carte h2 {
      font-size: var(--mtm-fs-xl);
    }
    .carte h3 {
      font-size: var(--mtm-fs-md);
      margin-top: 6px;
    }
    .etape {
      color: var(--mtm-primary);
    }
    .debut,
    .saisie {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-start;
    }
    .debut mat-form-field,
    .saisie mat-form-field {
      min-width: 260px;
    }
    .entete {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .entete h2 {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .vide,
    .aide {
      margin: 0;
      color: var(--mtm-text-muted);
      font-size: var(--mtm-fs-sm);
    }
    .liste {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 6px;
    }
    .liste li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--mtm-border);
      border-radius: var(--mtm-radius-md);
    }
    .liste__titre {
      flex: 1 1 260px;
    }
    .liste small {
      display: block;
      color: var(--mtm-text-muted);
      font-size: var(--mtm-fs-xs);
    }
    .etiquette {
      padding: 2px 10px;
      border-radius: var(--mtm-radius-pill);
      font-size: var(--mtm-fs-xs);
      font-weight: 700;
      background: var(--mtm-success-bg);
      color: var(--mtm-success);
    }
    .etiquette--cours {
      background: var(--mtm-warning-bg);
      color: var(--mtm-warning);
    }
    .retour {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--mtm-radius-md);
      background: var(--mtm-success-bg);
      color: var(--mtm-success);
      font-weight: 600;
    }
    .retour--inconnu {
      background: var(--mtm-error-bg);
      color: var(--mtm-error);
    }
    .resume {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
    }
    .resume div {
      display: grid;
      padding: 10px 12px;
      border: 1px solid var(--mtm-border);
      border-radius: var(--mtm-radius-md);
    }
    .resume strong {
      font-size: var(--mtm-fs-2xl);
      color: var(--mtm-text-dark);
    }
    .resume strong small {
      font-size: var(--mtm-fs-sm);
      font-weight: 500;
      color: var(--mtm-text-muted);
    }
    .resume span {
      font-size: var(--mtm-fs-sm);
      color: var(--mtm-text-muted);
    }
    .resume .attention {
      border-color: var(--mtm-warning);
      background: var(--mtm-warning-bg);
    }
    .resume .attention strong {
      color: var(--mtm-warning);
    }
    .vus summary {
      cursor: pointer;
      font-size: var(--mtm-fs-md);
      font-weight: 600;
      color: var(--mtm-primary);
      margin-bottom: 8px;
    }
    .fin {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--mtm-border);
    }
    .fin__texte {
      display: grid;
      gap: 6px;
    }
    .case {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--mtm-fs-md);
    }
    .case--inactive {
      color: var(--mtm-text-muted);
    }
  `,
})
export class InventaireMaterielPage implements OnInit {
  private readonly api = inject(MaterielApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly options = signal<OptionsMateriel | null>(null);
  protected readonly inventaires = signal<InventaireResume[]>([]);
  protected readonly rapport = signal<RapportInventaire | null>(null);
  protected readonly derniere = signal<Saisie | null>(null);
  protected readonly envoi = signal(false);
  protected readonly mettreAJour = signal(true);
  private readonly champ = viewChild<ElementRef<HTMLInputElement>>('champ');

  protected readonly formLieu = this.formBuilder.nonNullable.group({ lieu: '' });
  protected readonly formNumero = this.formBuilder.nonNullable.group({ numero: '' });

  ngOnInit(): void {
    this.api.options().subscribe({ next: (options) => this.options.set(options) });
    this.listerInventaires();
  }

  private listerInventaires(): void {
    this.api.inventaires().subscribe({
      next: (liste) => this.inventaires.set(liste),
      error: () => this.inventaires.set([]),
    });
  }

  protected commencer(): void {
    const lieu = this.formLieu.controls.lieu.value;
    if (!lieu || this.envoi()) return;
    this.envoi.set(true);
    this.api.ouvrirInventaire(lieu).subscribe({
      next: (rapport) => {
        this.envoi.set(false);
        this.afficher(rapport);
      },
      error: (error: unknown) => {
        this.envoi.set(false);
        this.notifications.error(error, 'L’inventaire n’a pas pu démarrer');
      },
    });
  }

  protected ouvrir(id: string): void {
    this.api.rapportInventaire(id).subscribe({
      next: (rapport) => this.afficher(rapport),
      error: (error: unknown) => this.notifications.error(error, 'L’inventaire ne se charge pas'),
    });
  }

  private afficher(rapport: RapportInventaire): void {
    this.rapport.set(rapport);
    this.derniere.set(null);
    this.formNumero.reset({ numero: '' });
    setTimeout(() => this.champ()?.nativeElement.focus());
  }

  protected saisir(): void {
    const rapport = this.rapport();
    const texte = this.formNumero.controls.numero.value.trim();
    if (!rapport || !texte || this.envoi()) return;
    this.envoi.set(true);
    this.api.saisirNumero(rapport.id, texte).subscribe({
      next: (resultat) => {
        this.derniere.set(
          resultat.connu
            ? { texte: `${resultat.reference} — ${resultat.designation}`, ton: 'ok' }
            : { texte: `${resultat.reference} : aucune fiche ne porte ce numéro`, ton: 'inconnu' },
        );
        this.formNumero.reset({ numero: '' });
        this.rafraichir(rapport.id);
      },
      error: (error: unknown) => {
        this.envoi.set(false);
        this.derniere.set(null);
        this.notifications.error(error, 'Ce numéro n’a pas pu être ajouté');
        this.champ()?.nativeElement.select();
      },
    });
  }

  private rafraichir(id: string): void {
    this.api.rapportInventaire(id).subscribe({
      next: (rapport) => {
        this.envoi.set(false);
        this.rapport.set(rapport);
        setTimeout(() => this.champ()?.nativeElement.focus());
      },
      error: () => this.envoi.set(false),
    });
  }

  protected terminer(): void {
    const rapport = this.rapport();
    if (!rapport || this.envoi()) return;
    this.envoi.set(true);
    this.api
      .terminerInventaire(rapport.id, this.mettreAJour() && rapport.deplaces.length > 0)
      .subscribe({
        next: (final) => {
          this.envoi.set(false);
          this.rapport.set(final);
          this.listerInventaires();
          this.notifications.success('Inventaire terminé');
        },
        error: (error: unknown) => {
          this.envoi.set(false);
          this.notifications.error(error, 'L’inventaire n’a pas pu être terminé');
        },
      });
  }

  protected quitter(): void {
    this.rapport.set(null);
    this.derniere.set(null);
    this.listerInventaires();
  }
}
