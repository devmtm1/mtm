import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  LucideCalendarClock,
  LucideClipboardList,
  LucideDownload,
  LucidePackage,
  LucidePlus,
  LucideSearch,
  LucideShieldAlert,
  LucideTriangleAlert,
  LucideWrench,
  LucideX,
} from '@lucide/angular';
import { debounceTime } from 'rxjs/operators';
import {
  MaterielApiService,
  type EtatMateriel,
  type FiltreMateriel,
  type Materiel,
  type OptionsMateriel,
  type StatutMateriel,
  type TableauMateriel,
} from '../../core/services/api/materiel-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Pagination, TAILLE_PAGE_DEFAUT } from '../../shared/components/pagination/pagination';
import { ExportListeDialog } from '../../shared/dialogs/export-liste-dialog';
import {
  chargerToutesLesPages,
  isoJour,
  sourceDepuisLignes,
} from '../../shared/utils/export-lignes';

/** Ce que chaque indicateur du tableau de bord ouvre : un filtre de la liste. */
interface Indicateur {
  cle: string;
  libelle: string;
  detail: string;
  valeur: (tableau: TableauMateriel) => number;
  filtre: { filtre?: FiltreMateriel; etat?: EtatMateriel };
  icone: 'parc' | 'panne' | 'entretien' | 'garantie';
  ton: 'primary' | 'success' | 'warning' | 'attention';
}

const INDICATEURS: Indicateur[] = [
  {
    cle: 'parc',
    libelle: 'Au parc',
    detail: 'Objets en service',
    valeur: (t) => t.total,
    filtre: {},
    icone: 'parc',
    ton: 'primary',
  },
  {
    cle: 'panne',
    libelle: 'En panne',
    detail: 'À réparer ou à remplacer',
    valeur: (t) => t.enPanne,
    filtre: { etat: 'en_panne' },
    icone: 'panne',
    ton: 'attention',
  },
  {
    cle: 'entretien',
    libelle: 'Entretiens en retard',
    detail: 'Date prévue dépassée',
    valeur: (t) => t.entretiensEnRetard,
    filtre: { filtre: 'entretien_a_prevoir' },
    icone: 'entretien',
    ton: 'warning',
  },
  {
    cle: 'garantie',
    libelle: 'Garanties proches',
    detail: 'Se terminent dans le mois',
    valeur: (t) => t.garantiesProches,
    filtre: { filtre: 'garantie_proche' },
    icone: 'garantie',
    ton: 'warning',
  },
];

/**
 * Patrimoine matériel de MTM : le parc (chaque objet porte un autocollant « MTM 0003 »), son tableau de bord, la liste filtrable
 * et la fiche de chaque objet. L'inventaire par lieu a sa propre page.
 */
