import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArrowLeft,
  LucideChevronDown,
  LucideFileText,
  LucideNotebookPen,
  LucidePlus,
} from '@lucide/angular';
import { ConstructionApiService } from '../../../core/services/api/construction-api.service';
import { SessionService } from '../../../core/services/session.service';
import type {
  ChantierDetail as Chantier,
  ChantierOptions,
  DepenseChantier,
  EntreeJournal,
  IntervenantChantier,
  JalonChantier,
  LigneBudget,
} from '../../../core/models/chantier.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { JustificationDialog } from '../../../shared/dialogs/justification-dialog';
import { StatusChoiceDialog } from '../../../shared/dialogs/status-choice-dialog';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  METIERS,
  METEOS,
  POSTES_BUDGET,
  SITUATIONS_ALERTE,
  STATUTS_CHANTIER,
  STATUTS_DEPENSE,
  STATUTS_INTERVENANT,
  STATUTS_JALON,
  TYPES_DOCUMENT,
  TYPES_PROJET,
  help,
  label,
  montant,
  nomPersonne,
  pillClass,
  statusChoices,
} from '../chantier-status';
import { JalonDialog } from './jalon-dialog';
import { JourneeDialog } from './journee-dialog';
import { PrestataireDialog } from './prestataire-dialog';
import { DepenseDialog } from './depense-dialog';
import { LigneBudgetDialog } from './ligne-budget-dialog';

/** Nombre de journées affichées avant de devoir déplier le journal. */
const JOURNEES_VISIBLES = 6;

/** Nombre de pièces affichées avant dépliage. */
const PIECES_VISIBLES = 4;

/**
 * Fiche d'un chantier (J2.3, section 16 CDC).
 *
 * Hiérarchie plutôt que découpage, comme la fiche d'un bien locatif : une
 * colonne principale pour ce qui se pilote au quotidien — le planning, le
 * journal, les dépenses — et une colonne latérale pour ce qu'on consulte sans
 * agir : budget par poste, prestataires, pièces. Le programme et l'historique
 * restent repliés en bas.
 */
