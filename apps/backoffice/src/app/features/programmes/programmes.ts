import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import {
  LucideChevronRight,
  LucideCircleCheck,
  LucideLandPlot,
  LucideLayoutGrid,
  LucidePlus,
  LucideSearch,
  LucideStar,
  LucideDownload,
} from '@lucide/angular';
import {
  type ProgrammeResume,
  ProgrammesApiService,
} from '../../core/services/api/programmes-api.service';
import { SessionService } from '../../core/services/session.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { NotificationService } from '../../shared/services/notification.service';
import { ProgrammeDialog } from './programme-dialog';
import { ExportListeDialog } from '../../shared/dialogs/export-liste-dialog';
import { sourceDepuisLignes } from '../../shared/utils/export-lignes';

/** Le taux de lots vendus, en pourcentage entier (0 quand le programme n'a pas encore de lots). */
export function tauxVendu(programme: Pick<ProgrammeResume, 'nombreLots' | 'lotsVendus'>): number {
  return programme.nombreLots ? Math.round((programme.lotsVendus / programme.nombreLots) * 100) : 0;
}

/** L'état commercial d'un programme en un mot : ce qu'il reste à faire ou où il en est. */
export function etat(
  p: Pick<ProgrammeResume, 'nombreLots' | 'lotsDisponibles' | 'lotsReserves' | 'lotsVendus'>,
): { libelle: string; ton: 'success' | 'warning' | 'primary' | 'info' | 'danger' } {
  if (p.nombreLots === 0) return { libelle: 'Sans lot', ton: 'info' };
  if (p.lotsVendus === p.nombreLots) return { libelle: 'Complet', ton: 'primary' };
  if (p.lotsDisponibles > 0) return { libelle: 'En vente', ton: 'success' };
  if (p.lotsReserves > 0) return { libelle: 'Tout réservé', ton: 'warning' };
  return { libelle: 'À publier', ton: 'info' };
}

/** Les deux premières lettres significatives du nom, pour le monogramme (« Cité des Jardins » → CJ). */
export function initiales(nom: string): string {
  const mots = nom.split(/\s+/).filter((m) => m.length > 3 || /^[A-ZÀ-Ý]/.test(m));
  return (mots.length > 1 ? mots[0][0] + mots[1][0] : (mots[0] ?? nom).slice(0, 2)).toUpperCase();
}

/** Les programmes de lotissement : un ensemble de lots vendus séparément, suivis d'un coup d'œil. */
@Component({
  selector: 'app-programmes',
  imports: [LucideDownload, 
    MatButtonModule,
    LucideChevronRight,
    LucideCircleCheck,
    LucideLandPlot,
    LucideLayoutGrid,
    LucidePlus,
    LucideSearch,
    LucideStar,
    MoneyPipe,
  ],
  templateUrl: './programmes.html',
  styleUrl: './programmes.scss',
})
export class Programmes implements OnInit {
  private readonly api = inject(ProgrammesApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  private readonly session = inject(SessionService);
  protected readonly peutExporterListe = computed(() => this.session.hasPermission('terrains:exporter'));
  protected readonly canCreate = this.session.hasPermission('terrains:creer');
  protected readonly canEdit = this.session.hasPermission('terrains:modifier');
  protected readonly programmes = signal<ProgrammeResume[] | null>(null);
  protected readonly tauxVendu = tauxVendu;
  protected readonly etat = etat;
  protected readonly initiales = initiales;
  /** Vrai : on consulte les programmes archivés (pour en restaurer un). */
  protected readonly archives = signal(false);
  protected readonly recherche = signal('');

  /** Les programmes qui correspondent à la recherche (nom, référence, lieu, propriétaire). */
  protected readonly visibles = computed(() => {
    const liste = this.programmes() ?? [];
    const terme = this.recherche().trim().toLowerCase();
    if (!terme) return liste;
    return liste.filter((p) =>
      [p.nom, p.reference, p.commune, p.region, p.proprietaire?.firstName, p.proprietaire?.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(terme),
    );
  });

  /** Les chiffres du stock de lots, tous programmes actifs confondus. */
  protected readonly totaux = computed(() => {
    const liste = this.programmes();
    if (!liste) return null;
    const somme = (cle: 'nombreLots' | 'lotsDisponibles' | 'lotsReserves' | 'lotsVendus') =>
      liste.reduce((total, p) => total + p[cle], 0);
    const lots = somme('nombreLots');
    const vendus = somme('lotsVendus');
    return {
      programmes: liste.length,
      lots,
      disponibles: somme('lotsDisponibles'),
      reserves: somme('lotsReserves'),
      vendus,
      tauxVendu: lots ? Math.round((vendus / lots) * 100) : 0,
    };
  });

  ngOnInit(): void {
    this.charger();
  }

  protected ouvrir(programme: ProgrammeResume): void {
    void this.router.navigate(['/programmes', programme.id]);
  }

  protected afficherArchives(archives: boolean): void {
    if (this.archives() === archives) return;
    this.archives.set(archives);
    this.programmes.set(null);
    this.charger();
  }

  protected restaurer(programme: ProgrammeResume): void {
    this.api.restaurer(programme.id).subscribe({
      next: () => {
        this.notifications.success(`« ${programme.nom} » est de nouveau dans la liste.`);
        this.charger();
      },
      error: (erreur) => this.notifications.error(erreur, 'Le programme n’a pas pu être restauré'),
    });
  }

  protected nouveau(): void {
    this.dialog
      .open<ProgrammeDialog, unknown, ProgrammeResume>(ProgrammeDialog, { width: '640px', maxWidth: '96vw' })
      .afterClosed()
      .subscribe((cree) => {
        // On arrive directement sur la fiche : c'est là qu'on génère les lots.
        if (cree) void this.router.navigate(['/programmes', cree.id]);
      });
  }

  private charger(): void {
    this.api.findAll(this.archives()).subscribe({
      next: (liste) => this.programmes.set(liste),
      error: (erreur) => {
        this.programmes.set([]);
        this.notifications.error(erreur, 'Les programmes n’ont pas pu être chargés');
      },
    });
  }

  /** Exporte les programmes affichés en Excel ou en PDF. */
  protected exporterListe(): void {
    ExportListeDialog.open(
      this.dialog,
      sourceDepuisLignes<ProgrammeResume>(
        { module: 'programmes', titre: this.archives() ? 'Programmes archivés' : 'Programmes de lotissement' },
        [
          { libelle: 'Référence', valeur: (p) => p.reference },
          { libelle: 'Programme', valeur: (p) => p.nom },
          { libelle: 'Commune', valeur: (p) => p.commune },
          { libelle: 'Région', valeur: (p) => p.region },
          { libelle: 'Statut juridique', valeur: (p) => p.statutJuridique },
          { libelle: 'Publié sur le site', valeur: (p) => (p.publie ? 'Oui' : 'Non') },
          { libelle: 'Lots', type: 'nombre', valeur: (p) => p.nombreLots },
          { libelle: 'Disponibles', type: 'nombre', valeur: (p) => p.lotsDisponibles },
          { libelle: 'Réservés', type: 'nombre', valeur: (p) => p.lotsReserves },
          { libelle: 'Vendus', type: 'nombre', valeur: (p) => p.lotsVendus },
          { libelle: 'Prix de base (FCFA)', type: 'montant', valeur: (p) => (p.prixLot === null ? null : Number(p.prixLot)) },
        ],
        this.visibles(),
      ),
    ).subscribe();
  }
}
