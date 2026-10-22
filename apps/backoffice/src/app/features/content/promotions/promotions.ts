import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideEye, LucideEyeOff, LucideMegaphone, LucidePencil, LucidePlus, LucideTrash2, LucideVideo } from '@lucide/angular';
import { PromotionsApiService, type Promotion } from '../../../core/services/api/promotions-api.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { PromotionDialog } from './promotion-dialog';
import { STATUTS_DIFFUSION, periodeDiffusion } from './promotion-status';
import { ConfirmService } from '../../../shared/dialogs/confirm-dialog';

/**
 * Publicités et promotions du bandeau d'accueil. Tant qu'au moins une est en
 * ligne, elle remplace la vidéo habituelle du bandeau ; sans aucune, la vidéo
 * revient d'elle-même. Une diffusion peut être programmée (début et fin).
 */
@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [MatButtonModule, MatTooltipModule, LucideEye, LucideEyeOff, LucideMegaphone, LucidePencil, LucidePlus, LucideTrash2, LucideVideo],
  templateUrl: './promotions.html',
  styleUrl: './promotions.scss',
})
export class Promotions implements OnInit {
  private readonly confirmer = inject(ConfirmService);
  private readonly api = inject(PromotionsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canCreate = this.session.hasPermission('content:creer');
  protected readonly canModify = this.session.hasPermission('content:modifier');
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly canDelete = this.session.hasPermission('content:supprimer');

  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly items = signal<Promotion[]>([]);

  protected readonly enLigne = computed(() => this.items().filter((promotion) => promotion.statut === 'en_ligne'));

  protected readonly statuts = STATUTS_DIFFUSION;
  protected readonly periode = periodeDiffusion;

  ngOnInit(): void {
    this.load();
  }

  protected openEditor(existing?: Promotion): void {
    const nextOrder = this.items().reduce((max, promotion) => Math.max(max, promotion.ordre + 1), 1);
    PromotionDialog.open(this.dialog, { existing: existing ?? null, nextOrder }).subscribe((saved) => saved && this.load());
  }

  protected togglePublish(promotion: Promotion): void {
    if (!this.canPublish) return;
    this.busyId.set(promotion.id);
    this.api.publish(promotion.id, !promotion.isActive).subscribe({
      next: () => {
        this.notify.success(promotion.isActive ? 'Retirée du bandeau' : 'Publiée sur le bandeau');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de changer la publication');
      },
    });
  }

  protected remove(promotion: Promotion): void {
    if (!this.canDelete) return;
    this.confirmer.ask(`Supprimer « ${promotion.titre} » ? L’image ou la vidéo sera perdue.`).subscribe((confirme) => {
      if (!confirme) return;
      this.busyId.set(promotion.id);
      this.api.remove(promotion.id).subscribe({
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
        this.notify.error(error, 'Erreur lors du chargement des publicités');
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
