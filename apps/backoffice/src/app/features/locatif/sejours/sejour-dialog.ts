import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucidePlus } from '@lucide/angular';
import type { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import { SejoursApiService } from '../../../core/services/api/sejours-api.service';
import type { BienAnnonce, BienListItem, Locataire } from '../../../core/models/locatif.model';
import type { CreateSejourPayload, SejourDetail } from '../../../core/models/sejour.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { nombreOuUndefined } from '../locatif-form';
import { LocataireQuickAddDialog } from '../bien-detail/locataire-quick-add-dialog';
import { SOURCES_SEJOUR } from './sejour-status';

export interface SejourDialogData {
  /** Bien présélectionné (création depuis sa fiche). */
  bienLocatifId?: string;
  /** Séjour à modifier ; absent pour une nouvelle réservation. */
  sejour?: SejourDetail;
}

type BienSejour = BienListItem & Partial<BienAnnonce>;

const JOUR_MS = 24 * 60 * 60 * 1000;
const nombre = (valeur: number | string | null | undefined): number | null =>
  valeur === null || valeur === undefined || valeur === '' ? null : Number(valeur);

/**
 * Réservation d'un séjour : le voyageur, les dates et le prix. Le tarif part de
 * celui du bien et peut être ajusté pour ce séjour ; il est ensuite figé. Les
 * dates qui chevauchent un autre séjour confirmé sont refusées par le serveur,
 * qui dit lequel les occupe.
 */
@Component({
  selector: 'app-sejour-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucidePlus,
    MoneyPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Modifier le séjour ' + data.sejour?.referenceInterne : 'Nouveau séjour' }}</h2>
    <mat-dialog-content [formGroup]="form" class="sejour-grid">
      @if (!editing) {
        <mat-form-field appearance="outline" class="sejour-wide">
          <mat-label>Bien loué à la nuit</mat-label>
          <mat-select formControlName="bienLocatifId" (selectionChange)="bienChoisi($event.value)">
            @for (bien of biens(); track bien.id) {
              <mat-option [value]="bien.id">{{ nomBien(bien) }} — {{ bien.referenceInterne }}</mat-option>
            }
          </mat-select>
          @if (biens().length === 0 && !chargement()) {
            <mat-hint>
              Aucun bien n’est loué à la nuit. Passez un bien en « location à la nuit » depuis sa fiche.
            </mat-hint>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="sejour-wide">
          <mat-label>Voyageur</mat-label>
          <input matInput [formControl]="voyageurQuery" [matAutocomplete]="auto" placeholder="Nom ou téléphone" autocomplete="off" />
          <mat-autocomplete #auto="matAutocomplete" [displayWith]="afficherVoyageur" (optionSelected)="choisirVoyageur($event.option.value)">
            @for (voyageur of voyageurs(); track voyageur.id) {
              <mat-option [value]="voyageur">{{ voyageur.firstName }} {{ voyageur.lastName }} {{ voyageur.phone ? '· ' + voyageur.phone : '' }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
        <button mat-stroked-button type="button" class="sejour-wide" (click)="ajouterVoyageur()">
          <svg class="btn-icon" lucidePlus aria-hidden="true"></svg>Nouveau voyageur
        </button>
      }

      <mat-form-field appearance="outline">
        <mat-label>Arrivée</mat-label>
        <input matInput type="date" formControlName="dateArrivee" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Départ</mat-label>
        <input matInput type="date" formControlName="dateDepart" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Voyageurs</mat-label>
        <input matInput type="number" min="1" max="50" formControlName="nombreVoyageurs" />
        @if (capacite() !== null) {
          <mat-hint>Capacité : {{ capacite() }}</mat-hint>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Source de la réservation</mat-label>
        <mat-select formControlName="source">
          @for (source of sources; track source[0]) {
            <mat-option [value]="source[0]">{{ source[1] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (!editing) {
        <mat-form-field appearance="outline">
          <mat-label>Date de la réservation</mat-label>
          <input matInput type="date" formControlName="dateReservation" />
          <mat-hint>Quand le voyageur a réservé (aujourd’hui par défaut).</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>État initial</mat-label>
          <mat-select formControlName="statut">
            <mat-option value="confirmee">Confirmé (occupe les nuits)</mat-option>
            <mat-option value="demande">Demande à confirmer</mat-option>
          </mat-select>
        </mat-form-field>
      }

      <mat-form-field appearance="outline">
        <mat-label>Prix de la nuit (FCFA)</mat-label>
        <input matInput type="number" min="0" step="1000" formControlName="prixNuit" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Frais de ménage (FCFA)</mat-label>
        <input matInput type="number" min="0" step="1000" formControlName="fraisMenage" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Remise (FCFA)</mat-label>
        <input matInput type="number" min="0" step="1000" formControlName="remise" />
        <mat-hint>Geste commercial, retiré du total.</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Caution (FCFA)</mat-label>
        <input matInput type="number" min="0" step="5000" formControlName="cautionMontant" />
      </mat-form-field>

      <p class="sejour-resume sejour-wide" [class.sejour-resume--erreur]="nuits() < 1">
        @if (nuits() >= 1) {
          <strong>{{ nuits() }} nuit{{ nuits() > 1 ? 's' : '' }}</strong> · total
          <strong>{{ total() | mtmMoney }}</strong>
        } @else {
          Choisissez une date de départ après la date d’arrivée.
        }
      </p>

      <mat-form-field appearance="outline" class="sejour-wide">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="2" formControlName="notes" maxlength="2000" placeholder="Heure d’arrivée prévue, demandes particulières…"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="saving()">
        {{ saving() ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Réserver' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .sejour-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; min-width: min(640px, calc(100vw - 96px)); }
    .sejour-wide { grid-column: 1 / -1; }
    .sejour-resume { margin: 0 0 8px; padding: 10px 14px; border-radius: 10px; background: var(--mtm-bg-surface); font-size: 0.92rem; }
    .sejour-resume--erreur { color: var(--mtm-accent); }
    @media (max-width: 640px) { .sejour-grid { grid-template-columns: 1fr; } }
  `,
})
export class SejourDialog implements OnInit {
  private readonly api = inject(SejoursApiService);
  private readonly locatifApi = inject(LocatifApiService);
  private readonly dialogRef = inject(MatDialogRef<SejourDialog, SejourDetail>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject<SejourDialogData>(MAT_DIALOG_DATA);

  protected readonly editing = !!this.data.sejour;
  protected readonly sources = Object.entries(SOURCES_SEJOUR);
  protected readonly saving = signal(false);
  protected readonly chargement = signal(true);
  protected readonly biens = signal<BienSejour[]>([]);
  protected readonly voyageurs = signal<Locataire[]>([]);
  protected readonly voyageurQuery = new FormControl<Locataire | string>('');
  private readonly bienCourant = signal<BienSejour | null>(null);

  private readonly depart = this.data.sejour;
  protected readonly form = this.formBuilder.nonNullable.group({
    bienLocatifId: [this.data.bienLocatifId ?? '', this.editing ? [] : [Validators.required]],
    locataireId: ['', this.editing ? [] : [Validators.required]],
    dateArrivee: [this.depart ? this.depart.dateArrivee.slice(0, 10) : '', Validators.required],
    dateDepart: [this.depart ? this.depart.dateDepart.slice(0, 10) : '', Validators.required],
    dateReservation: [''],
    nombreVoyageurs: [this.depart?.nombreVoyageurs ?? 1, [Validators.required, Validators.min(1), Validators.max(50)]],
    source: [this.depart?.source ?? 'direct'],
    statut: ['confirmee' as 'confirmee' | 'demande'],
    prixNuit: [nombre(this.depart?.prixNuit) as number | null, [Validators.required, Validators.min(1)]],
    fraisMenage: [nombre(this.depart?.fraisMenage) ?? (0 as number | null), Validators.min(0)],
    remise: [nombre(this.depart?.remise) ?? (0 as number | null), Validators.min(0)],
    cautionMontant: [nombre(this.depart?.cautionMontant) as number | null, Validators.min(0)],
    notes: [this.depart?.notes ?? ''],
  });

  private readonly valeurs = signal(this.form.getRawValue());
  protected readonly nuits = computed(() => {
    const { dateArrivee, dateDepart } = this.valeurs();
    if (!dateArrivee || !dateDepart) return 0;
    return Math.round((Date.parse(dateDepart) - Date.parse(dateArrivee)) / JOUR_MS);
  });
  protected readonly total = computed(() => {
    const { prixNuit, fraisMenage, remise } = this.valeurs();
    return Math.max(this.nuits() * (prixNuit ?? 0) + (fraisMenage ?? 0) - (remise ?? 0), 0);
  });
  protected readonly capacite = computed(() => (this.editing ? null : (this.bienCourant()?.capaciteVoyageurs ?? null)));

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.valeurs.set(this.form.getRawValue()));
    this.voyageurQuery.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((valeur) => {
          if (valeur && typeof valeur === 'object') return [];
          return this.locatifApi.findLocataires((valeur ?? '').trim() || undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((liste) => this.voyageurs.set(liste));
  }

  ngOnInit(): void {
    if (this.editing) {
      this.chargement.set(false);
      return;
    }
    this.locatifApi.findBiens({ modeLocation: 'courte_duree', pageSize: 200 }).subscribe({
      next: (page) => {
        this.biens.set(page.items as BienSejour[]);
        this.chargement.set(false);
        if (this.data.bienLocatifId) this.bienChoisi(this.data.bienLocatifId);
      },
      error: () => this.chargement.set(false),
    });
    this.locatifApi.findLocataires().subscribe({ next: (liste) => this.voyageurs.set(liste), error: () => undefined });
  }

  protected nomBien(bien: BienSejour): string {
    return bien.titre?.trim() || [bien.type, bien.commune].filter(Boolean).join(' · ');
  }

  /** Le tarif du bien devient le tarif proposé pour le séjour. */
  protected bienChoisi(id: string): void {
    const bien = this.biens().find((item) => item.id === id) ?? null;
    this.bienCourant.set(bien);
    if (!bien) return;
    this.form.patchValue({
      prixNuit: nombre(bien.prixNuit),
      fraisMenage: nombre(bien.fraisMenage) ?? 0,
      cautionMontant: nombre(bien.cautionSejour),
    });
  }

  protected afficherVoyageur(valeur: Locataire | string | null): string {
    if (!valeur) return '';
    return typeof valeur === 'string' ? valeur : `${valeur.firstName} ${valeur.lastName}`;
  }

  protected choisirVoyageur(voyageur: Locataire): void {
    this.form.patchValue({ locataireId: voyageur.id });
  }

  protected ajouterVoyageur(): void {
    LocataireQuickAddDialog.open(this.dialog).subscribe((voyageur) => {
      if (!voyageur) return;
      this.voyageurs.update((liste) => [...liste, voyageur]);
      this.voyageurQuery.setValue(voyageur);
      this.form.patchValue({ locataireId: voyageur.id });
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.nuits() < 1) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    const commun = {
      dateArrivee: valeur.dateArrivee,
      dateDepart: valeur.dateDepart,
      nombreVoyageurs: valeur.nombreVoyageurs,
      source: valeur.source,
      prixNuit: nombreOuUndefined(valeur.prixNuit),
      fraisMenage: nombreOuUndefined(valeur.fraisMenage),
      remise: nombreOuUndefined(valeur.remise),
      cautionMontant: nombreOuUndefined(valeur.cautionMontant),
      notes: texte(valeur.notes),
    };
    this.saving.set(true);
    const requete$: Observable<SejourDetail> = this.data.sejour
      ? this.api.update(this.data.sejour.id, commun)
      : this.api.create({
          ...commun,
          bienLocatifId: valeur.bienLocatifId,
          locataireId: valeur.locataireId,
          dateReservation: valeur.dateReservation || undefined,
          statut: valeur.statut,
        } satisfies CreateSejourPayload);
    requete$.subscribe({
      next: (sejour) => {
        this.saving.set(false);
        this.dialogRef.close(sejour);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Enregistrement impossible');
      },
    });
  }

  static open(dialog: MatDialog, data: SejourDialogData): Observable<SejourDetail | undefined> {
    return dialog.open(SejourDialog, { width: '720px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
