import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { LucideChevronDown, LucideDynamicIcon, type LucideIcon } from '@lucide/angular';

/** Une action du menu : une icône, son nom, une ligne d'explication, et ce qu'elle déclenche. */
export interface ActionMenu {
  libelle: string;
  /** Une ligne qui dit ce que l'action fait ou ce qu'elle exige. */
  aide?: string | null;
  icone: LucideIcon;
  /** Ce que fait le clic. Absent quand l'action est un lien (`href`). */
  action?: () => void;
  /** Lien (appel, WhatsApp…) au lieu d'une action ; `externe` l'ouvre dans un nouvel onglet. */
  href?: string | null;
  externe?: boolean;
  desactivee?: boolean;
  /** Action sans retour (supprimer, résilier…) : icône et nom en rouge. */
  danger?: boolean;
}

/**
 * Un groupe d'actions, avec son titre. Une entrée `false`, `null` ou `undefined` est ignorée : on écrit
 * `condition && { … }` sans filtrer à la main, et un groupe qui n'a plus d'action disparaît.
 */
export interface GroupeMenu {
  titre?: string;
  actions: (ActionMenu | false | null | undefined)[];
}

/**
 * Le bouton « Plus ▾ » des fiches et son menu : des groupes titrés, et pour chaque action une icône, son nom et une
 * ligne d'explication. Les fiches (dossier de vente, mandat, bien, mission, chantier, prospect…) fournissent leurs
 * groupes ; la mise en forme est la même partout, et c'est ici qu'elle se corrige.
 *
 * Le menu ne s'affiche pas quand il n'a aucune action à proposer.
 */
@Component({
  selector: 'app-menu-actions',
  imports: [MatButtonModule, MatMenuModule, LucideChevronDown, LucideDynamicIcon],
  template: `
    @if (groupesVisibles().length) {
      <button
        mat-stroked-button
        type="button"
        [matMenuTriggerFor]="menu"
        [attr.aria-label]="libelle() === 'Plus' ? 'Plus d’actions' : libelle()"
      >
        {{ libelle() }}<svg class="btn-icon btn-icon--after" lucideChevronDown aria-hidden="true"></svg>
      </button>
      <mat-menu #menu="matMenu" xPosition="before" class="menu-actions">
        @for (groupe of groupesVisibles(); track $index; let premier = $first) {
          @if (!premier) {
            <div class="menu-separateur" role="separator"></div>
          }
          @if (groupe.titre) {
            <p class="menu-groupe">{{ groupe.titre }}</p>
          }
          @for (action of groupe.actions; track action.libelle) {
            @if (action.href) {
              <a
                mat-menu-item
                [href]="action.href"
                [attr.target]="action.externe ? '_blank' : null"
                [attr.rel]="action.externe ? 'noopener' : null"
                [class.menu-item--danger]="action.danger"
              >
                <svg class="menu-icone" [lucideIcon]="action.icone" aria-hidden="true"></svg>
                <span class="menu-line">
                  <strong>{{ action.libelle }}</strong>
                  @if (action.aide) {
                    <small>{{ action.aide }}</small>
                  }
                </span>
              </a>
            } @else {
              <button
                mat-menu-item
                type="button"
                [disabled]="action.desactivee"
                [class.menu-item--danger]="action.danger"
                (click)="action.action?.()"
              >
                <svg class="menu-icone" [lucideIcon]="action.icone" aria-hidden="true"></svg>
                <span class="menu-line">
                  <strong>{{ action.libelle }}</strong>
                  @if (action.aide) {
                    <small>{{ action.aide }}</small>
                  }
                </span>
              </button>
            }
          }
        }
      </mat-menu>
    }
  `,
  styles: `
    /* Le bouton se place comme un bouton de la barre d'actions de la fiche, sans boîte autour. */
    :host {
      display: contents;
    }
  `,
})
export class MenuActions {
  /** Les groupes d'actions, dans l'ordre où ils s'affichent. */
  readonly groupes = input.required<GroupeMenu[]>();
  /** Texte du bouton. */
  readonly libelle = input('Plus');

  /** Les groupes réduits à leurs actions présentes ; ceux qui n'en ont plus disparaissent. */
  protected readonly groupesVisibles = computed(() =>
    this.groupes()
      .map((groupe) => ({
        titre: groupe.titre,
        actions: groupe.actions.filter((action): action is ActionMenu => !!action),
      }))
      .filter((groupe) => groupe.actions.length > 0),
  );
}
