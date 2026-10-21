import { Component, inject } from '@angular/core';
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
      @if (data.videoUrl) {
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
  `,
})
export class PublicationLecteur {
  protected readonly data = inject<Publication>(MAT_DIALOG_DATA);

  static open(dialog: MatDialog, publication: Publication): void {
    dialog.open(PublicationLecteur, { width: '960px', maxWidth: 'calc(100vw - 32px)', data: publication });
  }
}
