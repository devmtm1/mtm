import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideEye, LucideEyeOff, LucidePencil, LucidePlay, LucidePlus, LucideStar, LucideTrash2, LucideVideo } from '@lucide/angular';
import { PublicationsApiService, type Publication } from '../../../core/services/api/publications-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ConfirmService } from '../../../shared/dialogs/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';
import { PublicationDialog } from './publication-dialog';
import { PublicationLecteur } from './publication-lecteur';
import { STATUTS_PUBLICATION, datePublicationDite, formaterDuree, formaterTaille, libelleCategorie } from './publication-status';

/**
 * Vidéos de la page « Actualités et conseils » du site public : conseils et actualités du foncier,
 * de la construction… Chaque publication a sa vidéo, sa rubrique et sa date ; une date à venir
 * programme la mise en ligne, et une vidéo peut être mise à la une.
 */
@Component({
  selector: 'app-publications',
  standalone: true,
  imports: [MatButtonModule, MatTooltipModule, LucideEye, LucideEyeOff, LucidePencil, LucidePlay, LucidePlus, LucideStar, LucideTrash2, LucideVideo],
  templateUrl: './publications.html',
  styleUrl: './publications.scss',
})
export class Publications implements OnInit {
  private readonly confirmer = inject(ConfirmService);
  private readonly api = inject(PublicationsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canCreate = this.session.hasPermission('content:creer');
  protected readonly canModify = this.session.hasPermission('content:modifier');
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly canDelete = this.session.hasPermission('content:supprimer');

  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly items = signal<Publication[]>([]);

  protected readonly enLigne = computed(() => this.items().filter((publication) => publication.statut === 'en_ligne'));

  protected readonly statuts = STATUTS_PUBLICATION;
  protected readonly categorie = libelleCategorie;
  protected readonly duree = formaterDuree;
  protected readonly taille = formaterTaille;
  protected readonly dateDite = datePublicationDite;

  ngOnInit(): void {
    this.load();
  }

  protected openEditor(existing?: Publication): void {
    PublicationDialog.open(this.dialog, { existing: existing ?? null }).subscribe((saved) => saved && this.load());
  }

  protected regarder(publication: Publication): void {
    PublicationLecteur.open(this.dialog, publication);
  }

  protected togglePublish(publication: Publication): void {
    if (!this.canPublish) return;
    this.busyId.set(publication.id);
    this.api.publish(publication.id, !publication.isActive).subscribe({
      next: () => {
        this.notify.success(publication.isActive ? 'Retirée du site' : 'Publiée sur la page Actualités et conseils');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de changer la publication');
      },
    });
  }

  protected remove(publication: Publication): void {
    if (!this.canDelete) return;
    this.confirmer.ask(`Supprimer « ${publication.titre} » ? La vidéo sera perdue.`).subscribe((confirme) => {
      if (!confirme) return;
      this.busyId.set(publication.id);
      this.api.remove(publication.id).subscribe({
        next: () => {
          this.notify.success('Supprimée');
          this.load();
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.notify.error(error, 'Impossible de supprimer');
        },
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.findAllAdmin().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
        this.busyId.set(null);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.busyId.set(null);
        this.notify.error(error, 'Erreur lors du chargement des publications');
      },
    });
  }
}
