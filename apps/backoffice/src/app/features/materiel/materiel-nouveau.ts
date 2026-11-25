import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft } from '@lucide/angular';
import {
  MaterielApiService,
  type EtatMateriel,
  type NouveauMateriel,
  type OptionsMateriel,
} from '../../core/services/api/materiel-api.service';
import { NotificationService } from '../../shared/services/notification.service';

/**
 * Ajout d'un objet au parc, sur sa propre page : l'essentiel d'abord (ce que c'est, sa catégorie, où il est rangé, son
 * autocollant) ; le reste (marque, achat, garantie, notes) se déplie à la demande. Sans numéro, le suivant est attribué : on le
 * lit ici pour pouvoir imprimer l'autocollant. L'enregistrement ouvre la fiche de l'objet.
 */
@Component({
  selector: 'app-materiel-nouveau',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideArrowLeft,
  ],
  template: `
    <section class="nouveau-page">
      <header class="page-header">
        <div>
          <a class="back-link" routerLink="/materiel"
            ><svg lucideArrowLeft aria-hidden="true"></svg>Retour au matériel</a
          >
          <p class="eyebrow">Services</p>
          <h1 class="page-header__title">Nouveau matériel</h1>
          <p class="page-header__subtitle">
            Ajoutez un objet au parc de l’entreprise. Seuls la désignation et la catégorie sont
            obligatoires.
          </p>
        </div>
      </header>

      <form [formGroup]="form" class="page-card formulaire-page" (ngSubmit)="creer()">
        <h2>L’essentiel</h2>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Désignation</mat-label>
          <input
            matInput
            formControlName="designation"
            maxlength="200"
            placeholder="Ex. Bureau en bois, ordinateur portable…"
          />
        </mat-form-field>
        <div class="ligne">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Catégorie</mat-label>
            <mat-select formControlName="categorie">
              @for (categorie of options()?.categories ?? []; track categorie) {
                <mat-option [value]="categorie">{{ categorie }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Lieu de rangement</mat-label>
            <mat-select formControlName="lieu">
              <mat-option value="">Pas encore rangé</mat-option>
              @for (lieu of options()?.lieux ?? []; track lieu) {
                <mat-option [value]="lieu">{{ lieu }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <fieldset class="autocollant">
          <legend>Autocollant</legend>
          <mat-form-field appearance="outline" class="autocollant__champ" subscriptSizing="dynamic">
            <span matTextPrefix>MTM&nbsp;</span>
            <input
              matInput
              aria-label="Numéro de l’autocollant"
              type="number"
              min="1"
              formControlName="numero"
              autocomplete="off"
              [placeholder]="prochain()"
            />
          </mat-form-field>
          <p class="autocollant__aide">
            @if (options()) {
              Laissez vide : l’objet recevra le numéro <strong>MTM {{ prochain() }}</strong
              >, à écrire sur son autocollant. S’il porte déjà un autocollant, saisissez son numéro.
            } @else {
              Chargement…
            }
          </p>
        </fieldset>

        @if (!plus()) {
          <button mat-button type="button" class="plus" (click)="plus.set(true)">
            + Marque, achat, garantie, notes
          </button>
        } @else {
          <h2>Identification</h2>
          <div class="ligne">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Marque</mat-label>
              <input matInput formControlName="marque" maxlength="100" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Modèle</mat-label>
              <input matInput formControlName="modele" maxlength="100" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Numéro de série</mat-label>
              <input matInput formControlName="numeroSerie" maxlength="100" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>État</mat-label>
              <mat-select formControlName="etat">
                @for (etat of options()?.etats ?? []; track etat.valeur) {
                  <mat-option [value]="etat.valeur">{{ etat.libelle }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <h2>Achat et garantie</h2>
          <div class="ligne">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Acheté le</mat-label>
              <input matInput type="date" formControlName="dateAchat" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Prix d’achat (FCFA)</mat-label>
              <input matInput type="number" min="0" formControlName="prixAchat" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Fournisseur</mat-label>
              <input matInput formControlName="fournisseur" maxlength="200" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Garantie jusqu’au</mat-label>
              <input matInput type="date" formControlName="garantieJusqua" />
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Notes</mat-label>
            <textarea matInput rows="2" formControlName="notes" maxlength="1000"></textarea>
          </mat-form-field>
        }

        <div class="actions">
          <a mat-button routerLink="/materiel">Annuler</a>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || envoi()"
          >
            {{ envoi() ? 'Ajout…' : 'Ajouter au parc' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .nouveau-page {
      display: grid;
      gap: 16px;
      max-width: 820px;
    }
    .formulaire-page {
      display: grid;
      gap: 14px;
    }
    .formulaire-page h2 {
      margin: 6px 0 0;
      font-size: var(--mtm-fs-lg);
    }
    .formulaire-page h2:first-child {
      margin-top: 0;
    }
    .ligne {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 14px;
    }
    .plus {
      justify-self: start;
    }
    .autocollant {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 12px 14px;
      border: 1px solid var(--mtm-border);
      border-radius: var(--mtm-radius-md);
      background: var(--mtm-bg-surface);
    }
    .autocollant legend {
      padding: 0 6px;
      font-size: var(--mtm-fs-sm);
      font-weight: 700;
      color: var(--mtm-text-dark);
    }
    .autocollant__champ {
      width: 200px;
    }
    .autocollant__aide {
      margin: 0;
      font-size: var(--mtm-fs-sm);
      color: var(--mtm-text-muted);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--mtm-border);
    }
  `,
})
export class MaterielNouveauPage implements OnInit {
  private readonly api = inject(MaterielApiService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly options = signal<OptionsMateriel | null>(null);
  protected readonly envoi = signal(false);
  protected readonly plus = signal(false);

  protected readonly form = this.formBuilder.group({
    numero: this.formBuilder.control<number | null>(null),
    designation: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.minLength(2),
    ]),
    categorie: this.formBuilder.nonNullable.control('', Validators.required),
    lieu: this.formBuilder.nonNullable.control(''),
    marque: this.formBuilder.nonNullable.control(''),
    modele: this.formBuilder.nonNullable.control(''),
    numeroSerie: this.formBuilder.nonNullable.control(''),
    etat: this.formBuilder.nonNullable.control<EtatMateriel>('bon'),
    dateAchat: this.formBuilder.nonNullable.control(''),
    prixAchat: this.formBuilder.control<number | null>(null),
    fournisseur: this.formBuilder.nonNullable.control(''),
    garantieJusqua: this.formBuilder.nonNullable.control(''),
    notes: this.formBuilder.nonNullable.control(''),
  });

  protected prochain(): string {
    return String(this.options()?.prochainNumero ?? '').padStart(4, '0');
  }

  ngOnInit(): void {
    this.api.options().subscribe({
      next: (options) => this.options.set(options),
      error: (error: unknown) => this.notifications.error(error, 'Les listes ne se chargent pas'),
    });
  }

  protected creer(): void {
    if (this.form.invalid || this.envoi()) return;
    const v = this.form.getRawValue();
    const texte = (valeur: string) => valeur.trim() || undefined;
    const charge: NouveauMateriel = {
      ...(v.numero ? { numero: Number(v.numero) } : {}),
      designation: v.designation.trim(),
      categorie: v.categorie,
      lieu: texte(v.lieu),
      marque: texte(v.marque),
      modele: texte(v.modele),
      numeroSerie: texte(v.numeroSerie),
      etat: v.etat,
      dateAchat: texte(v.dateAchat),
      prixAchat:
        v.prixAchat === null || v.prixAchat === undefined ? undefined : Number(v.prixAchat),
      fournisseur: texte(v.fournisseur),
      garantieJusqua: texte(v.garantieJusqua),
      notes: texte(v.notes),
    };
    this.envoi.set(true);
    this.api.creer(charge).subscribe({
      next: (materiel) => {
        this.notifications.success(`${materiel.reference} ajouté au parc`);
        void this.router.navigate(['/materiel', materiel.id]);
      },
      error: (error: unknown) => {
        this.envoi.set(false);
        this.notifications.error(error, 'Le matériel n’a pas pu être ajouté');
      },
    });
  }
}
