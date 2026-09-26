import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucideSave } from '@lucide/angular';
import { ConstructionApiService } from '../../../core/services/api/construction-api.service';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { ChantierOptions } from '../../../core/models/chantier.model';
import type { ProspectListItem } from '../../../core/models/prospect.model';
import type { TerrainListItem } from '../../../core/models/terrain.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { TYPES_PROJET, label } from '../chantier-status';

/** Création d'un chantier (J2.3, section 16 du cahier des charges). */
@Component({
  selector: 'app-chantier-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideArrowLeft,
    LucideSave,
  ],
  templateUrl: './chantier-form.html',
  styleUrl: './chantier-form.scss',
})
export class ChantierForm implements OnInit {
  private readonly api = inject(ConstructionApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly saving = signal(false);
  protected readonly options = signal<Partial<ChantierOptions>>({});
  protected readonly clients = signal<ProspectListItem[]>([]);
  protected readonly terrains = signal<TerrainListItem[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    clientId: ['', Validators.required],
    terrainId: [''],
    intitule: ['', [Validators.required, Validators.minLength(2)]],
    typeProjet: ['villa', Validators.required],
    programme: [''],
    adresse: [''],
    commune: [''],
    region: [''],
    surfaceBatie: [null as number | null],
    nombreNiveaux: [null as number | null],
    montantDevis: [null as number | null],
    budgetPrevu: [null as number | null],
    dateDebutPrevue: [''],
    dateFinPrevue: [''],
    // Poser le déroulé type évite neuf saisies manuelles : les dates
    // s'ajoutent ensuite jalon par jalon depuis le planning.
    avecJalonsType: [true],
    notes: [''],
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set({}),
    });
    this.crmApi.findAll({ pageSize: 200 }).subscribe({
      next: (page) => this.clients.set(page.items),
      error: () => this.clients.set([]),
    });
    this.terrainsApi.findAll({ pageSize: 200 }).subscribe({
      next: (page) => this.terrains.set(page.items),
      error: () => this.terrains.set([]),
    });
  }

  protected typeLabel(type: string): string {
    return label(TYPES_PROJET, type);
  }

  protected nomClient(client: ProspectListItem): string {
    return [client.prenom, client.nom].filter(Boolean).join(' ') || '—';
  }

  protected nomTerrain(terrain: TerrainListItem): string {
    return terrain.referenceInterne
      ? `${terrain.nom} (${terrain.referenceInterne})`
      : terrain.nom;
  }

  /** Les jalons proposés, pour que la case à cocher dise ce qu'elle pose. */
  protected apercuJalons(): string {
    const jalons = this.options().jalonsType ?? [];
    if (!jalons.length) return '';
    return jalons
      .slice(0, 4)
      .map((code) => code.replace(/_/g, ' '))
      .join(' · ')
      .concat(jalons.length > 4 ? ` · +${jalons.length - 4}` : '');
  }

  protected retour(): void {
    void this.router.navigate(['/construction/chantiers']);
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
      .create({
        clientId: valeur.clientId,
        terrainId: texte(valeur.terrainId),
        intitule: valeur.intitule.trim(),
        typeProjet: valeur.typeProjet,
        programme: texte(valeur.programme),
        adresse: texte(valeur.adresse),
        commune: texte(valeur.commune),
        region: texte(valeur.region),
        surfaceBatie: valeur.surfaceBatie ?? undefined,
        nombreNiveaux: valeur.nombreNiveaux ?? undefined,
        montantDevis: valeur.montantDevis ?? undefined,
        budgetPrevu: valeur.budgetPrevu ?? undefined,
        dateDebutPrevue: texte(valeur.dateDebutPrevue),
        dateFinPrevue: texte(valeur.dateFinPrevue),
        avecJalonsType: valeur.avecJalonsType,
        notes: texte(valeur.notes),
      })
      .subscribe({
        next: (chantier) => {
          this.saving.set(false);
          this.notify.success(`Chantier ${chantier.referenceInterne} créé`);
          void this.router.navigate([
            '/construction/chantiers',
            chantier.id,
          ]);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Création impossible');
        },
      });
  }
}
