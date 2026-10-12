import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import { type TacheDetail, TachesApiService } from '../../core/services/api/taches-api.service';
import { SessionService } from '../../core/services/session.service';
import { ConfirmService } from '../../shared/dialogs/confirm-dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { TacheDialog } from './tache-dialog';
import {
  ACTIONS_HISTORIQUE,
  PRIORITES,
  STATUTS,
  TYPES_DOSSIER_LABELS,
  dateCourte,
  echeanceDite,
  libelle,
  nomPersonne,
  pastille,
  routeDossier,
} from './taches-status';

export interface TacheDetailData {
  id: string;
}

/** Fiche d'une tâche : où elle en est, qui l'a confiée, son historique, un commentaire, un changement de statut. */
@Component({
  selector: 'app-tache-detail-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    @if (tache(); as t) {
      <h2 mat-dialog-title>{{ t.titre }}</h2>
      <mat-dialog-content class="detail">
        <div class="detail__pastilles">
          <span [class]="pastilleStatut(t.statut)">{{ libelleStatut(t.statut) }}</span>
          <span [class]="pastillePriorite(t.priorite)">{{ libellePriorite(t.priorite) }}</span>
          @if (t.enRetard) {
            <span class="status-pill status-pill--danger">En retard</span>
          }
        </div>
        @if (t.description) {
          <p class="detail__texte">{{ t.description }}</p>
        }
        <ul class="detail__infos">
          <li><span>Échéance</span><strong>{{ echeance(t.dateLimite) }}</strong></li>
          <li><span>Responsable</span><strong>{{ nom(t.responsable) }}</strong></li>
          <li><span>Confiée par</span><strong>{{ nom(t.creePar) }}</strong></li>
          @if (route(t); as r) {
            <li>
              <span>Dossier</span>
              <a [routerLink]="r" (click)="fermer()">{{ typeDossier(t.entityType) }} {{ t.entityLabel }}</a>
            </li>
          }
        </ul>

        @if (t.peutModifier) {
          <div class="detail__actions">
            @if (t.statut === 'a_faire') {
              <button mat-stroked-button type="button" (click)="changer('en_cours')">Commencer</button>
            }
            @if (t.statut === 'a_faire' || t.statut === 'en_cours') {
              <button mat-flat-button color="primary" type="button" (click)="changer('terminee')">Terminer</button>
              <button mat-button type="button" (click)="changer('annulee')">Annuler la tâche</button>
            } @else {
              <button mat-stroked-button type="button" (click)="changer('a_faire')">Rouvrir</button>
            }
            <button mat-button type="button" (click)="modifier(t)">Modifier</button>
            @if (peutSupprimer) {
              <button mat-button type="button" (click)="supprimer(t)">Supprimer</button>
            }
          </div>
        }

        <h3 class="detail__titre">Historique</h3>
        <ol class="detail__historique">
          @for (ligne of t.historique; track ligne.id) {
            <li>
              <span class="detail__quand">{{ date(ligne.createdAt) }}</span>
              <span>
                <strong>{{ action(ligne.action) }}</strong>
                @if (ligne.detail) {
                  — {{ ligne.detail }}
                }
                <small>par {{ nom(ligne.auteur) }}</small>
              </span>
            </li>
          }
        </ol>

        <mat-form-field appearance="outline" class="detail__commentaire">
          <mat-label>Ajouter un commentaire</mat-label>
          <input matInput [formControl]="commentaire" maxlength="1000" (keydown.enter)="commenter()" />
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="commenter()" [disabled]="!commentaire.value.trim()">
          Commenter
        </button>
        <button mat-flat-button color="primary" type="button" (click)="fermer()">Fermer</button>
      </mat-dialog-actions>
    } @else {
      <mat-dialog-content><p>Chargement…</p></mat-dialog-content>
    }
  `,
  styles: `
    .detail {
      display: grid;
      gap: 10px;
      min-width: 480px;
    }
    .detail__pastilles {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .detail__texte {
      margin: 0;
      white-space: pre-line;
    }
    .detail__infos {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.9rem;
    }
    .detail__infos li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .detail__infos span {
      color: var(--mtm-text-muted);
    }
    .detail__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .detail__titre {
      margin: 6px 0 0;
      font-size: 0.95rem;
    }
    .detail__historique {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.85rem;
    }
    .detail__historique li {
      display: grid;
      grid-template-columns: 96px 1fr;
      gap: 8px;
    }
    .detail__historique small {
      display: block;
      color: var(--mtm-text-muted);
    }
    .detail__quand {
      color: var(--mtm-text-muted);
    }
    @media (max-width: 620px) {
      .detail {
        min-width: 0;
      }
    }
  `,
})
export class TacheDetailDialog implements OnInit {
  private readonly data = inject<TacheDetailData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<TacheDetailDialog, boolean>>(MatDialogRef);
  private readonly api = inject(TachesApiService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmer = inject(ConfirmService);
  private readonly session = inject(SessionService);

  protected readonly tache = signal<TacheDetail | null>(null);
  protected readonly commentaire = new FormControl('', { nonNullable: true });
  protected readonly peutSupprimer = this.session.hasPermission('taches:supprimer');
  private modifie = false;

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.api.detail(this.data.id).subscribe({
      next: (tache) => this.tache.set(tache),
      error: (error: unknown) => {
        this.notify.error(error, 'Tâche introuvable');
        this.dialogRef.close(this.modifie);
      },
    });
  }

  protected changer(statut: string): void {
    const t = this.tache();
    if (!t) return;
    this.api.update(t.id, { statut }).subscribe({
      next: (tache) => {
        this.tache.set(tache);
        this.modifie = true;
      },
      error: (error: unknown) => this.notify.error(error, 'Changement impossible'),
    });
  }

  protected commenter(): void {
    const t = this.tache();
    const texte = this.commentaire.value.trim();
    if (!t || !texte) return;
    this.api.comment(t.id, texte).subscribe({
      next: (tache) => {
        this.tache.set(tache);
        this.commentaire.reset('');
      },
      error: (error: unknown) => this.notify.error(error, 'Commentaire non enregistré'),
    });
  }

  protected modifier(t: TacheDetail): void {
    TacheDialog.open(this.dialog, { existante: t }).subscribe((resultat) => {
      if (resultat) {
        this.modifie = true;
        this.charger();
      }
    });
  }

  protected supprimer(t: TacheDetail): void {
    this.confirmer.ask(`Supprimer la tâche « ${t.titre} » ? Son historique sera perdu.`).subscribe((ok) => {
      if (!ok) return;
      this.api.remove(t.id).subscribe({
        next: () => {
          this.notify.success('Tâche supprimée');
          this.dialogRef.close(true);
        },
        error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
      });
    });
  }

  protected fermer(): void {
    this.dialogRef.close(this.modifie);
  }

  protected route(t: TacheDetail): string[] | null {
    return routeDossier(t.entityType, t.entityId);
  }

  protected typeDossier(type: string | null): string {
    return (type && TYPES_DOSSIER_LABELS[type]) || '';
  }

  protected libelleStatut = (code: string) => libelle(STATUTS, code);
  protected pastilleStatut = (code: string) => pastille(STATUTS, code);
  protected libellePriorite = (code: string) => libelle(PRIORITES, code);
  protected pastillePriorite = (code: string) => pastille(PRIORITES, code);
  protected echeance = (valeur: string | null) => echeanceDite(valeur);
  protected nom = nomPersonne;
  protected date = dateCourte;
  protected action = (code: string) => ACTIONS_HISTORIQUE[code] ?? code;

  static open(dialog: MatDialog, data: TacheDetailData): Observable<boolean | undefined> {
    return dialog.open(TacheDetailDialog, { width: '560px', data }).afterClosed();
  }
}
