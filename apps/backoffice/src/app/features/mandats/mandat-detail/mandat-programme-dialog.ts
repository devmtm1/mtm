import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { type ProgrammeResume, ProgrammesApiService } from '../../../core/services/api/programmes-api.service';

/**
 * Confier un lotissement entier au mandat : on choisit le programme, tous ses
 * lots sont rattachés d'un coup (sans passer par chaque terrain).
 */
@Component({
  selector: 'app-mandat-programme-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Confier un programme</h2>
    <mat-dialog-content class="prog-dialog" [formGroup]="form">
      <p class="prog-dialog__intro">
        Tous les lots du programme sont rattachés à ce mandat en une fois. Ceux qui y sont déjà, ou qui sont couverts
        par un autre mandat exclusif actif, sont laissés de côté.
      </p>
      @if (chargement()) {
        <div class="skeleton" style="height: 56px"></div>
      } @else if (programmes().length === 0) {
        <p class="prog-dialog__intro">Aucun programme. Créez-en un depuis « Biens à vendre ».</p>
      } @else {
        <mat-form-field appearance="outline">
          <mat-label>Programme</mat-label>
          <mat-select formControlName="programmeId">
            @for (p of programmes(); track p.id) {
              <mat-option [value]="p.id">{{ p.nom }} ({{ p.nombreLots }} lots)</mat-option>
            }
          </mat-select>
          @if (form.controls.programmeId.touched && form.controls.programmeId.invalid) {
            <mat-error>Choisissez un programme.</mat-error>
          }
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()" [disabled]="programmes().length === 0">
        Confier les lots
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .prog-dialog {
      display: grid;
      gap: 10px;
      min-width: min(480px, 80vw);
    }
    .prog-dialog__intro {
      margin: 0 0 8px;
      color: var(--mtm-text-muted);
      font-size: 0.88rem;
    }
  `,
})
export class MandatProgrammeDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<MandatProgrammeDialog, string>);
  protected readonly programmes = signal<ProgrammeResume[]>([]);
  protected readonly chargement = signal(true);
  protected readonly form = this.fb.nonNullable.group({ programmeId: ['', Validators.required] });

  constructor() {
    inject(ProgrammesApiService)
      .findAll()
      .subscribe({
        next: (liste) => {
          this.programmes.set(liste);
          this.chargement.set(false);
        },
        error: () => this.chargement.set(false),
      });
  }

  protected valider(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue().programmeId);
  }
}
