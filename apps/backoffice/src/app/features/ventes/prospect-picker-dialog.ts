import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideSearch } from '@lucide/angular';
import { debounceTime, switchMap } from 'rxjs';
import type { Observable } from 'rxjs';
import type { ProspectListItem } from '../../core/models/prospect.model';
import { CrmApiService } from '../../core/services/api/crm-api.service';

/**
 * « Pour quel client ? » — choisir le prospect avant d'ouvrir un dossier de
 * vente depuis la page Ventes, au lieu de renvoyer l'utilisateur vers la liste
 * des prospects. Un commercial ne retrouve que ses propres prospects.
 */
@Component({
  selector: 'app-prospect-picker-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, LucideSearch],
  template: `
    <h2 mat-dialog-title>Nouveau dossier de vente</h2>
    <mat-dialog-content>
      <p class="intro">Pour quel client ? Un dossier suit un client et un bien : choisissez d’abord le prospect, puis le bien.</p>
      <mat-form-field appearance="outline" class="recherche" subscriptSizing="dynamic">
        <mat-label>Rechercher un prospect</mat-label>
        <svg matPrefix class="icone" lucideSearch aria-hidden="true"></svg>
        <input matInput [formControl]="recherche" placeholder="Nom, téléphone, e-mail…" autocomplete="off" cdkFocusInitial />
      </mat-form-field>
      <ul class="liste" aria-label="Prospects">
        @for (prospect of resultats(); track prospect.id) {
          <li>
            <button type="button" class="option" (click)="choisir(prospect)">
              <span class="option__texte">
                <strong>{{ prospect.nom }} {{ prospect.prenom }}</strong>
                <small>{{ prospect.telephone || prospect.email || 'Aucun contact' }}{{ prospect.zoneRecherchee ? ' · ' + prospect.zoneRecherchee : '' }}</small>
              </span>
            </button>
          </li>
        } @empty {
          <li class="vide">{{ chargement() ? 'Recherche…' : 'Aucun prospect ne correspond. Créez-le d’abord dans Commercial › Prospects.' }}</li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
    </mat-dialog-actions>
  `,
  styles: `
    .intro { margin: 0 0 12px; color: var(--mtm-text-muted); font-size: 0.9rem; }
    .recherche { width: 100%; }
    .icone { width: 16px; height: 16px; margin: 0 4px 0 10px; color: var(--mtm-text-muted); }
    .liste { display: grid; gap: 6px; max-height: 300px; margin: 12px 0 0; padding: 2px; overflow-y: auto; list-style: none; }
    .option {
      display: flex; width: 100%; padding: 9px 12px; border: 1px solid var(--mtm-border); border-radius: 10px;
      background: var(--mtm-card-bg); color: var(--mtm-text-dark); font: inherit; text-align: left; cursor: pointer;
    }
    .option:hover, .option:focus-visible { border-color: var(--mtm-primary); outline: none; }
    .option__texte { display: grid; gap: 2px; min-width: 0; }
    .option__texte small { color: var(--mtm-text-muted); font-size: 0.78rem; }
    .vide { padding: 14px 4px; color: var(--mtm-text-muted); font-size: 0.88rem; }
  `,
})
export class ProspectPickerDialog implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<ProspectPickerDialog>);
  private readonly api = inject(CrmApiService);

  protected readonly recherche = new FormControl('', { nonNullable: true });
  protected readonly resultats = signal<ProspectListItem[]>([]);
  protected readonly chargement = signal(true);

  constructor() {
    this.recherche.valueChanges
      .pipe(
        debounceTime(250),
        switchMap((search) => {
          this.chargement.set(true);
          return this.api.findAll({ search: search.trim() || undefined, vue: 'actifs', pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (page) => {
          this.resultats.set(page.items);
          this.chargement.set(false);
        },
        error: () => this.chargement.set(false),
      });
  }

  ngOnInit(): void {
    this.api.findAll({ vue: 'actifs', pageSize: 20 }).subscribe({
      next: (page) => {
        this.resultats.set(page.items);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  protected choisir(prospect: ProspectListItem): void {
    this.dialogRef.close(prospect);
  }

  /** Émet le prospect choisi, ou `undefined` si l'utilisateur annule. */
  static ask(dialog: MatDialog): Observable<ProspectListItem | undefined> {
    return dialog
      .open<ProspectPickerDialog, void, ProspectListItem>(ProspectPickerDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed();
  }
}
