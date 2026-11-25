import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideExternalLink, LucideTriangleAlert, LucideUpload } from '@lucide/angular';
import {
  ProtocolesApiService,
  type OptionsProtocoles,
  type ProtocoleDetail,
  type ProtocoleDocument,
  type StatutProtocole,
} from '../../core/services/api/protocoles-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { telLink, whatsappLink } from '../crm/crm-status';

export interface ProtocoleDetailDialogData {
  id: string;
}

const MAX_FICHIER = 15 * 1024 * 1024;
const MOYENS: Record<string, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  main_propre: 'Remis en main propre',
  courrier: 'Courrier',
  autre: 'Autre',
};

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

/**
 * Fiche d'un protocole : le dossier concerné, les deux pièces (version préparée, copie signée), l'historique, et le changement
 * de statut. Le serveur reste juge : il refuse « signé par le client » sans copie signée ni date de réception.
 */
@Component({
  selector: 'app-protocole-detail-dialog',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MoneyPipe,
    LucideExternalLink,
    LucideTriangleAlert,
    LucideUpload,
  ],
  template: `
    @if (!protocole()) {
      <h2 mat-dialog-title>Protocole</h2>
      <mat-dialog-content>
        @if (erreur()) {
          <p class="dialog-erreur">
            Ce protocole ne se charge pas. Fermez la fenêtre et réessayez.
          </p>
        } @else {
          <div class="skeleton" style="height: 120px"></div>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end"
        ><button mat-stroked-button type="button" (click)="fermer()">
          Fermer
        </button></mat-dialog-actions
      >
    } @else {
      @let p = protocole()!;
      <h2 mat-dialog-title>
        {{ p.titre || libelleType(p.type) }}
        <span class="statut" [class]="'statut statut--' + tonStatut(p.statut)">{{
          p.libelleStatut
        }}</span>
        @if (p.enRetard) {
          <span class="statut statut--danger">En retard</span>
        }
      </h2>
      <mat-dialog-content>
        <section class="bloc" aria-label="Dossier">
          <p class="dossier__titre">
            <strong>{{ p.dossier.reference || 'Dossier' }}</strong> · {{ p.dossier.client }}
            @if (p.dossier.bien) {
              · {{ p.dossier.bien }}
            }
          </p>
          @if (p.dossier.montantEncaisse !== null) {
            <p class="dossier__montants">
              Convenu
              @if (p.dossier.montantConvenu !== null) {
                <strong>{{ p.dossier.montantConvenu | mtmMoney }}</strong>
              } @else {
                <strong>à fixer</strong>
              }
              · Encaissé <strong>{{ p.dossier.montantEncaisse | mtmMoney }}</strong>
              @if (p.dossier.soldeRestant !== null) {
                · Reste <strong>{{ p.dossier.soldeRestant | mtmMoney }}</strong>
              }
            </p>
          }
          @if (p.dossier.paiementsEnregistres > 0 && !estSigne(p.statut)) {
            <p class="avertissement">
              <svg lucideTriangleAlert aria-hidden="true"></svg>
              Un paiement est enregistré, mais ce protocole n’est pas signé : un paiement ne
              remplace pas la signature.
            </p>
          }
          @if (p.motif) {
            <p class="motif"><strong>Motif :</strong> {{ p.motif }}</p>
          }
        </section>

        @if (relancable(p); as contacts) {
          <section class="bloc" aria-label="Relancer le client">
            <h3>Relancer le client</h3>
            <p class="relance__aide">
              Le message est déjà rédigé : vous le relisez, puis vous l’envoyez.
            </p>
            <div class="relance">
              @if (contacts.whatsapp) {
                <a
                  mat-stroked-button
                  [href]="contacts.whatsapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  >WhatsApp</a
                >
              }
              @if (contacts.mail) {
                <a mat-stroked-button [href]="contacts.mail">E-mail</a>
              }
              @if (contacts.tel) {
                <a mat-stroked-button [href]="contacts.tel">Appeler</a>
              }
            </div>
          </section>
        }

        @if (p.acceptationEnLigne; as preuve) {
          <section class="bloc" aria-label="Acceptation en ligne">
            <h3>Accepté en ligne par le client</h3>
            <p class="preuve">
              <strong>{{ preuve.nom }}</strong> a accepté ce protocole le
              {{ preuve.le | date: 'dd/MM/yyyy à HH:mm' }}.
            </p>
            <p class="preuve preuve--technique">
              Adresse : {{ preuve.adresse || 'inconnue' }} · Empreinte du document accepté (SHA-256)
              :
              <code>{{ preuve.empreinte }}</code>
            </p>
          </section>
        }
        <section class="bloc" aria-label="Pièces">
          <h3>Pièces</h3>
          <div class="pieces">
            <div class="piece">
              <span class="piece__titre">Version préparée</span>
              @if (p.documentPrepare) {
                <a [href]="p.documentPrepare.url" target="_blank" rel="noopener noreferrer"
                  ><svg lucideExternalLink aria-hidden="true"></svg
                  >{{ nomPiece(p.documentPrepare) }}</a
                >
              } @else {
                <span class="piece__vide">Pas encore déposée</span>
              }
              @if (peutModifier && !clos(p.statut)) {
                <label class="depot">
                  <svg lucideUpload aria-hidden="true"></svg
                  >{{ p.documentPrepare ? 'Remplacer' : 'Déposer' }}
                  <input
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    (change)="deposer($event, 'prepare')"
                    [disabled]="envoi()"
                  />
                </label>
              }
            </div>
            <div class="piece">
              <span class="piece__titre">Copie signée par le client</span>
              @if (p.documentSigne) {
                <a [href]="p.documentSigne.url" target="_blank" rel="noopener noreferrer"
                  ><svg lucideExternalLink aria-hidden="true"></svg
                  >{{ nomPiece(p.documentSigne) }}</a
                >
                @if (p.dateReceptionSignee) {
                  <small>Reçue le {{ p.dateReceptionSignee | date: 'dd/MM/yyyy' }}</small>
                }
              } @else {
                <span class="piece__vide">Pas encore reçue</span>
              }
              @if (peutModifier && !clos(p.statut)) {
                <label class="depot">
                  <svg lucideUpload aria-hidden="true"></svg
                  >{{ p.documentSigne ? 'Remplacer' : 'Déposer' }}
                  <input
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    (change)="deposer($event, 'signe')"
                    [disabled]="envoi()"
                  />
                </label>
              }
            </div>
          </div>
          @if (p.dateEnvoi) {
            <p class="envoi">
              Envoyé le {{ p.dateEnvoi | date: 'dd/MM/yyyy'
              }}{{ p.moyenEnvoi ? ' · ' + moyen(p.moyenEnvoi) : '' }}
            </p>
          }
          @if (erreurFichier()) {
            <p class="dialog-erreur">{{ erreurFichier() }}</p>
          }
        </section>

        @if (peutModifier && suivants().length) {
          <section class="bloc" aria-label="Changer le statut">
            <h3>Passer à l’étape suivante</h3>
            <form [formGroup]="form" class="formulaire">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Nouveau statut</mat-label>
                <mat-select formControlName="statut">
                  @for (statut of suivants(); track statut.valeur) {
                    <mat-option [value]="statut.valeur">{{ statut.libelle }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (cible() === 'envoye') {
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Date d’envoi</mat-label>
                  <input matInput type="date" formControlName="dateEnvoi" />
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Moyen d’envoi</mat-label>
                  <mat-select formControlName="moyenEnvoi">
                    @for (moyenEnvoi of moyensEnvoi(); track moyenEnvoi) {
                      <mat-option [value]="moyenEnvoi">{{ moyen(moyenEnvoi) }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              @if (cible() === 'signe_client') {
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Date de réception de la copie signée</mat-label>
                  <input matInput type="date" formControlName="dateReceptionSignee" />
                </mat-form-field>
              }
              @if (cible() === 'a_corriger' || cible() === 'annule') {
                <mat-form-field
                  appearance="outline"
                  subscriptSizing="dynamic"
                  class="formulaire__large"
                >
                  <mat-label>Motif (obligatoire)</mat-label>
                  <textarea matInput rows="2" formControlName="motif" maxlength="500"></textarea>
                </mat-form-field>
              } @else {
                <mat-form-field
                  appearance="outline"
                  subscriptSizing="dynamic"
                  class="formulaire__large"
                >
                  <mat-label>Remarque (facultatif)</mat-label>
                  <input matInput formControlName="note" maxlength="500" />
                </mat-form-field>
              }
            </form>
            @if (blocage(); as raison) {
              <p class="dialog-aide">{{ raison }}</p>
            }
          </section>
        }

        <section class="bloc" aria-label="Historique">
          <h3>Historique</h3>
          <ol class="historique">
            @for (ligne of p.historique; track ligne.id) {
              <li>
                <strong>{{ ligne.libelle }}</strong>
                <span
                  >{{ ligne.le | date: 'dd/MM/yyyy HH:mm'
                  }}{{ ligne.par ? ' · ' + ligne.par : '' }}</span
                >
                @if (ligne.note) {
                  <em>{{ ligne.note }}</em>
                }
              </li>
            }
          </ol>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="fermer()">Fermer</button>
        @if (peutModifier && suivants().length) {
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="valider()"
            [disabled]="envoi() || !form.controls.statut.value || !!blocage()"
          >
            {{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        }
      </mat-dialog-actions>
    }
  `,
  styles: `
    .relance {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .relance__aide {
      margin: 0 0 8px;
      color: var(--mtm-text-muted);
      font-size: var(--mtm-fs-sm);
    }
    mat-dialog-content {
      display: grid;
      gap: 14px;
    }
    .statut {
      margin-left: 10px;
      padding: 3px 10px;
      border-radius: var(--mtm-radius-pill);
      background: var(--mtm-bg-hover);
      color: var(--mtm-text-muted);
      font-size: var(--mtm-fs-xs);
      font-weight: 600;
      vertical-align: middle;
    }
    .statut--success {
      background: var(--mtm-success-bg);
      color: var(--mtm-success);
    }
    .statut--warning {
      background: var(--mtm-warning-bg);
      color: var(--mtm-warning);
    }
    .statut--danger {
      background: var(--mtm-error-bg);
      color: var(--mtm-error);
    }
    .bloc {
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      border: 1px solid var(--mtm-border);
      border-radius: var(--mtm-radius-md);
    }
    .bloc h3 {
      margin: 0;
      font-size: var(--mtm-fs-sm);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mtm-text-muted);
    }
    .dossier__titre,
    .dossier__montants,
    .envoi,
    .motif {
      margin: 0;
      font-size: var(--mtm-fs-md);
    }
    .dossier__montants {
      color: var(--mtm-text-muted);
    }
    .preuve {
      margin: 0 0 4px;
    }
    .preuve--technique {
      font-size: var(--mtm-fs-xs);
      color: var(--mtm-text-muted);
      overflow-wrap: anywhere;
    }
    .avertissement {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--mtm-radius-md);
      background: var(--mtm-error-bg);
      color: var(--mtm-error);
      font-size: var(--mtm-fs-sm);
      font-weight: 600;
    }
    .avertissement svg {
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
    }
    .pieces {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px;
    }
    .piece {
      display: grid;
      gap: 4px;
      align-content: start;
      padding: 10px;
      border: 1px dashed var(--mtm-border);
      border-radius: var(--mtm-radius-md);
    }
    .piece__titre {
      font-size: var(--mtm-fs-sm);
      font-weight: 700;
      color: var(--mtm-text-dark);
    }
    .piece__vide {
      color: var(--mtm-text-muted);
      font-size: var(--mtm-fs-sm);
    }
    .piece a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--mtm-fs-md);
      word-break: break-all;
    }
    .piece svg,
    .depot svg {
      width: 15px;
      height: 15px;
    }
    .piece small {
      color: var(--mtm-text-muted);
    }
    .depot {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
      margin-top: 4px;
      padding: 5px 10px;
      border: 1px solid var(--mtm-primary);
      border-radius: var(--mtm-radius-sm);
      color: var(--mtm-primary);
      font-size: var(--mtm-fs-sm);
      font-weight: 600;
      cursor: pointer;
    }
    .depot input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    .depot:focus-within {
      outline: 2px solid var(--mtm-primary);
      outline-offset: 2px;
    }
    .formulaire {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
    }
    .formulaire__large {
      grid-column: 1 / -1;
    }
    .dialog-erreur {
      margin: 0;
      color: var(--mtm-error);
      font-size: var(--mtm-fs-sm);
      font-weight: 600;
    }
    .dialog-aide {
      margin: 0;
      color: var(--mtm-text-muted);
      font-size: var(--mtm-fs-sm);
    }
    .historique {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .historique li {
      display: grid;
      gap: 1px;
      padding-left: 12px;
      border-left: 3px solid var(--mtm-primary-light);
      font-size: var(--mtm-fs-md);
    }
    .historique span {
      color: var(--mtm-text-muted);
      font-size: var(--mtm-fs-xs);
    }
    .historique em {
      font-size: var(--mtm-fs-sm);
    }
  `,
})
export class ProtocoleDetailDialog implements OnInit {
  private readonly api = inject(ProtocolesApiService);
  private readonly dialogRef = inject(MatDialogRef<ProtocoleDetailDialog>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly data = inject<ProtocoleDetailDialogData>(MAT_DIALOG_DATA);

  protected readonly peutModifier = this.session.hasPermission('protocoles:modifier');
  private readonly peutValider = this.session.hasPermission('protocoles:valider');

  protected readonly protocole = signal<ProtocoleDetail | null>(null);
  protected readonly options = signal<OptionsProtocoles | null>(null);
  protected readonly erreur = signal(false);
  protected readonly envoi = signal(false);
  protected readonly erreurFichier = signal('');
  private modifie = false;

  protected readonly form = this.formBuilder.nonNullable.group({
    statut: '',
    dateEnvoi: aujourdhui(),
    moyenEnvoi: '',
    dateReceptionSignee: aujourdhui(),
    motif: '',
    note: '',
  });

  protected readonly cible = signal<StatutProtocole | ''>('');
  /** Compte les modifications du formulaire : un formulaire n'est pas un signal, ce compteur relance le calcul de `blocage`. */
  private readonly saisies = signal(0);
  protected readonly moyensEnvoi = computed(() => this.options()?.moyensEnvoi ?? []);

  /** Les étapes permises depuis le statut actuel ; « validé » n'est proposé qu'à qui peut valider. */
  protected readonly suivants = computed(() => {
    const protocole = this.protocole();
    const options = this.options();
    if (!protocole || !options) return [];
    const permis = options.transitions[protocole.statut] ?? [];
    return options.statuts.filter(
      (statut) =>
        permis.includes(statut.valeur) && (statut.valeur !== 'valide' || this.peutValider),
    );
  });

  /** Ce qui manque pour enregistrer l'étape choisie (le serveur contrôle aussi). */
  protected readonly blocage = computed<string | null>(() => {
    this.saisies();
    const protocole = this.protocole();
    const cible = this.cible();
    if (!protocole || !cible) return null;
    const valeurs = this.form.getRawValue();
    if (cible === 'prepare_a_verifier' && !protocole.documentPrepare)
      return 'Déposez d’abord la version préparée du protocole.';
    if (cible === 'envoye' && (!valeurs.dateEnvoi || !valeurs.moyenEnvoi))
      return 'Indiquez la date et le moyen d’envoi.';
    if (cible === 'signe_client') {
      if (!protocole.documentSigne)
        return 'Le statut « signé par le client » exige le dépôt de la copie signée.';
      if (!valeurs.dateReceptionSignee) return 'Indiquez la date de réception de la copie signée.';
    }
    if ((cible === 'a_corriger' || cible === 'annule') && !valeurs.motif.trim())
      return 'Indiquez le motif.';
    return null;
  });

  ngOnInit(): void {
    this.api.options().subscribe({ next: (options) => this.options.set(options) });
    this.charger();
    this.form.controls.statut.valueChanges.subscribe((valeur) =>
      this.cible.set(valeur as StatutProtocole | ''),
    );
    this.form.valueChanges.subscribe(() => {
      this.cible.set(this.form.controls.statut.value as StatutProtocole | '');
      this.saisies.update((n) => n + 1);
    });
  }

  private charger(): void {
    this.api.detail(this.data.id).subscribe({
      next: (detail) => {
        this.protocole.set(detail);
        this.form.patchValue({ statut: '', motif: '', note: '' });
        this.cible.set('');
      },
      error: () => this.erreur.set(true),
    });
  }

  protected deposer(evenement: Event, role: 'prepare' | 'signe'): void {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    this.erreurFichier.set('');
    if (!fichier) return;
    if (fichier.size > MAX_FICHIER) {
      this.erreurFichier.set('Le fichier dépasse 15 Mo.');
      return;
    }
    this.envoi.set(true);
    this.api.deposerDocument(this.data.id, role, fichier).subscribe({
      next: (detail) => {
        this.protocole.set(detail);
        this.modifie = true;
        this.envoi.set(false);
        this.notifications.success(role === 'signe' ? 'Copie signée déposée' : 'Document déposé');
      },
      error: (error: unknown) => {
        this.envoi.set(false);
        this.erreurFichier.set(this.notifications.error(error, 'Le dépôt a échoué'));
      },
    });
  }

  protected valider(): void {
    const cible = this.cible();
    if (!cible || this.blocage()) return;
    const valeurs = this.form.getRawValue();
    this.envoi.set(true);
    this.api
      .changerStatut(this.data.id, {
        statut: cible,
        motif: valeurs.motif.trim() || undefined,
        note: valeurs.note.trim() || undefined,
        dateEnvoi: cible === 'envoye' ? valeurs.dateEnvoi : undefined,
        moyenEnvoi: cible === 'envoye' ? valeurs.moyenEnvoi : undefined,
        dateReceptionSignee: cible === 'signe_client' ? valeurs.dateReceptionSignee : undefined,
      })
      .subscribe({
        next: (detail) => {
          this.protocole.set(detail);
          this.modifie = true;
          this.envoi.set(false);
          this.form.patchValue({ statut: '', motif: '', note: '' });
          this.cible.set('');
          this.notifications.success('Statut enregistré');
        },
        error: (error: unknown) => {
          this.envoi.set(false);
          this.notifications.error(error, 'Le changement de statut a échoué');
        },
      });
  }

  /**
   * Liens de relance d'un protocole parti chez le client sans retour signé : WhatsApp, e-mail et appel, avec un message déjà
   * rédigé. Pas de fournisseur à configurer : la personne relit et envoie depuis son propre WhatsApp ou sa messagerie.
   */
  protected relancable(
    p: ProtocoleDetail,
  ): { whatsapp: string | null; mail: string | null; tel: string | null } | null {
    if (!['envoye', 'en_attente_signature'].includes(p.statut)) return null;
    const message = this.messageDeRelance(p);
    const base = whatsappLink(p.dossier.telephone);
    const whatsapp = base ? `${base}?text=${encodeURIComponent(message)}` : null;
    const mail = p.dossier.email
      ? `mailto:${p.dossier.email}?subject=${encodeURIComponent('Votre protocole MTM Immobilier')}&body=${encodeURIComponent(message)}`
      : null;
    const tel = telLink(p.dossier.telephone);
    return whatsapp || mail || tel ? { whatsapp, mail, tel } : null;
  }

  private messageDeRelance(p: ProtocoleDetail): string {
    const prenom = (p.dossier.client ?? '').split(' ')[0];
    const envoi = p.dateEnvoi ? ` le ${new Date(p.dateEnvoi).toLocaleDateString('fr-FR')}` : '';
    const ref = p.dossier.reference ? ` (dossier ${p.dossier.reference})` : '';
    return `Bonjour${prenom ? ' ' + prenom : ''}, c’est MTM Immobilier. Votre protocole « ${p.titre || this.libelleType(p.type)} »${ref} vous a été envoyé${envoi}. Pouvez-vous le signer et nous le retourner ? Merci.`;
  }

  protected fermer(): void {
    this.dialogRef.close(this.modifie);
  }

  protected clos(statut: string): boolean {
    return statut === 'valide' || statut === 'annule';
  }

  protected estSigne(statut: string): boolean {
    return ['signe_client', 'signe_mtm', 'a_valider_direction', 'valide'].includes(statut);
  }

  protected tonStatut(statut: string): string {
    if (this.estSigne(statut)) return 'success';
    if (['a_corriger', 'annule'].includes(statut)) return 'danger';
    if (['envoye', 'en_attente_signature'].includes(statut)) return 'warning';
    return 'neutre';
  }

  protected moyen(valeur: string): string {
    return MOYENS[valeur] ?? valeur;
  }

  protected libelleType(type: string): string {
    return (
      { protocole_accord: 'Protocole d’accord', contrat: 'Contrat', autre: 'Autre document' }[
        type
      ] ?? type
    );
  }

  protected nomPiece(document: ProtocoleDocument): string {
    return document.titre || `Version ${document.version}`;
  }
}
