import { Component, inject } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import type { Publication } from '../../../core/services/api/publications-api.service';

/** Lecteur de contrôle : on regarde la vidéo telle que les visiteurs la verront, avant de la publier. */
@Component({
  selector: 'app-publication-lecteur',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titre }}</h2>
    <mat-dialog-content class="lecteur">
      @if (youtube) {
        <iframe
          class="lecteur__youtube"
          [title]="data.titre"
          [src]="youtube"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      } @else if (data.videoUrl) {
        <video controls autoplay playsinline preload="metadata" [src]="data.videoUrl" [poster]="data.posterUrl ?? ''">
          Votre navigateur ne sait pas lire cette vidéo.
        </video>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .lecteur { padding-top: 4px !important; }
    video { display: block; width: 100%; max-height: 70vh; border-radius: var(--mtm-radius-md); background: #000; }
    .lecteur__youtube { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: var(--mtm-radius-md); background: #000; }
  `,
})
export class PublicationLecteur {
  protected readonly data = inject<Publication>(MAT_DIALOG_DATA);
  private readonly sanitizer = inject(DomSanitizer);

  /** L'identifiant YouTube vient de l'API, qui le limite à 11 caractères sûrs : il ne peut pas détourner l'adresse. */
  protected readonly youtube: SafeResourceUrl | null = this.data.youtubeId
    ? this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.data.youtubeId)}?autoplay=1&rel=0`,
      )
    : null;

  static open(dialog: MatDialog, publication: Publication): void {
    dialog.open(PublicationLecteur, { width: '960px', maxWidth: 'calc(100vw - 32px)', data: publication });
  }
}