@Component({
  selector: 'app-chantier-detail',
  imports: [
    MoneyPipe,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucideChevronDown,
    LucideFileText,
    LucideNotebookPen,
    LucidePlus,
  ],
  templateUrl: './chantier-detail.html',
  styleUrl: './chantier-detail.scss',
})
export class ChantierDetailPage implements OnInit {
  private readonly api = inject(ConstructionApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly sessionService = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  private chantierId = '';

  protected readonly loading = signal(true);
  protected readonly chantier = signal<Chantier | null>(null);
  protected readonly journal = signal<EntreeJournal[]>([]);
  protected readonly journalTotal = signal(0);
  protected readonly options = signal<Partial<ChantierOptions>>({});

  /** Dépliages : on montre peu par défaut, tout à la demande. */
  protected readonly journalComplet = signal(false);
  protected readonly piecesToutes = signal(false);
  protected readonly problemesSeuls = signal(false);

  protected readonly canModify = computed(() =>
    this.sessionService.hasPermission('construction:modifier'),
  );
  protected readonly canPay = computed(() =>
    this.sessionService.hasPermission('construction:payer'),
  );
  protected readonly canPublish = computed(() =>
    this.sessionService.hasPermission('construction:publier'),
  );

  protected readonly synthese = computed(() => this.chantier()?.synthese ?? null);

  /**
   * Le planning en barres : chaque jalon est positionné sur la durée totale du
   * chantier. C'est la « vue de type Gantt » de la section 16, obtenue sans
   * dépendance supplémentaire — deux pourcentages suffisent.
   */
  protected readonly gantt = computed(() => {
    const jalons = this.chantier()?.jalons ?? [];
    const bornes = this.bornesPlanning(jalons);
    if (!bornes) return [];

    const duree = bornes.fin - bornes.debut;
    return jalons.map((jalon) => {
      const debut = this.date(jalon.dateDebutReelle ?? jalon.dateDebutPrevue);
      const fin = this.date(jalon.dateFinReelle ?? jalon.dateFinPrevue);
      // Un jalon sans date ne se place nulle part : on le rend sans barre
      // plutôt que de l'étaler sur tout le chantier.
      if (debut === null || fin === null) {
        return { jalon, place: false, offset: 0, largeur: 0 };
      }
      const offset = ((debut - bornes.debut) / duree) * 100;
      const largeur = Math.max(2, ((fin - debut) / duree) * 100);
      return {
        jalon,
        place: true,
        offset: Math.max(0, Math.min(98, offset)),
        largeur: Math.min(100 - Math.max(0, offset), largeur),
      };
    });
  });

  /**
   * Repères de mois sur la frise. Sans eux, les barres flottent sans
   * échelle : on voit qu'une étape est plus longue qu'une autre, pas
   * quand elle tombe.
   */
  protected readonly reperesGantt = computed(() => {
    const bornes = this.bornesPlanning(this.chantier()?.jalons ?? []);
    if (!bornes) return [];
    const duree = bornes.fin - bornes.debut;
    const reperes: { label: string; offset: number }[] = [];
    const curseur = new Date(bornes.debut);
    curseur.setDate(1);
    curseur.setHours(0, 0, 0, 0);
    curseur.setMonth(curseur.getMonth() + 1);
    // Au-delà de deux ans de chantier, un repère par mois devient
    // illisible : on passe au trimestre.
    const pas = duree > 730 * 86_400_000 ? 3 : 1;
    while (curseur.getTime() < bornes.fin && reperes.length < 40) {
      reperes.push({
        label: curseur.toLocaleDateString('fr-FR', {
          month: 'short',
          ...(curseur.getMonth() === 0 ? { year: '2-digit' as const } : {}),
        }),
        offset: ((curseur.getTime() - bornes.debut) / duree) * 100,
      });
      curseur.setMonth(curseur.getMonth() + pas);
    }
    return reperes;
  });

  /**
   * L'étape sur laquelle les équipes travaillent en ce moment. C'est la
   * première chose qu'un conducteur de travaux cherche en ouvrant la
   * fiche — avant tout chiffre.
   */
  protected readonly etapeEnCours = computed(() => {
    const jalons = this.chantier()?.jalons ?? [];
    return (
      jalons.find((jalon) => jalon.statut === 'bloque') ??
      jalons.find((jalon) => jalon.statut === 'en_cours') ??
      null
    );
  });

  /** Étape non terminée dont l'échéance tombe le plus tôt. */
  protected readonly prochaineEcheance = computed(() => {
    const jalons = (this.chantier()?.jalons ?? []).filter(
      (jalon) =>
        jalon.statut !== 'termine' &&
        jalon.statut !== 'annule' &&
        jalon.dateFinPrevue,
    );
    if (!jalons.length) return null;
    return jalons.reduce((plusTot, jalon) =>
      new Date(jalon.dateFinPrevue as string) <
      new Date(plusTot.dateFinPrevue as string)
        ? jalon
        : plusTot,
    );
  });

  /** Position d'aujourd'hui sur la frise, pour situer le chantier d'un coup d'œil. */
  protected readonly positionAujourdhui = computed(() => {
    const bornes = this.bornesPlanning(this.chantier()?.jalons ?? []);
    if (!bornes) return null;
    const part =
      ((Date.now() - bornes.debut) / (bornes.fin - bornes.debut)) * 100;
    return part >= 0 && part <= 100 ? part : null;
  });

  protected readonly journalAffiche = computed(() => {
    const entrees = this.problemesSeuls()
      ? this.journal().filter((entree) => !entree.resolu)
      : this.journal();
    return this.journalComplet()
      ? entrees
      : entrees.slice(0, JOURNEES_VISIBLES);
  });

  protected readonly journalMasque = computed(() => {
    const total = this.problemesSeuls()
      ? this.journal().filter((entree) => !entree.resolu).length
      : this.journal().length;
    return Math.max(0, total - this.journalAffiche().length);
  });

  protected readonly problemesOuverts = computed(
    () => this.journal().filter((entree) => !entree.resolu).length,
  );

  /** Dépenses en attente : ce que la comptabilité doit trancher. */
  protected readonly depensesAValider = computed(
    () =>
      this.chantier()?.depenses.filter(
        (depense) => depense.statut === 'en_attente',
      ) ?? [],
  );

  protected readonly depensesAffichees = computed(() => {
    const depenses = this.chantier()?.depenses ?? [];
    // Tout ce qui attend un contrôle, puis les dernières validées : une
    // dépense soldée il y a trois mois n'appelle aucune action.
    const enAttente = depenses.filter((d) => d.statut === 'en_attente');
    const reste = depenses.filter((d) => d.statut !== 'en_attente').slice(0, 8);
    return [...enAttente, ...reste];
  });

  protected readonly piecesAffichees = computed(() => {
    const documents = this.chantier()?.documents ?? [];
    return this.piecesToutes() ? documents : documents.slice(0, PIECES_VISIBLES);
  });

  protected readonly piecesMasquees = computed(() =>
    Math.max(0, (this.chantier()?.documents.length ?? 0) - PIECES_VISIBLES),
  );

  ngOnInit(): void {
    this.chantierId = this.route.snapshot.paramMap.get('id') ?? '';
    this.api
      .getOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => this.options.set(options),
        error: () => this.options.set({}),
      });
    this.charger();
  }

  protected charger(): void {
    if (!this.chantierId) return;
    this.loading.set(true);
    this.api
      .findOne(this.chantierId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chantier) => {
          this.chantier.set(chantier);
          this.loading.set(false);
        },
        error: () => {
          this.notify.error('Chantier introuvable');
          this.loading.set(false);
        },
      });
    this.chargerJournal();
  }

  private chargerJournal(): void {
    this.api
      .getJournal(this.chantierId, { pageSize: 60 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.journal.set(page.items);
          this.journalTotal.set(page.total);
        },
        error: () => this.journal.set([]),
      });
  }

  // --- Actions : journal ---

  protected saisirJournee(entree?: EntreeJournal): void {
    JourneeDialog.open(this.dialog, {
      jalons: this.chantier()?.jalons ?? [],
      meteos: this.options().meteos ?? [],
      entree,
    }).subscribe((payload) => {
      if (!payload) return;
      const requete = entree
        ? this.api.updateEntree(this.chantierId, entree.id, payload)
        : this.api.createEntree(this.chantierId, payload);
      requete.subscribe({
        next: () => {
          this.notify.success(
            entree ? 'Journée mise à jour' : 'Journée ajoutée au journal',
          );
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Enregistrement impossible'),
      });
    });
  }

  protected supprimerJournee(entree: EntreeJournal): void {
    const quand = this.dateCourte(entree.date);
    if (
      !confirm(
        `Supprimer la journée du ${quand} ? L’avancement du chantier sera recalculé.`,
      )
    ) {
      return;
    }
    this.api.removeEntree(this.chantierId, entree.id).subscribe({
      next: () => {
        this.notify.success('Journée supprimée');
        this.charger();
      },
      error: (error: unknown) =>
        this.notify.error(error, 'Suppression impossible'),
    });
  }

  protected basculerProblemes(): void {
    this.problemesSeuls.update((actif) => !actif);
    this.journalComplet.set(false);
  }

  // --- Actions : planning ---

  protected ajouterJalon(): void {
    JalonDialog.open(this.dialog, {
      statuts: this.options().statutsJalon ?? [],
    }).subscribe((payload) => {
      if (!payload) return;
      this.api.createJalon(this.chantierId, payload).subscribe({
        next: () => {
          this.notify.success('Étape ajoutée au planning');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Ajout impossible'),
      });
    });
  }

  protected modifierJalon(jalon: JalonChantier): void {
    JalonDialog.open(this.dialog, {
      statuts: this.options().statutsJalon ?? [],
      jalon,
    }).subscribe((payload) => {
      if (!payload) return;
      this.api.updateJalon(this.chantierId, jalon.id, payload).subscribe({
        next: () => {
          this.notify.success('Étape mise à jour');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Modification impossible'),
      });
    });
  }

  /** Raccourci du planning : solder une étape sans ouvrir la boîte complète. */
  protected terminerJalon(jalon: JalonChantier): void {
    this.api
      .updateJalon(this.chantierId, jalon.id, { statut: 'termine' })
      .subscribe({
        next: () => {
          this.notify.success(`${jalon.libelle} : étape terminée`);
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Modification impossible'),
      });
  }

  protected supprimerJalon(jalon: JalonChantier): void {
    // Retirer efface l'étape ; « annulée » la conserve dans l'historique
    // sans qu'elle compte dans l'avancement. On le dit plutôt que de
    // laisser choisir à l'aveugle.
    if (
      !confirm(
        `Retirer « ${jalon.libelle} » du planning ? Pour la conserver dans l’historique, passez-la plutôt en « annulée ».`,
      )
    ) {
      return;
    }
    this.api.removeJalon(this.chantierId, jalon.id).subscribe({
      next: () => {
        this.notify.success('Étape retirée');
        this.charger();
      },
      error: (error: unknown) =>
        this.notify.error(error, 'Suppression impossible'),
    });
  }

  // --- Actions : prestataires ---

  protected ajouterPrestataire(): void {
    PrestataireDialog.open(this.dialog, {
      metiers: this.options().metiers ?? [],
      statuts: this.options().statutsIntervenant ?? [],
    }).subscribe((payload) => {
      if (!payload) return;
      this.api.createIntervenant(this.chantierId, payload).subscribe({
        next: () => {
          this.notify.success('Prestataire ajouté');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Ajout impossible'),
      });
    });
  }

  protected modifierPrestataire(intervenant: IntervenantChantier): void {
    PrestataireDialog.open(this.dialog, {
      metiers: this.options().metiers ?? [],
      statuts: this.options().statutsIntervenant ?? [],
      intervenant,
    }).subscribe((payload) => {
      if (!payload) return;
      this.api
        .updateIntervenant(this.chantierId, intervenant.id, payload)
        .subscribe({
          next: () => {
            this.notify.success('Prestataire mis à jour');
            this.charger();
          },
          error: (error: unknown) => this.notify.error(error, 'Modification impossible'),
        });
    });
  }

  // --- Actions : budget et dépenses ---

  protected ajouterLigneBudget(): void {
    LigneBudgetDialog.open(this.dialog, {
      postes: this.options().postesBudget ?? [],
      unites: this.options().unites ?? [],
    }).subscribe((payload) => {
      if (!payload) return;
      this.api.createLigne(this.chantierId, payload).subscribe({
        next: () => {
          this.notify.success('Poste ajouté au budget');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Ajout impossible'),
      });
    });
  }

  protected modifierLigneBudget(ligne: LigneBudget): void {
    LigneBudgetDialog.open(this.dialog, {
      postes: this.options().postesBudget ?? [],
      unites: this.options().unites ?? [],
      ligne,
    }).subscribe((payload) => {
      if (!payload) return;
      this.api.updateLigne(this.chantierId, ligne.id, payload).subscribe({
        next: () => {
          this.notify.success('Poste mis à jour');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Modification impossible'),
      });
    });
  }

  protected saisirDepense(): void {
    DepenseDialog.open(this.dialog, {
      postes: this.options().postesBudget ?? [],
      modesPaiement: this.options().modesPaiement ?? [],
      lignes: this.chantier()?.lignesBudget ?? [],
      intervenants: this.chantier()?.intervenants ?? [],
    }).subscribe((payload) => {
      if (!payload) return;
      this.api.createDepense(this.chantierId, payload).subscribe({
        next: () => {
          this.notify.success('Dépense enregistrée, en attente de contrôle');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Enregistrement impossible'),
      });
    });
  }

  protected validerDepense(depense: DepenseChantier): void {
    this.api.validerDepense(this.chantierId, depense.id).subscribe({
      next: () => {
        this.notify.success('Dépense validée');
        this.charger();
      },
      error: (error: unknown) => this.notify.error(error, 'Validation impossible'),
    });
  }

  protected rejeterDepense(depense: DepenseChantier): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Rejeter cette dépense',
      description: `« ${depense.libelle} » sera renvoyée au chantier. Indiquez ce qui doit être corrigé.`,
      confirmLabel: 'Rejeter',
    }).subscribe((motif) => {
      if (!motif) return;
      this.api.rejeterDepense(this.chantierId, depense.id, motif).subscribe({
        next: () => {
          this.notify.success('Dépense rejetée');
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Rejet impossible'),
      });
    });
  }

  // --- Actions : statut et rapport ---

  protected changerStatut(): void {
    const chantier = this.chantier();
    if (!chantier) return;
    StatusChoiceDialog.open(this.dialog, {
      title: 'Faire avancer le chantier',
      intro:
        'La réception exige que toutes les étapes du planning soient terminées ou annulées, et relève de la validation.',
      subject: `${chantier.referenceInterne} — ${chantier.intitule}`,
      current: chantier.statut,
      choices: statusChoices(STATUTS_CHANTIER, this.options().statuts ?? []),
    }).subscribe((resultat) => {
      if (!resultat || resultat.value === chantier.statut) return;
      this.api
        .transition(this.chantierId, resultat.value, resultat.justification)
        .subscribe({
          next: () => {
            this.notify.success(
              `Chantier ${this.statutLabel(resultat.value).toLowerCase()}`,
            );
            this.charger();
          },
          error: (error: unknown) =>
            this.notify.error(error, 'Changement impossible'),
        });
    });
  }

  protected genererRapport(): void {
    this.api.genererRapport(this.chantierId).subscribe({
      next: (document) => {
        this.notify.success('Rapport d’avancement généré et publié');
        window.open(document.secureUrl, '_blank', 'noopener');
        this.charger();
      },
      error: (error: unknown) => this.notify.error(error, 'Génération impossible'),
    });
  }

  protected basculerVisibilite(documentId: string, visible: boolean): void {
    this.api
      .setVisibiliteDocument(this.chantierId, documentId, visible)
      .subscribe({
        next: () => {
          this.notify.success(
            visible ? 'Pièce publiée au client' : 'Pièce retirée de l’espace client',
          );
          this.charger();
        },
        error: (error: unknown) => this.notify.error(error, 'Modification impossible'),
      });
  }

  protected retour(): void {
    void this.router.navigate(['/construction/chantiers']);
  }

  // --- Libellés et mises en forme utilisés par le gabarit ---

  protected statutLabel(code: string): string {
    return label(STATUTS_CHANTIER, code);
  }

  protected statutPill(code: string): string {
    return pillClass(STATUTS_CHANTIER, code);
  }

  protected alerteLabel(code: string): string {
    return label(SITUATIONS_ALERTE, code);
  }

  protected alertePill(code: string): string {
    return pillClass(SITUATIONS_ALERTE, code);
  }

  protected alerteHelp(code: string): string {
    return help(SITUATIONS_ALERTE, code);
  }

  protected typeLabel(code: string): string {
    return label(TYPES_PROJET, code);
  }

  protected jalonLabel(code: string): string {
    return label(STATUTS_JALON, code);
  }

  protected jalonPill(code: string): string {
    return pillClass(STATUTS_JALON, code);
  }

  protected metierLabel(code: string): string {
    return label(METIERS, code);
  }

  protected prestatairePill(code: string): string {
    return pillClass(STATUTS_INTERVENANT, code);
  }

  protected prestataireLabel(code: string): string {
    return label(STATUTS_INTERVENANT, code);
  }

  protected posteLabel(code: string): string {
    return label(POSTES_BUDGET, code);
  }

  protected depenseLabel(code: string): string {
    return label(STATUTS_DEPENSE, code);
  }

  protected depensePill(code: string): string {
    return pillClass(STATUTS_DEPENSE, code);
  }

  protected meteoLabel(code: string | null): string {
    return code ? label(METEOS, code) : '';
  }

  protected documentLabel(code: string): string {
    return label(TYPES_DOCUMENT, code);
  }

  protected personne(
    valeur: { firstName: string | null; lastName: string | null } | null,
  ): string {
    return nomPersonne(valeur);
  }

  protected nombre(valeur: number | string | null | undefined): number {
    return montant(valeur);
  }

  /** Commune et région, précédées d'un séparateur seulement si elles existent. */
  protected localisation(chantier: Chantier): string {
    const lieu = [chantier.adresse, chantier.commune, chantier.region]
      .filter(Boolean)
      .join(', ');
    return lieu ? ` · ${lieu}` : '';
  }

  /**
   * Un délai se comprend mieux qu'une date : « dans 12 jours » plutôt que
   * « 15 novembre », qu'il faut comparer mentalement à aujourd'hui.
   */
  protected delai(valeur: string | null): string {
    if (!valeur) return '';
    const jours = Math.round(
      (new Date(valeur).setHours(0, 0, 0, 0) -
        new Date().setHours(0, 0, 0, 0)) /
        86_400_000,
    );
    if (jours === 0) return "aujourd'hui";
    if (jours === 1) return 'demain';
    if (jours === -1) return 'hier';
    if (jours > 0) return `dans ${jours} jours`;
    return `en retard de ${-jours} jours`;
  }

  /** Vrai quand l'échéance est passée : le gabarit la met en alerte. */
  protected estDepassee(valeur: string | null): boolean {
    if (!valeur) return false;
    return new Date(valeur).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  }

  protected dateCourte(valeur: string | null): string {
    if (!valeur) return '—';
    return new Date(valeur).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected dateJour(valeur: string | null): string {
    if (!valeur) return '—';
    return new Date(valeur).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
    });
  }

  /** Quantité et unité d'une ligne de budget, sans « null u » disgracieux. */
  protected quantiteLigne(ligne: LigneBudget): string {
    const quantite = montant(ligne.quantite);
    if (!quantite) return '';
    return `${quantite.toLocaleString('fr-FR')} ${ligne.unite ?? ''}`.trim();
  }

  /** Bornes du planning : la première date connue, la dernière. */
  private bornesPlanning(
    jalons: JalonChantier[],
  ): { debut: number; fin: number } | null {
    const dates: number[] = [];
    for (const jalon of jalons) {
      for (const valeur of [
        jalon.dateDebutPrevue,
        jalon.dateFinPrevue,
        jalon.dateDebutReelle,
        jalon.dateFinReelle,
      ]) {
        const instant = this.date(valeur);
        if (instant !== null) dates.push(instant);
      }
    }
    if (dates.length < 2) return null;
    const debut = Math.min(...dates);
    const fin = Math.max(...dates);
    // Un planning d'un seul jour ferait une division par zéro.
    return fin > debut ? { debut, fin } : null;
  }

  private date(valeur: string | null): number | null {
    if (!valeur) return null;
    const instant = new Date(valeur).getTime();
    return Number.isFinite(instant) ? instant : null;
  }
}
