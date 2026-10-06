import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCheck,
  LucideExternalLink,
  LucideImagePlus,
  LucideCircle,
  LucideTrash2,
} from '@lucide/angular';
import { environment } from '../../../../environments/environment';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type { AnnoncePayload, BienDetail } from '../../../core/models/locatif.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { AnnonceDialog } from './annonce-dialog';

/** Mêmes types que l'API : au-delà, l'envoi serait refusé après coup. */
const TYPES_ACCEPTES = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';
const TAILLE_MAX = 10 * 1024 * 1024;

/**
 * Annonce d'un bien sur le site public : photos, description, loyer, et
 * publication. Un bien se prépare ici (photos, loyer) puis se publie ; il
 * reste visible sur le site tant qu'il est disponible, et disparaît dès qu'un
 * bail est créé.
 */
@Component({
  selector: 'app-bien-annonce',
  standalone: true,
  imports: [
    MatButtonModule,
    MatTooltipModule,
    MoneyPipe,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCheck,
    LucideCircle,
    LucideExternalLink,
    LucideImagePlus,
    LucideTrash2,
  ],
  templateUrl: './bien-annonce.html',
  styleUrl: './bien-annonce.scss',
})
export class BienAnnonceCard {
  private readonly api = inject(LocatifApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  readonly bien = input.required<BienDetail>();
  readonly canModify = input(false);
  readonly canPublish = input(false);
  /** Émis après toute modification : la fiche recharge le bien. */
  readonly changed = output<void>();

  protected readonly busy = signal(false);
  protected readonly accept = TYPES_ACCEPTES;

  protected readonly hasLoyer = computed(() => Number(this.bien().loyerMensuel ?? 0) > 0);
  protected readonly hasPhoto = computed(() => this.bien().medias.length > 0);
  /** Ce qui manque pour publier : affiché tel quel à l'utilisateur. */
  protected readonly manques = computed(() => {
    const manques: string[] = [];
    if (!this.hasLoyer()) manques.push('Renseigner le loyer mensuel');
    if (!this.hasPhoto()) manques.push('Ajouter au moins une photo');
    return manques;
  });
  protected readonly peutPublier = computed(() => this.manques().length === 0);
  protected readonly estLibre = computed(() => this.bien().statut === 'disponible');
  protected readonly urlPublique = computed(() => `${environment.publicWebUrl}/locations/${this.bien().id}`);

  /** Visible aujourd'hui sur le site ? Publié ET disponible. */
  protected readonly enLigne = computed(() => this.bien().publie && this.estLibre());

  protected statutLabel(): string {
    const bien = this.bien();
    if (!bien.publie) return 'Non publiée';
    return this.estLibre() ? 'En ligne sur le site' : 'Publiée, masquée (bien non disponible)';
  }

  protected statutClass(): string {
    if (this.enLigne()) return 'status-pill status-pill--success';
    return this.bien().publie ? 'status-pill status-pill--warning' : 'status-pill';
  }

  protected modifier(): void {
    AnnonceDialog.open(this.dialog, { bien: this.bien(), canPublish: this.canPublish() }).subscribe((payload) => {
      if (payload) this.enregistrer(payload, 'Annonce enregistrée');
    });
  }

  protected publier(publie: boolean): void {
    if (publie && !this.peutPublier()) {
      this.notify.info(`Pour publier : ${this.manques().join(', ').toLowerCase()}.`);
      return;
    }
    if (!publie && !confirm('Retirer cette annonce du site ? Les visiteurs ne la verront plus.')) return;
    this.enregistrer({ publie }, publie ? 'Annonce publiée sur le site' : 'Annonce retirée du site');
  }

  protected deposer(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichiers = Array.from(input.files ?? []);
    input.value = '';
    if (fichiers.length === 0) return;

    const trop = fichiers.filter((fichier) => fichier.size > TAILLE_MAX);
    if (trop.length > 0) {
      this.notify.info(`${trop.map((fichier) => fichier.name).join(', ')} : fichier de plus de 10 Mo, non envoyé.`);
    }
    const valides = fichiers.filter((fichier) => fichier.size <= TAILLE_MAX);
    if (valides.length === 0) return;

    this.busy.set(true);
    // Envois l'un après l'autre : l'ordre des photos est celui de la sélection,
    // et un échec ne perd pas les précédentes.
    const envoyer = (restants: File[], envoyes: number): void => {
      const [fichier, ...suite] = restants;
      if (!fichier) {
        this.busy.set(false);
        if (envoyes > 0) this.notify.success(`${envoyes} fichier${envoyes > 1 ? 's' : ''} ajouté${envoyes > 1 ? 's' : ''}`);
        this.changed.emit();
        return;
      }
      this.api.addBienMedia(this.bien().id, fichier).subscribe({
        next: () => envoyer(suite, envoyes + 1),
        error: (error: unknown) => {
          this.busy.set(false);
          this.notify.error(error, `Envoi de « ${fichier.name} » impossible`);
          if (envoyes > 0) this.changed.emit();
        },
      });
    };
    envoyer(valides, 0);
  }

  protected deplacer(index: number, delta: -1 | 1): void {
    const ids = this.bien().medias.map((media) => media.id);
    const cible = index + delta;
    if (cible < 0 || cible >= ids.length) return;
    [ids[index], ids[cible]] = [ids[cible], ids[index]];
    this.busy.set(true);
    this.api.reorderBienMedias(this.bien().id, ids).subscribe({
      next: () => {
        this.busy.set(false);
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'Réorganisation impossible');
      },
    });
  }

  protected supprimer(mediaId: string): void {
    if (!confirm('Supprimer cette photo ?')) return;
    this.busy.set(true);
    this.api.removeBienMedia(this.bien().id, mediaId).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success('Photo supprimée');
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'Suppression impossible');
      },
    });
  }

  private enregistrer(payload: AnnoncePayload, message: string): void {
    this.busy.set(true);
    this.api.updateBien(this.bien().id, payload).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success(message);
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'Enregistrement impossible');
      },
    });
  }
}
