import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LucidePlus } from '@lucide/angular';
import { type Tache, TachesApiService } from '../../../core/services/api/taches-api.service';
import type { TypeDossier } from '../../../core/services/api/messages-api.service';
import { SessionService } from '../../../core/services/session.service';
import { EvenementDialog } from '../../../features/agenda/evenement-dialog';
import { TacheDetailDialog } from '../../../features/taches/tache-detail-dialog';
import { TacheDialog } from '../../../features/taches/tache-dialog';
import {
  PRIORITES,
  STATUTS,
  echeanceDite,
  libelle,
  nomPersonne,
  pastille,
} from '../../../features/taches/taches-status';
import { NotificationService } from '../../services/notification.service';

/**
 * Tâches d'un dossier, sur sa fiche : ce qui reste à faire, par qui, pour quand
 * — avec un raccourci pour confier une tâche ou planifier un rendez-vous
 * directement rattachés au dossier.
 */
@Component({
  selector: 'app-taches-dossier',
  standalone: true,
  imports: [MatButtonModule, LucidePlus],
  templateUrl: './taches-dossier.html',
  styleUrl: './taches-dossier.scss',
})
export class TachesDossier implements OnInit {
  private readonly api = inject(TachesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  readonly type = input.required<TypeDossier>();
  readonly dossierId = input.required<string>();
  /** Référence affichée dans les listes et les notifications (ex. DV-1234). */
  readonly libelleDossier = input.required<string>();

  protected readonly peutVoir = this.session.hasPermission('taches:consulter');
  protected readonly peutCreer = this.session.hasPermission('taches:creer');
  protected readonly peutPlanifier = this.session.hasPermission('agenda:creer');

  protected readonly taches = signal<Tache[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    if (this.peutVoir) this.charger();
    else this.loading.set(false);
  }

  protected nouvelle(): void {
    TacheDialog.open(this.dialog, {
      dossier: { type: this.type(), id: this.dossierId(), label: this.libelleDossier() },
    }).subscribe((resultat) => resultat && this.charger());
  }

  protected planifier(): void {
    EvenementDialog.open(this.dialog, {
      dossier: { type: this.type(), id: this.dossierId(), label: this.libelleDossier() },
    }).subscribe();
  }

  protected ouvrir(tache: Tache): void {
    TacheDetailDialog.open(this.dialog, { id: tache.id }).subscribe((modifie) => modifie && this.charger());
  }

  protected terminer(tache: Tache): void {
    this.api.update(tache.id, { statut: 'terminee' }).subscribe({
      next: () => {
        this.notify.success('Tâche terminée');
        this.charger();
      },
      error: (error: unknown) => this.notify.error(error, 'Changement impossible'),
    });
  }

  protected ouverte(tache: Tache): boolean {
    return tache.statut === 'a_faire' || tache.statut === 'en_cours';
  }

  protected libellePriorite = (code: string) => libelle(PRIORITES, code);
  protected pastillePriorite = (code: string) => pastille(PRIORITES, code);
  protected libelleStatut = (code: string) => libelle(STATUTS, code);
  protected echeance = (valeur: string | null) => echeanceDite(valeur);
  protected nom = nomPersonne;

  private charger(): void {
    this.api
      .list({
        entityType: this.type(),
        entityId: this.dossierId(),
        statut: '',
        pageSize: 30,
      })
      .subscribe({
        next: (page) => {
          this.taches.set(page.items);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.notify.error(error, 'Impossible de charger les tâches du dossier');
        },
      });
  }
}
