import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  LucideClockAlert,
  LucideDownload,
  LucideFileCheck,
  LucideFileClock,
  LucideFilePen,
  LucideFileSignature,
  LucidePlus,
  LucideSearch,
  LucideSend,
  LucideStamp,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { debounceTime } from 'rxjs/operators';
import {
  ProtocolesApiService,
  type AlerteSignature,
  type FiltreProtocoles,
  type FiltresProtocoles,
  type OptionsProtocoles,
  type Protocole,
  type ResponsableProtocoles,
  type TableauProtocoles,
} from '../../core/services/api/protocoles-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { Pagination, TAILLE_PAGE_DEFAUT } from '../../shared/components/pagination/pagination';
import { ExportListeDialog } from '../../shared/dialogs/export-liste-dialog';
import { chargerToutesLesPages, isoJour, sourceDepuisLignes } from '../../shared/utils/export-lignes';
import { ProtocoleDetailDialog, type ProtocoleDetailDialogData } from './protocole-detail-dialog';
import { ProtocoleNouveauDialog } from './protocole-nouveau-dialog';

/** Ce que chaque indicateur du tableau de bord ouvre : un filtre de la liste. */
interface Indicateur {
  cle: string;
  libelle: string;
  detail: string;
  valeur: (tableau: TableauProtocoles) => number;
  filtre: { filtre?: FiltreProtocoles; statut?: string };
  icone: 'preparer' | 'envoyer' | 'attente' | 'signe' | 'valider' | 'alerte' | 'retard' | 'incomplet';
  ton: 'primary' | 'success' | 'warning' | 'attention';
}

const TOUS_LES_INDICATEURS: Indicateur[] = [
  { cle: 'aPreparer', libelle: 'À préparer', detail: 'Protocoles pas encore déposés', valeur: (t) => t.protocoles.aPreparer, filtre: { statut: 'a_preparer' }, icone: 'preparer', ton: 'primary' },
  { cle: 'prepares', libelle: 'Préparés', detail: 'À vérifier avant envoi', valeur: (t) => t.protocoles.prepares, filtre: { statut: 'prepare_a_verifier' }, icone: 'envoyer', ton: 'primary' },
  { cle: 'attente', libelle: 'En attente de signature', detail: 'Envoyés, sans retour signé', valeur: (t) => t.protocoles.enAttenteSignature, filtre: { filtre: 'en_attente' }, icone: 'attente', ton: 'warning' },
  { cle: 'retard', libelle: 'En retard', detail: 'Sans retour au-delà du délai', valeur: (t) => t.protocoles.enRetard, filtre: { filtre: 'en_retard' }, icone: 'retard', ton: 'attention' },
  { cle: 'signes', libelle: 'Signés par le client', detail: 'Copie signée déposée', valeur: (t) => t.protocoles.signesClient, filtre: { statut: 'signe_client' }, icone: 'signe', ton: 'success' },
  { cle: 'valider', libelle: 'À valider', detail: 'En attente de la Direction', valeur: (t) => t.protocoles.aValider, filtre: { filtre: 'a_valider' }, icone: 'valider', ton: 'primary' },
  { cle: 'sansSignature', libelle: 'Paiements sans signature', detail: 'Paiement reçu, protocole non signé', valeur: (t) => t.paiements.sansSignature, filtre: { filtre: 'sans_signature' }, icone: 'alerte', ton: 'attention' },
  { cle: 'incomplets', libelle: 'Dossiers incomplets', detail: 'Aucun protocole validé', valeur: (t) => t.dossiers.incomplets, filtre: { filtre: 'incomplets' }, icone: 'incomplet', ton: 'warning' },
];

/**
 * Suivi des protocoles et des signatures : le tableau de bord (chaque indicateur ouvre la liste qui le compose), l'alerte
 * « paiement reçu – signature manquante » et la liste des protocoles, avec leur fiche (documents, historique, changement de statut).
 */
