import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucideSave } from '@lucide/angular';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import { ProprietairesApiService } from '../../../core/services/api/proprietaires-api.service';
import type { LocatifOptions } from '../../../core/models/locatif.model';
import type { ProprietaireSummary } from '../../../core/models/terrain.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { TYPES_BIEN, simpleLabel } from '../locatif-status';

/** Fiche bien locatif (section 15 du cahier des charges, étape 1 de J2.1). */
@Component({
  selector: 'app-bien-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideArrowLeft,
    LucideSave,
  ],
  templateUrl: './bien-form.html',
  styleUrl: './bien-form.scss',
})
export class BienForm implements OnInit {
  private readonly api = inject(LocatifApiService);
  private readonly proprietairesApi = inject(ProprietairesApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly saving = signal(false);
  protected readonly options = signal<Partial<LocatifOptions>>({});
  protected readonly proprietaires = signal<ProprietaireSummary[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    proprietaireId: ['', Validators.required],
    type: ['appartement', Validators.required],
    adresse: ['', Validators.required],
    commune: [''],
    region: [''],
    superficie: [null as number | null],
    notes: [''],
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set({}),
    });
    this.proprietairesApi.findAll().subscribe({
      next: (items) => this.proprietaires.set(items),
      error: () => this.proprietaires.set([]),
    });
  }

  protected typeLabel(type: string): string {
    return simpleLabel(TYPES_BIEN, type);
  }

  protected nomProprietaire(proprietaire: ProprietaireSummary): string {
    return [proprietaire.firstName, proprietaire.lastName].filter(Boolean).join(' ');
  }

  protected retour(): void {
    void this.router.navigate(['/locatif/biens']);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.saving.set(true);
    this.api
      .createBien({
        proprietaireId: valeur.proprietaireId,
        type: valeur.type,
        adresse: valeur.adresse,
        commune: texte(valeur.commune),
        region: texte(valeur.region),
        superficie: valeur.superficie ?? undefined,
        notes: texte(valeur.notes),
      })
      .subscribe({
        next: (bien) => {
          this.saving.set(false);
          this.notify.success(`Bien ${bien.referenceInterne} enregistré`);
          void this.router.navigate(['/locatif/biens', bien.id]);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }
}
