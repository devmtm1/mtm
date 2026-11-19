import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ProtocolesApiService } from '../../core/services/api/protocoles-api.service';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import type { DossierVenteListItem } from '../../core/models/vente.model';
import { NotificationService } from '../../shared/services/notification.service';

export interface ProtocoleNouveauDialogData {
  /** Dossier déjà choisi (depuis l'alerte « signature manquante »). */
  dossierVenteId: string | null;
}

/** Création d'un protocole : on choisit le dossier de vente (recherche par référence, client ou terrain), son type et un titre. */
@Component({
  selector: 'app-protocole-nouveau-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Nouveau protocole</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Chercher un dossier</mat-label>
          <input matInput formControlName="recherche" placeholder="Référence, client, terrain…" autocomplete="off" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Dossier de vente</mat-label>
          <mat-select formControlName="dossierVenteId" required>
            @for (dossier of visibles(); track dossier.id) {
              <mat-option [value]="dossier.id">
                {{ dossier.referenceInterne || 'Dossier' }} — {{ dossier.prospect.prenom }} {{ dossier.prospect.nom }}{{ dossier.terrain ? ' · ' + dossier.terrain.nom : '' }}
              </mat-option>
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
          <input matInput formControlName="titre" maxlength="200" placeholder="Ex. Protocole d’accord – lot 12" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="creer()" [disabled]="form.invalid || envoi()">
        {{ envoi() ? 'Création…' : 'Créer le protocole' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-form { display: grid; gap: 4px; min-width: min(480px, calc(100vw - 96px)); }
  `,
})
export class ProtocoleNouveauDialog implements OnInit {
  private readonly protocoles = inject(ProtocolesApiService);
  private readonly ventes = inject(VentesApiService);
  private readonly dialogRef = inject(MatDialogRef<ProtocoleNouveauDialog, string>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly data = inject<ProtocoleNouveauDialogData>(MAT_DIALOG_DATA);

  protected readonly dossiers = signal<DossierVenteListItem[]>([]);
  protected readonly chargement = signal(true);
  protected readonly envoi = signal(false);
  private readonly terme = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    recherche: '',
    dossierVenteId: [this.data.dossierVenteId ?? '', Validators.required],
    type: 'protocole_accord',
    titre: '',
  });

  /** Les dossiers qui correspondent à la recherche (les annulés n'en reçoivent pas). Le dossier déjà choisi reste toujours dans la liste. */
  protected readonly visibles = computed(() => {
    const terme = this.terme().trim().toLowerCase();
    const choisi = this.form.controls.dossierVenteId.value;
    return this.dossiers()
      .filter((dossier) => dossier.statut !== 'annule')
      .filter((dossier) => {
        if (!terme || dossier.id === choisi) return true;
        const texte = `${dossier.referenceInterne ?? ''} ${dossier.prospect.prenom ?? ''} ${dossier.prospect.nom} ${dossier.terrain?.nom ?? ''}`.toLowerCase();
        return texte.includes(terme);
      });
  });

  ngOnInit(): void {
    this.ventes.findAll().subscribe({
      next: (dossiers) => {
        this.dossiers.set(dossiers);
        this.chargement.set(false);
      },
      error: (error: unknown) => {
        this.chargement.set(false);
        this.notifications.error(error, 'Les dossiers ne se chargent pas');
      },
    });
    this.form.controls.recherche.valueChanges.subscribe((valeur) => this.terme.set(valeur));
  }

  protected creer(): void {
    if (this.form.invalid) return;
    const valeurs = this.form.getRawValue();
    this.envoi.set(true);
    this.protocoles
      .creer({ dossierVenteId: valeurs.dossierVenteId, type: valeurs.type, titre: valeurs.titre.trim() || undefined })
      .subscribe({
        next: (protocole) => this.dialogRef.close(protocole.id),
        error: (error: unknown) => {
          this.envoi.set(false);
          this.notifications.error(error, 'Le protocole n’a pas pu être créé');
        },
      });
  }
}
