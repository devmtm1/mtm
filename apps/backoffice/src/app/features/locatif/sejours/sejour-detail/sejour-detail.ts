import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideArrowLeft, LucideCamera, LucideClipboardCheck, LucidePencil, LucidePlus, LucideTrash2 } from '@lucide/angular';
import type { Observable } from 'rxjs';
import { LocatifApiService } from '../../../../core/services/api/locatif-api.service';
import { SejoursApiService } from '../../../../core/services/api/sejours-api.service';
import { SessionService } from '../../../../core/services/session.service';
import { JustificationDialog } from '../../../../shared/dialogs/justification-dialog';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import type { EtatDesLieuxVue, SejourDetail } from '../../../../core/models/sejour.model';
import { MODES_PAIEMENT } from '../../locatif-status';
import { TextPromptDialog } from '../../../../shared/dialogs/text-prompt-dialog';
import { SejourDialog } from '../sejour-dialog';
import { CautionSejourDialog, EtatDesLieuxDialog, PaiementSejourDialog } from '../sejour-dialogs';
import {
  ETATS_PIECE,
  SOURCES_SEJOUR,
  STATUTS_CAUTION_SEJOUR,
  STATUTS_REGLEMENT,
  STATUTS_SEJOUR,
  TYPES_PAIEMENT_SEJOUR,
  formatJour,
  libelle,
  montant,
  nomBien,
  nomVoyageur,
} from '../sejour-status';
import { ConfirmService } from '../../../../shared/dialogs/confirm-dialog';

const TAILLE_MAX_PHOTO = 10 * 1024 * 1024;

/**
 * Fiche d'un séjour : le déroulé (confirmer, arrivée, départ, annulation), ce
 * qui a été réglé, la caution et les états des lieux d'entrée et de sortie, avec
 * la comparaison qui justifie une éventuelle retenue.
 */
