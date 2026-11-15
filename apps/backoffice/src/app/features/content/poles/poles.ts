import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideEye, LucideEyeOff, LucideImageOff, LucidePencil, LucidePlus, LucideTrash2, LucideUpload } from '@lucide/angular';
import { PolesApiService, type Pole } from '../../../core/services/api/poles-api.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmService } from '../../../shared/dialogs/confirm-dialog';
import { PoleEditorDialog } from './pole-editor-dialog';

/**
 * Pôles d'activité de MTM : la page « Nos services » et la section de l'accueil du site public. Chaque pôle a sa photo, sa
 * mention, ses prestations et son bouton ; il n'apparaît sur le site qu'une fois publié. L'en-tête de la page se règle dans
 * Contenus du site.
 */
@Component({
  selector: 'app-poles',
  standalone: true,
  imports: [MatButtonModule, MatTooltipModule, LucideEye, LucideEyeOff, LucideImageOff, LucidePencil, LucidePlus, LucideTrash2, LucideUpload],
  templateUrl: './poles.html',
  // Les cartes reprennent celles de la page Équipe : même gabarit, mêmes réglages.
  styleUrl: '../team/team.scss',
})
export class Poles implements OnInit {
  private readonly confirmer = inject(ConfirmService);
  private readonly api = inject(PolesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canCreate = this.session.hasPermission('content:creer');
  protected readonly canModify = this.session.hasPermission('content:modifier');
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly canDelete = this.session.hasPermission('content:supprimer');

  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly items = signal<Pole[]>([]);

  protected readonly unpublished = computed(() => this.items().filter((p) => !p.isActive));
  protected readonly withoutImage = computed(() => this.items().filter((p) => !p.imageUrl));

  ngOnInit(): void {
    this.load();
  }

  protected openEditor(existing?: Pole): void {
    const nextOrder = this.items().reduce((max, p) => Math.max(max, p.ordre + 1), 1);
    const autres = this.items()
      .filter((p) => p.id !== existing?.id)
      .map((p) => ({ slug: p.slug, nom: p.nom }));
    PoleEditorDialog.open(this.dialog, { existing: existing ?? null, nextOrder, autres }).subscribe((saved) => saved && this.load());
  }

  protected selectImage(event: Event, pole: Pole): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busyId.set(pole.id);
    this.api.uploadImage(pole.id, file).subscribe({
      next: () => {
        this.notify.success('Photo mise à jour');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible d’envoyer la photo (image JPG, PNG ou WebP attendue)');
      },
    });
  }

  protected togglePublish(pole: Pole): void {
    if (!this.canPublish) return;
    this.busyId.set(pole.id);
    this.api.publish(pole.id, !pole.isActive).subscribe({
      next: () => {
        this.notify.success(pole.isActive ? 'Retiré du site' : 'Publié sur le site');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de changer la publication');
      },
    });
  }

  protected remove(pole: Pole): void {
    if (!this.canDelete) return;
    this.confirmer.ask(`Supprimer le pôle « ${pole.nom} » du site ? Sa photo sera perdue.`).subscribe((confirme) => {
      if (!confirme) return;
      this.busyId.set(pole.id);
      this.api.remove(pole.id).subscribe({
        next: () => {
          this.notify.success('Pôle supprimé');
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
    if (!this.chargementInitialFait) this.loading.set(true);
    this.api.findAllAdmin().subscribe({
      next: (data) => {
        this.items.set(data);
        this.finChargement();
        this.busyId.set(null);
      },
      error: (error: unknown) => {
        this.finChargement();
        this.busyId.set(null);
        this.notify.error(error, 'Erreur lors du chargement des pôles');
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
