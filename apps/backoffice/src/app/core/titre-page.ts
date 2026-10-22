import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const TITRE_PAR_DEFAUT = 'MTM Immobilier — Back-Office';

/** Titre de l'onglet : « Biens à vendre — MTM Immobilier ». Chaque écran se reconnaît dans la liste des onglets et l'historique. */
@Injectable({ providedIn: 'root' })
export class TitrePage extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(etat: RouterStateSnapshot): void {
    const titre = this.buildTitle(etat);
    this.title.setTitle(titre ? `${titre} — MTM Immobilier` : TITRE_PAR_DEFAUT);
  }
}