@Component({
  selector: 'app-protocoles',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MoneyPipe,
    Pagination,
    LucideClockAlert,
    LucideDownload,
    LucideFileCheck,
    LucideFileClock,
    LucideFilePen,
    LucideFileSignature,
    LucidePlus,
    LucideSearch,
    LucideSend,
    LucideStamp,
    LucideTriangleAlert,
    LucideX,
  ],
  templateUrl: './protocoles.html',
  styleUrl: './protocoles.scss',
})
export class ProtocolesPage implements OnInit {
  private readonly api = inject(ProtocolesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  /** Quatre chiffres seulement : ceux qui demandent une action. Les autres statuts se choisissent dans le filtre « Statut ». */
  protected readonly indicateurs = TOUS_LES_INDICATEURS.filter((i) => ['attente', 'retard', 'valider', 'sansSignature'].includes(i.cle));
  protected readonly canCreate = this.session.hasPermission('protocoles:creer');
  protected readonly peutExporter = this.session.hasPermission('protocoles:exporter');
  protected readonly exportEnCours = signal(false);
  protected readonly responsables = signal<ResponsableProtocoles[]>([]);

  protected readonly options = signal<OptionsProtocoles | null>(null);
  protected readonly tableau = signal<TableauProtocoles | null>(null);
  protected readonly alertes = signal<AlerteSignature[]>([]);
  protected readonly protocoles = signal<Protocole[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(TAILLE_PAGE_DEFAUT);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal(false);
  /** Filtre posé par un indicateur (ou par l'adresse) : il s'ajoute à la recherche et au statut. */
  protected readonly filtre = signal<FiltreProtocoles | ''>('');

  protected readonly filters = this.formBuilder.nonNullable.group({ q: '', statut: '', responsableId: '', depuis: '', jusqua: '' });
  /** Compte les saisies : le formulaire n'est pas un signal, ce compteur relance le calcul de `filtreActif`. */
  private readonly saisies = signal(0);
  protected readonly filtreActif = computed(() => {
    this.saisies();
    return this.filtre() !== '' || Object.values(this.filters.getRawValue()).some((valeur) => valeur !== '');
  });
  protected readonly libelleFiltre = computed(() => TOUS_LES_INDICATEURS.find((i) => i.filtre.filtre === this.filtre())?.libelle ?? '');

  /** Le squelette ne s'affiche qu'au premier chargement : ensuite l'écran se met à jour en place. */
  private chargementInitialFait = false;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filtre.set((params.get('filtre') as FiltreProtocoles | null) ?? '');
    // Un lien depuis la fiche d'un dossier arrive avec sa référence : la liste s'ouvre déjà filtrée dessus.
    const recherche = params.get('q');
    if (recherche) this.filters.controls.q.setValue(recherche, { emitEvent: false });
    this.saisies.update((n) => n + 1);
    this.api.options().subscribe({ next: (options) => this.options.set(options) });
    this.api.responsables().subscribe({ next: (responsables) => this.responsables.set(responsables), error: () => this.responsables.set([]) });
    this.rafraichirSynthese();
    this.charger();
    // « + Nouveau › Protocole » dans la barre du haut arrive ici avec ?nouveau=1 : on ouvre le formulaire, puis on retire le paramètre.
    if (params.get('nouveau') && this.canCreate) {
      void this.router.navigate([], { queryParams: { nouveau: null }, queryParamsHandling: 'merge', replaceUrl: true });
      this.nouveau();
    }
    this.filters.controls.q.valueChanges.pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recharger());
    this.filters.controls.statut.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recharger());
    for (const champ of [this.filters.controls.responsableId, this.filters.controls.depuis, this.filters.controls.jusqua]) {
      champ.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.recharger();
        this.rafraichirSynthese();
      });
    }
    this.filters.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.saisies.update((n) => n + 1));
  }

  private recharger(): void {
    this.page.set(1);
    this.charger();
  }

  /** Les filtres de personne et de période valent aussi pour le tableau de bord et l'alerte ; la recherche et le statut, non. */
  private filtresSynthese(): FiltresProtocoles {
    const valeurs = this.filters.getRawValue();
    return { responsableId: valeurs.responsableId || undefined, depuis: valeurs.depuis || undefined, jusqua: valeurs.jusqua || undefined };
  }

  protected rafraichirSynthese(): void {
    const filtres = this.filtresSynthese();
    this.api.tableau(filtres).subscribe({ next: (tableau) => this.tableau.set(tableau), error: () => this.tableau.set(null) });
    this.api.alertes(filtres).subscribe({ next: (alertes) => this.alertes.set(alertes), error: () => this.alertes.set([]) });
  }

  protected charger(): void {
    if (!this.chargementInitialFait) this.chargement.set(true);
    const valeurs = this.filters.getRawValue();
    this.api
      .lister({ q: valeurs.q || undefined, statut: valeurs.statut || undefined, ...this.filtresSynthese(), filtre: this.filtre(), page: this.page(), pageSize: this.pageSize() })
      .subscribe({
        next: (reponse) => {
          this.protocoles.set(reponse.items);
          this.total.set(reponse.total);
          this.erreur.set(false);
          this.finChargement();
        },
        error: () => {
          this.protocoles.set([]);
          this.total.set(0);
          this.erreur.set(true);
          this.finChargement();
        },
      });
  }

  private finChargement(): void {
    this.chargement.set(false);
    this.chargementInitialFait = true;
  }

  /** Un indicateur ouvre la liste qui le compose. */
  protected appliquerIndicateur(indicateur: Indicateur): void {
    this.filters.reset({ q: '', statut: indicateur.filtre.statut ?? '', responsableId: this.filters.controls.responsableId.value, depuis: this.filters.controls.depuis.value, jusqua: this.filters.controls.jusqua.value }, { emitEvent: false });
    this.saisies.update((n) => n + 1);
    this.filtre.set(indicateur.filtre.filtre ?? '');
    void this.router.navigate([], { queryParams: indicateur.filtre.filtre ? { filtre: indicateur.filtre.filtre } : {}, replaceUrl: true });
    this.recharger();
  }

  protected effacerFiltres(): void {
    this.filters.reset({ q: '', statut: '', responsableId: '', depuis: '', jusqua: '' }, { emitEvent: false });
    this.saisies.update((n) => n + 1);
    this.filtre.set('');
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.recharger();
    this.rafraichirSynthese();
  }

  protected changerTaille(taille: number): void {
    this.pageSize.set(taille);
    this.recharger();
  }

  protected changerPage(page: number): void {
    this.page.set(page);
    this.charger();
  }

  protected ouvrir(id: string): void {
    const data: ProtocoleDetailDialogData = { id };
    this.dialog
      .open(ProtocoleDetailDialog, { data, width: '760px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .subscribe((modifie: boolean | undefined) => {
        if (modifie) {
          this.charger();
          this.rafraichirSynthese();
        }
      });
  }

  protected nouveau(dossierVenteId?: string): void {
    this.dialog
      .open(ProtocoleNouveauDialog, { data: { dossierVenteId: dossierVenteId ?? null }, width: '560px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .subscribe((id: string | undefined) => {
        if (!id) return;
        this.notifications.success('Protocole créé');
        this.charger();
        this.rafraichirSynthese();
        this.ouvrir(id);
      });
  }

  /** Exporte toute la liste filtrée (pas seulement la page affichée) en Excel ou en PDF, avec justification. */
  protected exporter(): void {
    if (this.exportEnCours()) return;
    this.exportEnCours.set(true);
    const valeurs = this.filters.getRawValue();
    chargerToutesLesPages<Protocole>(
      (page, taille) =>
        this.api.lister({ q: valeurs.q || undefined, statut: valeurs.statut || undefined, ...this.filtresSynthese(), filtre: this.filtre(), page, pageSize: taille }),
      100,
    ).subscribe({
      next: (lignes) => {
        this.exportEnCours.set(false);
        ExportListeDialog.open(
          this.dialog,
          sourceDepuisLignes<Protocole>(
            { module: 'protocoles', titre: 'Protocoles et signatures' },
            [
              { libelle: 'Dossier', valeur: (p) => p.dossier.reference },
              { libelle: 'Client', valeur: (p) => p.dossier.client },
              { libelle: 'Bien', valeur: (p) => p.dossier.bien },
              { libelle: 'Responsable', valeur: (p) => p.dossier.responsable },
              { libelle: 'Protocole', valeur: (p) => p.titre ?? this.libelleType(p.type) },
              { libelle: 'Statut', valeur: (p) => p.libelleStatut + (p.enRetard ? ' (en retard)' : '') },
              { libelle: 'Envoyé le', type: 'date', valeur: (p) => isoJour(p.dateEnvoi) },
              { libelle: 'Signature reçue le', type: 'date', valeur: (p) => isoJour(p.dateReceptionSignee) },
              { libelle: 'Montant convenu', type: 'montant', valeur: (p) => p.dossier.montantConvenu },
              { libelle: 'Montant encaissé', type: 'montant', valeur: (p) => p.dossier.montantEncaisse },
              { libelle: 'Solde restant', type: 'montant', valeur: (p) => p.dossier.soldeRestant },
            ],
            lignes,
          ),
        ).subscribe();
      },
      error: (error: unknown) => {
        this.exportEnCours.set(false);
        this.notifications.error(error, 'L’export n’a pas pu être préparé');
      },
    });
  }

  protected ton(statut: string): string {
    if (['signe_client', 'signe_mtm', 'valide'].includes(statut)) return 'status-pill--success';
    if (['a_corriger', 'annule'].includes(statut)) return 'status-pill--danger';
    if (['envoye', 'en_attente_signature', 'a_valider_direction'].includes(statut)) return 'status-pill--warning';
    return '';
  }

  protected libelleType(type: string): string {
    return { protocole_accord: 'Protocole d’accord', contrat: 'Contrat', autre: 'Autre document' }[type] ?? type;
  }
}
