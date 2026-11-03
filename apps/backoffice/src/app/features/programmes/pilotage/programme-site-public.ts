import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideExternalLink, LucideImagePlus, LucideStar, LucideTrash2 } from '@lucide/angular';
import { environment } from '../../../../environments/environment';
import {
  type MediaProgramme,
  type ProgrammeDetail,
  ProgrammesApiService,
} from '../../../core/services/api/programmes-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ConfirmService } from '../../../shared/dialogs/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';

/**
 * Ce que le site public montre du programme : l'interrupteur de publication, la photo de couverture, la galerie
 * et le plan de masse. Sans photo, la carte du programme emprunte celle d'un de ses lots à vendre.
 */
@Component({
  selector: 'app-programme-site-public',
  imports: [MatButtonModule, MatSlideToggleModule, MatTooltipModule, LucideExternalLink, LucideImagePlus, LucideStar, LucideTrash2],
  styleUrl: './pilotage.scss',
  template: `
    <section class="page-card bloc" aria-labelledby="site-titre">
      <div class="bloc__tete">
        <div>
          <h2 id="site-titre">Publication sur le site</h2>
          <p>
            Un programme publié est annoncé dans le catalogue et sur l’accueil tant qu’il reste au moins un lot à vendre.
          </p>
        </div>
        <span class="liens-compta">
          <a [href]="adressePublique()" target="_blank" rel="noopener">
            <svg lucideExternalLink aria-hidden="true" class="icone-lien"></svg>Voir la page publique
          </a>
        </span>
      </div>
      <div class="publication">
        <mat-slide-toggle
          [checked]="programme().publie"
          [disabled]="!peutModifier || enCours()"
          (change)="publier($event.checked)"
          aria-label="Publier le programme sur le site public"
        >
          {{ programme().publie ? 'Publié sur le site' : 'Non publié : visible seulement ici' }}
        </mat-slide-toggle>
        @if (programme().publie && programme().lotsDisponibles === 0) {
          <p class="alerte-ligne alerte-ligne--sobre">
            Aucun lot n’est disponible : le programme n’apparaît pas sur le site tant que vous n’en mettez pas en vente.
          </p>
        }
        @if (!programme().description) {
          <p class="alerte-ligne alerte-ligne--sobre">
            Pas encore de description. Ajoutez-en une depuis « Modifier » : c’est le texte qui présente le lotissement aux visiteurs.
          </p>
        }
      </div>
    </section>

    <section class="page-card bloc" aria-labelledby="visuels-titre">
      <div class="bloc__tete">
        <div>
          <h2 id="visuels-titre">Photos et plan de masse</h2>
          <p>La première photo est la couverture : elle illustre la carte du catalogue et l’en-tête de la page.</p>
        </div>
        @if (peutModifier) {
          <span class="actions-ligne">
            <label class="bouton-fichier">
              <svg lucideImagePlus aria-hidden="true"></svg>Ajouter des photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden (change)="choisir($event, 'photo')" />
            </label>
            <label class="bouton-fichier">
              <svg lucideImagePlus aria-hidden="true"></svg>Ajouter le plan de masse
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="choisir($event, 'plan')" />
            </label>
          </span>
        }
      </div>

      @if (enCours()) {
        <p class="etat-vide etat-vide--carte">Envoi en cours…</p>
      }

      @if (medias(); as liste) {
        @if (liste.length === 0) {
          <p class="etat-vide etat-vide--carte">
            Aucun visuel. Sans photo, le programme emprunte celle d’un de ses lots à vendre, et sans plan de masse la section n’apparaît pas.
          </p>
        } @else {
          <ul class="visuels">
            @for (m of liste; track m.id; let i = $index) {
              <li class="visuel">
                <img [src]="m.secureUrl" [alt]="m.title || (m.type === 'plan' ? 'Plan de masse' : 'Photo du programme')" loading="lazy" />
                <span class="visuel__type" [class.visuel__type--couverture]="estCouverture(m)">
                  {{ m.type === 'plan' ? 'Plan de masse' : estCouverture(m) ? 'Couverture' : 'Photo' }}
                </span>
                @if (peutModifier) {
                  <span class="visuel__actions">
                    @if (m.type === 'photo' && !estCouverture(m)) {
                      <button mat-icon-button type="button" aria-label="Définir comme couverture" matTooltip="Définir comme couverture" (click)="couverture(m)">
                        <svg lucideStar aria-hidden="true"></svg>
                      </button>
                    }
                    <button mat-icon-button type="button" aria-label="Supprimer ce visuel" matTooltip="Supprimer" (click)="supprimer(m)">
                      <svg lucideTrash2 aria-hidden="true"></svg>
                    </button>
                  </span>
                }
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class ProgrammeSitePublic implements OnInit {
  private readonly api = inject(ProgrammesApiService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly session = inject(SessionService);

  readonly programme = input.required<ProgrammeDetail>();
  /** La publication a changé : la fiche se recharge. */
  readonly modifie = output<void>();

  protected readonly peutModifier = this.session.hasPermission('terrains:modifier');
  protected readonly medias = signal<MediaProgramme[] | null>(null);
  protected readonly enCours = signal(false);

  ngOnInit(): void {
    this.charger();
  }

  protected adressePublique(): string {
    return `${environment.publicWebUrl}/lotissements/${this.programme().id}`;
  }

  /** La couverture est la première photo. */
  protected estCouverture(media: MediaProgramme): boolean {
    return media.type === 'photo' && this.medias()?.find((m) => m.type === 'photo')?.id === media.id;
  }

  protected publier(publie: boolean): void {
    this.enCours.set(true);
    this.api.update(this.programme().id, { publie }).subscribe({
      next: () => {
        this.enCours.set(false);
        this.notifications.success(publie ? 'Programme publié sur le site.' : 'Programme retiré du site.');
        this.modifie.emit();
      },
      error: (erreur) => {
        this.enCours.set(false);
        this.modifie.emit();
        this.notifications.error(erreur, 'La publication n’a pas pu être modifiée');
      },
    });
  }

  protected choisir(evenement: Event, type: 'photo' | 'plan'): void {
    const entree = evenement.target as HTMLInputElement;
    const fichiers = [...(entree.files ?? [])];
    entree.value = '';
    if (fichiers.length === 0) return;
    this.enCours.set(true);
    // Un fichier après l'autre : l'ordre d'envoi est l'ordre de la galerie.
    const envoyer = (index: number): void => {
      if (index >= fichiers.length) {
        this.enCours.set(false);
        this.notifications.success(fichiers.length > 1 ? `${fichiers.length} visuels ajoutés.` : 'Visuel ajouté.');
        this.charger();
        return;
      }
      this.api.ajouterMedia(this.programme().id, fichiers[index], type).subscribe({
        next: () => envoyer(index + 1),
        error: (erreur) => {
          this.enCours.set(false);
          this.charger();
          this.notifications.error(erreur, `« ${fichiers[index].name} » n’a pas pu être envoyé`);
        },
      });
    };
    envoyer(0);
  }

  protected couverture(media: MediaProgramme): void {
    this.api.definirCouverture(this.programme().id, media.id).subscribe({
      next: () => {
        this.notifications.success('Photo de couverture mise à jour.');
        this.charger();
      },
      error: (erreur) => this.notifications.error(erreur, 'La couverture n’a pas pu être modifiée'),
    });
  }

  protected supprimer(media: MediaProgramme): void {
    this.confirm
      .ask({
        title: 'Supprimer ce visuel',
        message: 'Il disparaît du site public.',
        confirmLabel: 'Supprimer',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.supprimerMedia(this.programme().id, media.id).subscribe({
          next: () => this.charger(),
          error: (erreur) => this.notifications.error(erreur, 'Le visuel n’a pas pu être supprimé'),
        });
      });
  }

  private charger(): void {
    this.api.medias(this.programme().id).subscribe({
      next: (liste) => this.medias.set(liste),
      error: () => this.medias.set([]),
    });
  }
}
