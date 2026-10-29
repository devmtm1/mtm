import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * État civil facultatif d'un propriétaire ou d'un locataire : adresse, nationalité, naissance, profession et personne
 * à prévenir en cas d'urgence. Le groupe reçu doit porter les contrôles `adresse`, `nationalite`, `dateNaissance`,
 * `lieuNaissance`, `profession`, `urgenceNom`, `urgenceLien` et `urgenceTelephone`.
 */
@Component({
  selector: 'app-etat-civil-champs',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <fieldset class="civil" [formGroup]="groupe()">
      <legend>État civil <span>(facultatif)</span></legend>
      <mat-form-field appearance="outline" class="civil__large">
        <mat-label>Adresse</mat-label>
        <input matInput formControlName="adresse" maxlength="200" autocomplete="street-address" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Date de naissance</mat-label>
        <input matInput type="date" formControlName="dateNaissance" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Lieu de naissance</mat-label>
        <input matInput formControlName="lieuNaissance" maxlength="120" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Nationalité</mat-label>
        <input matInput formControlName="nationalite" maxlength="80" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Profession</mat-label>
        <input matInput formControlName="profession" maxlength="120" />
      </mat-form-field>
    </fieldset>
    <fieldset class="civil" [formGroup]="groupe()">
      <legend>Personne à prévenir en cas d’urgence <span>(facultatif)</span></legend>
      <mat-form-field appearance="outline">
        <mat-label>Nom</mat-label>
        <input matInput formControlName="urgenceNom" maxlength="120" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Lien (conjoint, frère, ami…)</mat-label>
        <input matInput formControlName="urgenceLien" maxlength="80" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Téléphone</mat-label>
        <input matInput type="tel" formControlName="urgenceTelephone" maxlength="30" />
      </mat-form-field>
    </fieldset>
  `,
  styles: `
    :host {
      display: block;
    }
    .civil {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 12px;
      min-width: 0;
      margin: 4px 0 0;
      padding: 0;
      border: 0;
    }
    .civil legend {
      padding: 0;
      margin-bottom: 8px;
      font-size: 0.86rem;
      font-weight: 600;
    }
    .civil legend span {
      font-weight: 400;
      color: var(--mtm-text-muted);
    }
    .civil__large {
      grid-column: 1 / -1;
    }
    @media (max-width: 520px) {
      .civil {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class EtatCivilChamps {
  readonly groupe = input.required<FormGroup>();
}