@Component({
  selector: 'app-sejour-detail',
  imports: [DatePipe, MoneyPipe, RouterLink, MatButtonModule, MatTooltipModule, LucideArrowLeft, LucideCamera, LucideClipboardCheck, LucidePencil, LucidePlus, LucideTrash2],
  templateUrl: './sejour-detail.html',
  styleUrl: './sejour-detail.scss',
})
export class SejourDetailPage implements OnInit {
  private readonly confirmer = inject(ConfirmService);
  private readonly api = inject(SejoursApiService);
  private readonly locatifApi = inject(LocatifApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canModify = computed(() => this.session.hasPermission('locatif:modifier'));
  protected readonly canPay = computed(() => this.session.hasPermission('locatif:payer'));
  protected readonly canValidate = computed(() => this.session.hasPermission('locatif:valider'));

  protected readonly sejour = signal<SejourDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly modesPaiement = signal<string[]>([]);

  protected readonly statuts = STATUTS_SEJOUR;
  protected readonly reglements = STATUTS_REGLEMENT;
  protected readonly cautions = STATUTS_CAUTION_SEJOUR;
  protected readonly sources = SOURCES_SEJOUR;
  protected readonly etatsPiece = ETATS_PIECE;
  protected readonly modes = MODES_PAIEMENT;
  protected readonly typesPaiement = TYPES_PAIEMENT_SEJOUR;

  protected readonly jour = formatJour;
  protected readonly libelle = libelle;
  protected readonly voyageur = nomVoyageur;
  protected readonly bien = nomBien;
  protected readonly montant = montant;

  protected readonly modifiable = computed(() => ['demande', 'confirmee'].includes(this.sejour()?.statut ?? ''));
  protected readonly termine = computed(() => ['terminee', 'annulee'].includes(this.sejour()?.statut ?? ''));
  /** Caution détenue : à rendre, ou à retenir, à la fin du séjour. */
  protected readonly cautionDetenue = computed(() => this.sejour()?.cautionStatut === 'versee');
  protected readonly cautionMontant = computed(() => montant(this.sejour()?.cautionMontant));

  ngOnInit(): void {
    this.locatifApi.getOptions().subscribe({
      next: (options) => this.modesPaiement.set(options.modesPaiement ?? Object.keys(MODES_PAIEMENT)),
      error: () => this.modesPaiement.set(Object.keys(MODES_PAIEMENT)),
    });
    this.charger();
  }

  protected retour(): void {
    void this.router.navigate(['/locatif/sejours']);
  }

  // --- Déroulé ---

  protected modifier(): void {
    const sejour = this.sejour();
    if (!sejour) return;
    SejourDialog.open(this.dialog, { sejour }).subscribe((misAJour) => {
      if (!misAJour) return;
      this.sejour.set(misAJour);
      this.notify.success('Séjour modifié');
    });
  }

  protected avancer(statut: 'confirmee' | 'en_cours' | 'terminee', message: string): void {
    const sejour = this.sejour();
    if (!sejour) return;
    this.executer(this.api.changerStatut(sejour.id, statut), message);
  }

  protected annuler(): void {
    const sejour = this.sejour();
    if (!sejour) return;
    JustificationDialog.ask(this.dialog, {
      title: 'Annuler le séjour',
      description: 'Les nuits sont libérées. Le motif reste sur la fiche. Un règlement déjà reçu n’est pas rendu automatiquement.',
      confirmLabel: 'Annuler le séjour',
    }).subscribe((motif) => {
      if (motif) this.executer(this.api.annuler(sejour.id, motif), 'Séjour annulé');
    });
  }

  // --- Règlements ---

  protected ajouterPaiement(): void {
    const sejour = this.sejour();
    if (!sejour) return;
    PaiementSejourDialog.open(this.dialog, { reste: sejour.synthese.reste, modes: this.modesPaiement() }).subscribe((payload) => {
      if (payload) this.executer(this.api.addPaiement(sejour.id, payload), 'Règlement enregistré');
    });
  }

  protected supprimerPaiement(id: string): void {
    const sejour = this.sejour();
    if (!sejour) return;
    this.confirmer.ask('Supprimer ce règlement ? Le reste à payer sera recalculé. Cette action est tracée.').subscribe((confirme) => {
      if (!confirme) return;
      this.executer(this.api.removePaiement(sejour.id, id), 'Règlement supprimé');
    });
  }

  // --- Caution ---

  protected verserCaution(): void {
    const sejour = this.sejour();
    if (!sejour) return;
    this.executer(this.api.verserCaution(sejour.id), 'Caution enregistrée');
  }

  protected restituerCaution(): void {
    const sejour = this.sejour();
    if (!sejour) return;
    CautionSejourDialog.open(this.dialog, {
      caution: this.cautionMontant(),
      degradations: sejour.etatsDesLieux.degradations,
    }).subscribe((resultat) => {
      if (resultat) this.executer(this.api.restituerCaution(sejour.id, resultat), 'Caution restituée');
    });
  }

  // --- États des lieux ---

  protected faireEtat(type: 'entree' | 'sortie'): void {
    const sejour = this.sejour();
    if (!sejour) return;
    const etats = sejour.etatsDesLieux;
    EtatDesLieuxDialog.open(this.dialog, {
      cible: 'sejours',
      id: sejour.id,
      type,
      existant: type === 'entree' ? etats.entree : etats.sortie,
      entree: etats.entree,
    }).subscribe((resultat) => {
      if (!resultat) return;
      this.sejour.update((courant) => (courant ? { ...courant, etatsDesLieux: resultat } : courant));
      this.notify.success(type === 'entree' ? 'État des lieux d’entrée enregistré' : 'État des lieux de sortie enregistré');
    });
  }

  protected ajouterPhoto(event: Event, etat: EtatDesLieuxVue): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier) return;
    if (!fichier.type.startsWith('image/') || fichier.size > TAILLE_MAX_PHOTO) {
      this.notify.info('Choisissez une photo (JPG, PNG ou WebP) de moins de 10 Mo.');
      return;
    }
    TextPromptDialog.ask(this.dialog, {
      title: 'Légende de la photo',
      description: 'La pièce ou l’élément photographié (facultatif).',
      label: 'Légende',
      required: false,
      rows: 1,
      confirmLabel: 'Ajouter la photo',
    }).subscribe((legende) => {
      if (legende === undefined) return;
      this.busy.set(true);
      this.api.addPhotoEtat(etat.id, fichier, legende || undefined).subscribe({
        next: (resultat) => this.apresEtat(resultat, 'Photo ajoutée'),
        error: (error: unknown) => {
          this.busy.set(false);
          this.notify.error(error, 'Envoi de la photo impossible');
        },
      });
    });
  }

  protected retirerPhoto(etat: EtatDesLieuxVue, photoId: string): void {
    this.confirmer.ask('Supprimer cette photo ?').subscribe((confirme) => {
      if (!confirme) return;
      this.busy.set(true);
      this.api.removePhotoEtat(etat.id, photoId).subscribe({
        next: (resultat) => this.apresEtat(resultat, 'Photo supprimée'),
        error: (error: unknown) => {
          this.busy.set(false);
          this.notify.error(error, 'Suppression impossible');
        },
      });
    });
  }

  // --- internes ---

  private apresEtat(resultat: SejourDetail['etatsDesLieux'], message: string): void {
    this.busy.set(false);
    this.sejour.update((courant) => (courant ? { ...courant, etatsDesLieux: resultat } : courant));
    this.notify.success(message);
  }

  private executer(action: Observable<SejourDetail>, succes: string): void {
    this.busy.set(true);
    action.subscribe({
      next: (sejour) => {
        this.busy.set(false);
        this.sejour.set(sejour);
        this.notify.success(succes);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'Action impossible');
      },
    });
  }

  private charger(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    if (!this.chargementInitialFait) this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (sejour) => {
        this.sejour.set(sejour);
        this.finChargement();
      },
      error: (error: unknown) => {
        this.finChargement();
        this.notify.error(error, 'Séjour introuvable');
        this.retour();
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