@Component({
  selector: 'app-materiel',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    Pagination,
    LucideCalendarClock,
    LucideClipboardList,
    LucideDownload,
    LucidePackage,
    LucidePlus,
    LucideSearch,
    LucideShieldAlert,
    LucideTriangleAlert,
    LucideWrench,
    LucideX,
  ],
  templateUrl: './materiel.html',
  styleUrl: './materiel.scss',
})
export class MaterielPage implements OnInit {
  private readonly api = inject(MaterielApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly indicateurs = INDICATEURS;
  protected readonly canCreate = this.session.hasPermission('materiel:creer');
  protected readonly canModify = this.session.hasPermission('materiel:modifier');
  protected readonly peutExporter = this.session.hasPermission('materiel:exporter');
  protected readonly exportEnCours = signal(false);

  protected readonly options = signal<OptionsMateriel | null>(null);
  protected readonly tableau = signal<TableauMateriel | null>(null);
  protected readonly materiels = signal<Materiel[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(TAILLE_PAGE_DEFAUT);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal(false);
  /** Filtre posé par un indicateur : il s'ajoute à la recherche et aux listes de choix. */
  protected readonly filtre = signal<FiltreMateriel | ''>('');

  protected readonly filters = this.formBuilder.nonNullable.group({
    q: '',
    categorie: '',
    statut: '' as StatutMateriel | '',
    etat: '' as EtatMateriel | '',
    lieu: '',
  });
  /** Compte les saisies : le formulaire n'est pas un signal, ce compteur relance le calcul de `filtreActif`. */
  private readonly saisies = signal(0);
  protected readonly filtreActif = computed(() => {
    this.saisies();
    return (
      this.filtre() !== '' ||
      Object.values(this.filters.getRawValue()).some((valeur) => valeur !== '')
    );
  });
  protected readonly libelleFiltre = computed(
    () => INDICATEURS.find((i) => i.filtre.filtre === this.filtre())?.libelle ?? '',
  );

  /** Le squelette ne s'affiche qu'au premier chargement : ensuite l'écran se met à jour en place. */
  private chargementInitialFait = false;

  ngOnInit(): void {
    this.api.options().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set(null),
    });
    this.rafraichirSynthese();
    this.charger();

    this.filters.controls.q.valueChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recharger());
    for (const champ of [
      this.filters.controls.categorie,
      this.filters.controls.statut,
      this.filters.controls.etat,
      this.filters.controls.lieu,
    ]) {
      champ.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.recharger());
    }
    this.filters.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.saisies.update((n) => n + 1));
  }

  private recharger(): void {
    this.page.set(1);
    this.charger();
  }

  protected rafraichirSynthese(): void {
    this.api.tableau().subscribe({
      next: (tableau) => this.tableau.set(tableau),
      error: () => this.tableau.set(null),
    });
  }

  private recherche() {
    const valeurs = this.filters.getRawValue();
    return {
      q: valeurs.q || undefined,
      categorie: valeurs.categorie || undefined,
      statut: valeurs.statut || undefined,
      etat: valeurs.etat || undefined,
      lieu: valeurs.lieu || undefined,
      filtre: this.filtre(),
    };
  }

  protected charger(): void {
    if (!this.chargementInitialFait) this.chargement.set(true);
    this.api
      .lister({ ...this.recherche(), page: this.page(), pageSize: this.pageSize() })
      .subscribe({
        next: (reponse) => {
          this.materiels.set(reponse.items);
          this.total.set(reponse.total);
          this.erreur.set(false);
          this.finChargement();
        },
        error: () => {
          this.materiels.set([]);
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
    this.filters.reset(
      { q: '', categorie: '', statut: '', etat: indicateur.filtre.etat ?? '', lieu: '' },
      { emitEvent: false },
    );
    this.saisies.update((n) => n + 1);
    this.filtre.set(indicateur.filtre.filtre ?? '');
    this.recharger();
  }

  protected effacerFiltres(): void {
    this.filters.reset(
      { q: '', categorie: '', statut: '', etat: '', lieu: '' },
      { emitEvent: false },
    );
    this.saisies.update((n) => n + 1);
    this.filtre.set('');
    this.recharger();
  }

  protected changerTaille(taille: number): void {
    this.pageSize.set(taille);
    this.recharger();
  }

  protected changerPage(page: number): void {
    this.page.set(page);
    this.charger();
  }

  /** Une ligne ouvre la fiche de l'objet, sur sa propre page. */
  protected ouvrir(id: string): void {
    void this.router.navigate(['/materiel', id]);
  }

  protected tonStatut(statut: string): string {
    if (statut === 'disponible') return 'status-pill--success';
    if (statut === 'en_maintenance') return 'status-pill--warning';
    if (statut === 'affecte') return 'status-pill--primary';
    return '';
  }

  /** Exporte toute la liste filtrée (pas seulement la page affichée) en Excel ou en PDF, avec justification. */
  protected exporter(): void {
    if (this.exportEnCours()) return;
    this.exportEnCours.set(true);
    const recherche = this.recherche();
    chargerToutesLesPages<Materiel>(
      (page, taille) => this.api.lister({ ...recherche, page, pageSize: taille }),
      100,
    ).subscribe({
      next: (lignes) => {
        this.exportEnCours.set(false);
        ExportListeDialog.open(
          this.dialog,
          sourceDepuisLignes<Materiel>(
            { module: 'materiel', titre: 'Patrimoine matériel' },
            [
              { libelle: 'Numéro', valeur: (m) => m.reference },
              { libelle: 'Désignation', valeur: (m) => m.designation },
              { libelle: 'Catégorie', valeur: (m) => m.categorie },
              { libelle: 'Marque', valeur: (m) => m.marque },
              { libelle: 'Modèle', valeur: (m) => m.modele },
              { libelle: 'N° de série', valeur: (m) => m.numeroSerie },
              { libelle: 'Lieu', valeur: (m) => m.lieu },
              { libelle: 'Confié à', valeur: (m) => m.affectation?.libelle ?? null },
              { libelle: 'État', valeur: (m) => m.libelleEtat },
              { libelle: 'Statut', valeur: (m) => m.libelleStatut },
              { libelle: 'Acheté le', type: 'date', valeur: (m) => isoJour(m.dateAchat) },
              { libelle: 'Prix d’achat', type: 'montant', valeur: (m) => m.prixAchat },
              {
                libelle: 'Garantie jusqu’au',
                type: 'date',
                valeur: (m) => isoJour(m.garantieJusqua),
              },
              {
                libelle: 'Prochain entretien',
                type: 'date',
                valeur: (m) => isoJour(m.prochainEntretien),
              },
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
}
