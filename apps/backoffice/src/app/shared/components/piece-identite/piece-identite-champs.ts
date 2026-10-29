import { Component, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideUpload } from '@lucide/angular';
import { TYPES_PIECE, erreurFichierPiece } from '../../../core/models/piece-identite';

/**
 * Type, numéro et copie PDF de la pièce d'identité : trois champs facultatifs, communs aux formulaires
 * propriétaire et locataire. Le groupe reçu doit porter les contrôles `typePiece`, `numeroPiece` et `pieceValiditeLe`. Le fichier choisi est remonté au formulaire, qui l'envoie après l'enregistrement.
 */
@Component({
  selector: 'app-piece-identite-champs',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideUpload],
  template: `
    <fieldset class="piece" [formGroup]="groupe()">
      <legend>Pièce d’identité <span>(facultatif)</span></legend>
      <mat-form-field appearance="outline">
        <mat-label>Type de pièce</mat-label>
        <mat-select formControlName="typePiece">
          <mat-option value="">Non renseigné</mat-option>
          @for (type of types; track type.valeur) {
            <mat-option [value]="type.valeur">{{ type.libelle }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Numéro de la pièce</mat-label>
        <input matInput formControlName="numeroPiece" maxlength="50" autocomplete="off" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Valable jusqu’au</mat-label>
        <input matInput type="date" formControlName="pieceValiditeLe" />
      </mat-form-field>

      <div class="piece__fichier">
        <label class="piece__choix">
          <svg lucideUpload aria-hidden="true"></svg>
          {{ fichier() || pieceUrl() ? 'Remplacer le PDF' : 'Ajouter le PDF de la pièce' }}
          <input type="file" accept="application/pdf,.pdf" (change)="choisir($event)" />
        </label>
        @if (pieceUrl() && !fichier() && !retrait()) {
          <a [href]="pieceUrl()" target="_blank" rel="noopener">Voir le PDF actuel</a>
          <button type="button" class="piece__lien" (click)="demanderRetrait(true)">Retirer</button>
        }
        @if (fichier(); as f) {
          <button type="button" class="piece__lien" (click)="annuler()">Annuler le choix</button>
        }
      </div>
      <p class="piece__etat" [class.piece__etat--erreur]="erreur()">
        @if (erreur()) {
          {{ erreur() }}
        } @else if (fichier(); as f) {
          {{ f.name }}
        } @else if (retrait()) {
          Le PDF actuel sera retiré à l’enregistrement.
          <button type="button" class="piece__lien" (click)="demanderRetrait(false)">Garder</button>
        } @else {
          PDF uniquement, 10 Mo au maximum.
        }
      </p>
    </fieldset>
  `,
  styles: `
    .piece {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 12px;
      min-width: 0;
      margin: 4px 0 0;
      padding: 0;
      border: 0;
    }
    .piece legend {
      padding: 0;
      margin-bottom: 8px;
      font-size: 0.86rem;
      font-weight: 600;
    }
    .piece legend span {
      font-weight: 400;
      color: var(--mtm-text-muted);
    }
    .piece__fichier,
    .piece__etat {
      grid-column: 1 / -1;
    }
    .piece__fichier {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
    }
    .piece__choix {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border: 1px solid var(--mtm-border);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .piece__choix svg {
      width: 16px;
      height: 16px;
    }
    .piece__choix input {
      display: none;
    }
    .piece__lien {
      padding: 0;
      border: 0;
      background: none;
      color: var(--mtm-primary, inherit);
      font: inherit;
      font-size: 0.85rem;
      text-decoration: underline;
      cursor: pointer;
    }
    .piece__etat {
      margin: 0 0 8px;
      font-size: 0.82rem;
      color: var(--mtm-text-muted);
    }
    .piece__etat--erreur {
      color: var(--mtm-error);
    }
    @media (max-width: 520px) {
      .piece {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class PieceIdentiteChamps {
  readonly groupe = input.required<FormGroup>();
  /** Lien du PDF déjà enregistré (modification d'une fiche). */
  readonly pieceUrl = input<string | null>(null);
  readonly fichierChange = output<File | null>();
  readonly retraitChange = output<boolean>();

  protected readonly types = TYPES_PIECE;
  protected readonly fichier = signal<File | null>(null);
  protected readonly retrait = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected choisir(event: Event): void {
    const champ = event.target as HTMLInputElement;
    const choisi = champ.files?.[0] ?? null;
    champ.value = '';
    if (!choisi) return;
    const probleme = erreurFichierPiece(choisi);
    this.erreur.set(probleme);
    if (probleme) return;
    this.fichier.set(choisi);
    this.fichierChange.emit(choisi);
    this.demanderRetrait(false);
  }

  protected annuler(): void {
    this.fichier.set(null);
    this.erreur.set(null);
    this.fichierChange.emit(null);
  }

  protected demanderRetrait(valeur: boolean): void {
    this.retrait.set(valeur);
    this.retraitChange.emit(valeur);
  }
}
