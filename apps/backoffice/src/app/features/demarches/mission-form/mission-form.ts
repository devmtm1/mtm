import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucideSave } from '@lucide/angular';
import { DemarchesApiService } from '../../../core/services/api/demarches-api.service';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type { MissionOptions } from '../../../core/models/mission.model';
import type { ProspectListItem } from '../../../core/models/prospect.model';
import type { TerrainCatalogueItem } from '../../../core/models/terrain.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { TYPES_VERIFICATION, URGENCES, label } from '../mission-status';

/**
 * Étape 1 du cahier des charges : enregistrer la demande du client.
 *
 * Le terrain peut ne pas exister au catalogue — c'est même le cas courant :
 * un client de la diaspora fait vérifier un terrain qu'on lui propose
 * ailleurs. La localisation libre suffit alors.
 */
@Component({
  selector: 'app-mission-form',
  imports: [
    MoneyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideArrowLeft,
    LucideSave,
  ],
  templateUrl: './mission-form.html',
  styleUrl: './mission-form.scss',
})
export class MissionForm implements OnInit {
  private readonly api = inject(DemarchesApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  protected readonly saving = signal(false);
  protected readonly options = signal<Partial<MissionOptions>>({});
  protected readonly clients = signal<ProspectListItem[]>([]);
  protected readonly terrains = signal<TerrainCatalogueItem[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    prospectId: ['', Validators.required],
    typeVerification: ['verification_fonciere', Validators.required],
    objectif: [''],
    terrainId: [''],
    localisation: [''],
    commune: [''],
    region: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
    piecesFournies: [''],
    urgence: ['normale'],
    budgetAnnonce: [null as number | null],
    dateEcheance: [''],
  });

  /** Tarif indicatif du type choisi, proposé comme repère au collaborateur. */
  protected readonly tarifIndicatif = computed(() => {
    const tarifs = this.options().tarifs ?? {};
    return tarifs[this.form.controls.typeVerification.value] ?? null;
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set({}),
    });
    // Une mission se rattache toujours à un client : on liste les fiches
    // existantes plutôt que de laisser saisir un nom en double.
    this.crmApi.findAll({ pageSize: 200 }).subscribe({
      next: (page) => this.clients.set(page.items),
      error: () => this.clients.set([]),
    });
    this.terrainsApi.catalogueProposition().subscribe({
      next: (items) => this.terrains.set(items),
      error: () => this.terrains.set([]),
    });

    const prospectId = this.route.snapshot.queryParamMap.get('prospectId');
    if (prospectId) this.form.patchValue({ prospectId });
  }

  protected nomClient(client: ProspectListItem): string {
    const nom = [client.prenom, client.nom].filter(Boolean).join(' ');
    return client.referenceInterne ? `${client.referenceInterne} · ${nom}` : nom;
  }

  protected typeLabel(type: string): string {
    return label(TYPES_VERIFICATION, type);
  }

  protected urgenceLabel(urgence: string): string {
    return label(URGENCES, urgence);
  }

  protected retour(): void {
    void this.router.navigate(['/demarches/missions']);
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
        prospectId: valeur.prospectId,
        typeVerification: valeur.typeVerification,
        objectif: texte(valeur.objectif),
        terrainId: valeur.terrainId || undefined,
        localisation: texte(valeur.localisation),
        commune: texte(valeur.commune),
        region: texte(valeur.region),
        latitude: valeur.latitude ?? undefined,
        longitude: valeur.longitude ?? undefined,
        piecesFournies: texte(valeur.piecesFournies),
        urgence: valeur.urgence,
        budgetAnnonce: valeur.budgetAnnonce ?? undefined,
        dateEcheance: valeur.dateEcheance
          ? new Date(valeur.dateEcheance).toISOString()
          : undefined,
      })
      .subscribe({
        next: (mission) => {
          this.saving.set(false);
          this.notify.success(
            `Mission ${mission.referenceInterne ?? ''} enregistrée`,
          );
          void this.router.navigate(['/demarches/missions', mission.id]);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }
}
