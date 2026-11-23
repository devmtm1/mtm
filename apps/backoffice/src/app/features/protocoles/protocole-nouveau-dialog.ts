import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ProtocolesApiService } from '../../core/services/api/protocoles-api.service';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import { NotificationService } from '../../shared/services/notification.service';

export interface ProtocoleNouveauDialogData {
  /** Dossier déjà choisi (depuis l'alerte « signature manquante »). */
  dossierVenteId: string | null;
}

type TypeChoix = 'vente' | 'bail' | 'chantier';
interface OptionDossier {
  id: string;
  libelle: string;
}

/** Création d'un protocole : on choisit le type de dossier (vente, bail ou chantier), le dossier, le type de document et un titre. */
@Component({
  selector: 'app-protocole-nouveau-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Nouveau protocole</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Pour quel dossier ?</mat-label>
          <mat-select formControlName="typeDossier">
            <mat-option value="vente">Une vente</mat-option>
            <mat-option value="bail">Un bail locatif</mat-option>
            <mat-option value="chantier">Un chantier</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Chercher un dossier</mat-label>
          <input
            matInput
            formControlName="recherche"
            placeholder="Référence, client, bien…"
            autocomplete="off"
          />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ libelleChoix() }}</mat-label>
          <mat-select formControlName="dossierId" required>
            @for (option of visibles(); track option.id) {
              <mat-option [value]="option.id">{{ option.libelle }}</mat-option>
            }
          </mat-select>
          @if (chargement()) {
            <mat-hint>Chargement des dossiers…</mat-hint>
          } @else if (!visibles().length) {
            <mat-hint>Aucun dossier ne correspond.</mat-hint>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Type de document</mat-label>
          <mat-select formControlName="type">
            <mat-option value="protocole_accord">Protocole d’accord</mat-option>
            <mat-option value="contrat">Contrat</mat-option>
            <mat-option value="autre">Autre document</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Titre (facultatif)</mat-label>
          <input
            matInput
            formControlName="titre"
            maxlength="200"
            placeholder="Ex. Protocole d’accord – lot 12"
          />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        (click)="creer()"
        [disabled]="form.invalid || envoi()"
      >
        {{ envoi() ? 'Création…' : 'Créer le protocole' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-form {
      display: grid;
      gap: 4px;
      min-width: min(480px, calc(100vw - 96px));
    }
  `,
})
export class ProtocoleNouveauDialog implements OnInit {
  private readonly protocoles = inject(ProtocolesApiService);
  private readonly ventes = inject(VentesApiService);
  private readonly dialogRef = inject(MatDialogRef<ProtocoleNouveauDialog, string>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly data = inject<ProtocoleNouveauDialogData>(MAT_DIALOG_DATA);

  protected readonly options = signal<OptionDossier[]>([]);
  protected readonly chargement = signal(true);
  protected readonly envoi = signal(false);
  private readonly terme = signal('');
  private readonly typeChoisi = signal<TypeChoix>('vente');

  protected readonly form = this.formBuilder.nonNullable.group({
    typeDossier: 'vente' as TypeChoix,
    recherche: '',
    dossierId: [this.data.dossierVenteId ?? '', Validators.required],
    type: 'protocole_accord',
    titre: '',
  });

  protected readonly libelleChoix = computed(
    () =>
      ({ vente: 'Dossier de vente', bail: 'Bail locatif', chantier: 'Chantier' })[
        this.typeChoisi()
      ],
  );

  /** Les dossiers qui correspondent à la recherche. Le dossier déjà choisi reste toujours dans la liste. */
  protected readonly visibles = computed(() => {
    const terme = this.terme().trim().toLowerCase();
    const choisi = this.form.controls.dossierId.value;
    return this.options().filter(
      (option) => !terme || option.id === choisi || option.libelle.toLowerCase().includes(terme),
    );
  });

  ngOnInit(): void {
    this.charger('vente');
    this.form.controls.recherche.valueChanges.subscribe((valeur) => this.terme.set(valeur));
    this.form.controls.typeDossier.valueChanges.subscribe((type) => {
      this.typeChoisi.set(type);
      this.form.patchValue({ dossierId: '', recherche: '' });
      this.charger(type);
    });
  }

  private charger(type: TypeChoix): void {
    this.chargement.set(true);
    this.options.set([]);
    const fin = (options: OptionDossier[]) => {
      // Une réponse tardive d'un ancien choix ne remplace pas la liste du choix courant.
      if (this.typeChoisi() !== type) return;
      this.options.set(options);
      this.chargement.set(false);
    };
    const erreur = (error: unknown) => {
      this.chargement.set(false);
      this.notifications.error(error, 'Les dossiers ne se chargent pas');
    };
    if (type === 'vente') {
      this.ventes.findAll().subscribe({
        next: (dossiers) =>
          fin(
            dossiers
              .filter((dossier) => dossier.statut !== 'annule')
              .map((dossier) => ({
                id: dossier.id,
                libelle: `${dossier.referenceInterne || 'Dossier'} — ${dossier.prospect.prenom ?? ''} ${dossier.prospect.nom}${dossier.terrain ? ' · ' + dossier.terrain.nom : ''}`,
              })),
          ),
        error: erreur,
      });
      return;
    }
    this.protocoles.dossiersPossibles(type).subscribe({ next: fin, error: erreur });
  }

  protected creer(): void {
    if (this.form.invalid) return;
    const valeurs = this.form.getRawValue();
    const cible =
      valeurs.typeDossier === 'bail'
        ? { bailLocatifId: valeurs.dossierId }
        : valeurs.typeDossier === 'chantier'
          ? { projetConstructionId: valeurs.dossierId }
          : { dossierVenteId: valeurs.dossierId };
    this.envoi.set(true);
    this.protocoles
      .creer({ ...cible, type: valeurs.type, titre: valeurs.titre.trim() || undefined })
      .subscribe({
        next: (protocole) => this.dialogRef.close(protocole.id),
        error: (error: unknown) => {
          this.envoi.set(false);
          this.notifications.error(error, 'Le protocole n’a pas pu être créé');
        },
      });
  }
}
