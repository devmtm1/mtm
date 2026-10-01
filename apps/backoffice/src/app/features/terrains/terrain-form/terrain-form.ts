import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  LucideArrowLeft,
  LucideCheck,
  LucideFileText,
  LucideImage,
  LucideMapPin,
  LucidePlus,
  LucideSave,
  LucideTrash2,
  LucideUpload,
} from '@lucide/angular';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import type { CommercialSummary } from '../../../core/models/prospect.model';
import type { CreateTerrainPayload, ProprietaireSummary, TerrainDetail, TerrainPointInteret } from '../../../core/models/terrain.model';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ProprietaireDialog } from '../proprietaire-dialog';
import {
  COMMERCIAL_STATUS,
  ETAT_BIEN,
  LEGAL_STATUS,
  TYPE_BIEN,
  VERIFICATION_STATUS,
  etatBienLabel,
  statusHelp,
  typeBienLabel,
  vocationLabel,
} from '../terrain-status';

interface SelectedAsset {
  file: File;
  kind: 'media' | 'documents';
  type: string;
  title: string;
  isPublic: boolean;
  preview: string | null;
}

interface Step {
  index: number;
  title: string;
  hint: string;
  /** Contrôles dont la validité conditionne le passage à l'étape suivante. */
  controls: string[];
}

export const STEPS: Step[] = [
  { index: 1, title: 'Identité', hint: 'Qui est propriétaire, quel titre, quelle référence', controls: ['referenceInterne', 'nom', 'statutJuridique', 'niveauVerification'] },
  { index: 2, title: 'Localisation', hint: 'Où se trouve le bien et ce qu’il y a autour', controls: ['latitude', 'longitude', 'superficie'] },
  { index: 3, title: 'Prix et publication', hint: 'Ce que voit le public, ce qui reste interne', controls: ['prixAcquisition', 'prixPublic', 'commission', 'statutCommercial'] },
  { index: 4, title: 'Photos et documents', hint: 'Ce qui illustre et justifie la fiche', controls: [] },
];

/**
 * Création / modification d'un terrain (J1.1). Le formulaire est découpé en
 * quatre étapes courtes, chacune expliquant à quoi servent ses champs. En
 * modification, l'enregistrement est possible depuis n'importe quelle étape.
 */
/** Champs qui n'ont de sens que sur un bien bâti (voir TerrainsService). */
const CHAMPS_BATI = [
  'surfaceHabitable',
  'nombrePieces',
  'nombreChambres',
  'nombreSallesEau',
  'niveaux',
  'anneeConstruction',
  'etatBien',
] as const;

@Component({
  selector: 'app-terrain-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucideCheck,
    LucideFileText,
    LucideImage,
    LucideMapPin,
    LucidePlus,
    LucideSave,
    LucideTrash2,
    LucideUpload,
  ],
  templateUrl: './terrain-form.html',
  styleUrl: './terrain-form.scss',
})
export class TerrainForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(TerrainsApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly money = new MoneyPipe();

  private original: { statutJuridique: string; niveauVerification: string; prixAcquisition: number | null; marge: number | null; commission: number | null; proprietaireId: string } | null = null;

  protected readonly steps = STEPS;
  protected readonly terrainId: string | null = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = this.terrainId !== null;
  protected readonly loading = signal(this.isEdit);
  protected readonly saving = signal(false);
  protected readonly currentStep = signal(1);
  protected readonly options = signal<{
    statutJuridique: string[];
    niveauVerification: string[];
    statutCommercial: string[];
    typeBien: string[];
    nombrePieces: string[];
    etatBien: string[];
    typesBati: string[];
    vocation: string[];
  }>({
    statutJuridique: [],
    niveauVerification: [],
    statutCommercial: [],
    typeBien: [],
    nombrePieces: [],
    etatBien: [],
    typesBati: [],
    vocation: [],
  });
  protected readonly proprietaires = signal<ProprietaireSummary[]>([]);
  /** Commerciaux affectables : réservé à l'encadrement (un commercial est rattaché d'office). */
  protected readonly commercials = signal<CommercialSummary[]>([]);
  protected readonly canAssign = this.session.hasSupervisionScope('terrains');
  protected readonly selectedAssets = signal<SelectedAsset[]>([]);
  protected readonly canValidate = this.session.hasPermission('terrains:valider');
  protected readonly canPublish = this.session.hasPermission('terrains:publier') || this.session.hasRole('administrateur') || this.session.hasRole('direction');
  protected readonly canViewFinancials =
    this.session.hasPermission('terrains:consulter_financier') || this.session.hasRole('administrateur') || this.session.hasRole('direction');

  protected readonly form = this.formBuilder.group({
    referenceInterne: ['', [Validators.required, Validators.maxLength(100)]],
    nom: ['', [Validators.required, Validators.maxLength(200)]],
    parcelleMatricule: [''],
    proprietaireId: [''],
    commercialResponsableId: [''],
    statutJuridique: ['Régularisation en cours', Validators.required],
    typeDocumentFoncier: [''],
    niveauVerification: ['Non vérifié', Validators.required],
    region: [''],
    commune: [''],
    localisationDetail: [''],
    latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
    typeBien: ['terrain'],
    superficie: [null as number | null, Validators.min(0)],
    uniteSuperficie: ['m²'],
    dimensions: [''],
    // Caractéristiques du bâti : l'API les refuse sur un terrain nu, et
    // `cleanPayload` ne les envoie donc que pour un bien construit.
    surfaceHabitable: [null as number | null, Validators.min(0)],
    nombrePieces: [''],
    nombreChambres: [null as number | null, [Validators.min(0), Validators.max(50)]],
    nombreSallesEau: [null as number | null, [Validators.min(0), Validators.max(50)]],
    niveaux: [null as number | null, [Validators.min(0), Validators.max(50)]],
    anneeConstruction: [null as number | null, [Validators.min(1900), Validators.max(2200)]],
    etatBien: [''],
    prixAcquisition: [null as number | null, Validators.min(0)],
    prixPublic: [null as number | null, Validators.min(0)],
    marge: [null as number | null],
    commission: [null as number | null, Validators.min(0)],
    statutCommercial: ['Brouillon', Validators.required],
    misEnAvant: [false],
    accesRoutier: [''],
    eauDisponible: [null as boolean | null],
    electriciteDisponible: [null as boolean | null],
    voisinage: [''],
    vocation: [''],
    proximiteAxes: [''],
    description: [''],
    notesInternes: [''],
    justification: [''],
    pointsInteret: this.formBuilder.array<ReturnType<typeof this.buildPointInteretGroup>>([]),
  });

  /** Valeur courante du formulaire sous forme de signal (pour les calculs d'aide). */
  private readonly formValue = signal(this.form.getRawValue());

  /**
   * Le bien est-il construit ? La liste des types bâtis vient de l'API : les
   * écrans n'ont pas à deviner qu'un studio l'est et un terrain non. Elle
   * commande l'affichage de la section « bâti » et son envoi à l'API.
   */
  protected readonly estBati = computed(() => {
    const types = this.options().typesBati;
    const type = this.formValue().typeBien ?? 'terrain';
    // Avant le chargement des options, on se fie au seul cas certain.
    return types.length ? types.includes(type) : type !== 'terrain';
  });

  protected readonly typeBienLabel = typeBienLabel;
  protected readonly etatBienLabel = etatBienLabel;
  protected readonly vocationLabel = vocationLabel;

  protected typeBienAide(valeur: string | null | undefined): string {
    return statusHelp(TYPE_BIEN, valeur);
  }

  protected etatBienAide(valeur: string | null | undefined): string {
    return statusHelp(ETAT_BIEN, valeur);
  }

  /** Marge calculée à titre indicatif : prix public − prix d'acquisition. */
  protected readonly computedMargin = computed(() => {
    const { prixPublic, prixAcquisition } = this.formValue();
    if (prixPublic === null || prixAcquisition === null) return null;
    return Number(prixPublic) - Number(prixAcquisition);
  });

  /** Une justification est exigée quand une donnée sensible change (section 8 CDC). */
  protected readonly justificationRequired = computed(() => {
    if (!this.original) return false;
    const value = this.formValue();
    return (
      this.toNumber(value.prixAcquisition) !== this.original.prixAcquisition ||
      this.toNumber(value.marge) !== this.original.marge ||
      this.toNumber(value.commission) !== this.original.commission ||
      (value.proprietaireId ?? '') !== this.original.proprietaireId
    );
  });

  /**
   * Le mot employé dans les titres, les aides et les exemples : « terrain »
   * quand on saisit une parcelle, « villa » quand on saisit une villa. Sans
   * cela, le formulaire parlait de terrain d'un bout à l'autre, y compris en
   * créant un appartement.
   */
  protected readonly motBien = computed(() =>
    typeBienLabel(this.formValue().typeBien || 'terrain').toLowerCase(),
  );

  protected readonly publicPreview = computed(() => {
    const value = this.formValue();
    const metres = (valeur: number | null) =>
      valeur ? `${Number(valeur).toLocaleString('fr-FR')} m²` : null;
    // L'aperçu reproduit la carte du site : sur un bien bâti, c'est
    // l'habitable et la typologie que l'acheteur lit, pas la parcelle.
    const surface = this.estBati()
      ? [value.nombrePieces, metres(value.surfaceHabitable)].filter(Boolean).join(' · ')
      : metres(value.superficie);
    return {
      nom: value.nom || `Nom du ${this.motBien()}`,
      typeBien: typeBienLabel(value.typeBien || 'terrain'),
      location: [value.commune, value.region].filter(Boolean).join(', ') || 'Localisation',
      superficie: surface || 'Superficie',
      prix: this.money.transform(value.prixPublic),
      published: value.statutCommercial === 'Disponible',
    };
  });

  protected readonly commercialStatus = COMMERCIAL_STATUS;
  protected readonly legalStatus = LEGAL_STATUS;
  protected readonly verificationStatus = VERIFICATION_STATUS;

  protected get pointsInteretArray(): FormArray {
    return this.form.controls.pointsInteret as FormArray;
  }

  ngOnInit(): void {
    this.api.getOptions().subscribe({ next: (options) => this.options.set(options) });
    this.api.getProprietaires().subscribe({ next: (proprietaires) => this.proprietaires.set(proprietaires) });
    if (this.canAssign && this.session.hasPermission('crm:consulter')) {
      this.crmApi
        .getCommercials()
        .pipe(catchError(() => of([] as CommercialSummary[])))
        .subscribe((list) => this.commercials.set(list));
    }
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.formValue.set(this.form.getRawValue()));

    const preselected = this.route.snapshot.queryParamMap.get('proprietaireId');
    if (preselected && !this.terrainId) this.form.controls.proprietaireId.setValue(preselected);

    if (this.terrainId) {
      this.api.findOne(this.terrainId).subscribe({
        next: (terrain) => this.hydrate(terrain),
        error: (error: unknown) => {
          this.notify.error(error, 'Terrain introuvable');
          this.goBack();
        },
      });
      // En modification, les statuts juridique / vérification se changent
      // depuis la fiche (dialogue dédié, tracé) : ici ils sont en lecture seule.
      this.form.controls.statutJuridique.disable();
      this.form.controls.niveauVerification.disable();
    } else if (!this.canValidate) {
      this.form.controls.statutJuridique.disable();
      this.form.controls.niveauVerification.disable();
    }
    if (!this.canPublish) this.form.controls.misEnAvant.disable();
  }

  // --- Navigation entre étapes -------------------------------------------

  protected goToStep(index: number): void {
    if (index > this.currentStep() && !this.validateUpTo(index - 1)) return;
    this.currentStep.set(index);
    document.querySelector('.shell__main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected nextStep(): void {
    if (this.currentStep() < STEPS.length) this.goToStep(this.currentStep() + 1);
    else this.submit();
  }

  protected previousStep(): void {
    if (this.currentStep() > 1) this.goToStep(this.currentStep() - 1);
  }

  protected stepHasError(step: Step): boolean {
    return step.controls.some((name) => {
      const control = this.form.get(name);
      return !!control && control.invalid && control.touched;
    });
  }

  protected stepIsComplete(step: Step): boolean {
    return step.index < this.currentStep() && !this.stepHasError(step);
  }

  private validateUpTo(stepIndex: number): boolean {
    for (const step of STEPS.filter((item) => item.index <= stepIndex)) {
      const invalid = step.controls.filter((name) => this.form.get(name)?.invalid);
      if (invalid.length) {
        invalid.forEach((name) => this.form.get(name)?.markAsTouched());
        this.currentStep.set(step.index);
        this.notify.info(`Complétez d’abord l’étape « ${step.title} » : un champ obligatoire manque ou est incorrect.`);
        return false;
      }
    }
    return true;
  }

  // --- Aides de saisie -----------------------------------------------------

  /** Accepte « 14.7167, -17.4677 » collé depuis Google Maps et remplit lat/lng. */
  protected pasteCoordinates(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    const match = text.match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
    if (!match) return;
    event.preventDefault();
    this.form.patchValue({ latitude: Number(match[1].replace(',', '.')), longitude: Number(match[2].replace(',', '.')) });
  }

  protected applyComputedMargin(): void {
    const margin = this.computedMargin();
    if (margin !== null) this.form.controls.marge.setValue(margin);
  }

  protected help(map: Record<string, { help: string }>, value: string | null | undefined): string {
    return statusHelp(map as never, value);
  }

  protected addPointInteret(): void {
    this.pointsInteretArray.push(this.buildPointInteretGroup());
  }

  protected removePointInteret(index: number): void {
    this.pointsInteretArray.removeAt(index);
  }

  protected addProprietaire(): void {
    this.dialog
      .open(ProprietaireDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((payload: Omit<ProprietaireSummary, 'id'> | undefined) => {
        if (!payload) return;
        this.api.createProprietaire(payload).subscribe({
          next: (proprietaire) => {
            this.proprietaires.update((list) => [...list, proprietaire].sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)));
            this.form.controls.proprietaireId.setValue(proprietaire.id);
            this.notify.success('Propriétaire ajouté et sélectionné');
          },
          error: (error: unknown) => this.notify.error(error, 'Impossible d’ajouter le propriétaire'),
        });
      });
  }

  // --- Fichiers ------------------------------------------------------------

  protected selectAssets(event: Event, kind: 'media' | 'documents'): void {
    const input = event.target as HTMLInputElement;
    const added = Array.from(input.files ?? []).map<SelectedAsset>((file) => ({
      file,
      kind,
      type: kind === 'media' ? (file.type.startsWith('video/') ? 'video' : 'photo') : 'document',
      title: file.name.replace(/\.[^.]+$/, ''),
      // Une photo est publique par défaut (c'est son but) ; un document reste interne.
      isPublic: kind === 'media' && this.canPublish,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    this.selectedAssets.update((list) => [...list, ...added]);
    input.value = '';
  }

  protected removeAsset(index: number): void {
    this.selectedAssets.update((list) => {
      const removed = list[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return list.filter((_, i) => i !== index);
    });
  }

  protected updateAsset(index: number, patch: Partial<SelectedAsset>): void {
    this.selectedAssets.update((list) => list.map((asset, i) => (i === index ? { ...asset, ...patch } : asset)));
  }

  // --- Enregistrement ------------------------------------------------------

  protected submit(): void {
    if (this.saving()) return;
    if (!this.validateUpTo(STEPS.length)) return;
    const value = this.form.getRawValue();
    if (this.justificationRequired() && !value.justification?.trim()) {
      this.form.controls.justification.markAsTouched();
      this.currentStep.set(3);
      this.notify.info('Indiquez la raison de la modification du prix, de la marge, de la commission ou du propriétaire.');
      return;
    }
    this.saving.set(true);
    const payload = this.cleanPayload(value);
    const request$ = this.terrainId ? this.api.update(this.terrainId, payload) : this.api.create(payload);
    request$.subscribe({
      next: (terrain) => {
        const uploads = this.selectedAssets().map((asset) => this.api.upload(terrain.id, asset.kind, asset.file, asset.type, asset.title, asset.isPublic));
        forkJoin(uploads.length ? uploads : [of(null)]).subscribe({
          next: () => {
            this.saving.set(false);
            this.notify.success(this.terrainId ? 'Terrain mis à jour' : 'Terrain créé');
            void this.router.navigate(['/terrains', terrain.id]);
          },
          error: (error: unknown) => {
            this.saving.set(false);
            this.notify.error(error, 'Terrain enregistré, mais un fichier n’a pas pu être envoyé');
            void this.router.navigate(['/terrains', terrain.id]);
          },
        });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Impossible d’enregistrer le terrain');
      },
    });
  }

  protected goBack(): void {
    if (this.terrainId) void this.router.navigate(['/terrains', this.terrainId]);
    else void this.router.navigate(['/terrains']);
  }

  // --- Interne -------------------------------------------------------------

  private buildPointInteretGroup(point: Partial<TerrainPointInteret> = {}) {
    return this.formBuilder.group({
      nom: [point.nom ?? '', [Validators.required, Validators.maxLength(150)]],
      type: [point.type ?? ''],
      distanceKm: [point.distanceKm ?? (null as number | null), Validators.min(0)],
    });
  }

  private hydrate(terrain: TerrainDetail): void {
    this.original = {
      statutJuridique: terrain.statutJuridique,
      niveauVerification: terrain.niveauVerification,
      prixAcquisition: this.toNumber(terrain.prixAcquisition),
      marge: this.toNumber(terrain.marge),
      commission: this.toNumber(terrain.commission),
      proprietaireId: terrain.proprietaire?.id ?? '',
    };
    this.form.patchValue({
      referenceInterne: terrain.referenceInterne,
      nom: terrain.nom,
      parcelleMatricule: terrain.parcelleMatricule ?? '',
      proprietaireId: terrain.proprietaire?.id ?? '',
      commercialResponsableId: terrain.commercialResponsable?.id ?? '',
      statutJuridique: terrain.statutJuridique,
      typeDocumentFoncier: terrain.typeDocumentFoncier ?? '',
      niveauVerification: terrain.niveauVerification,
      region: terrain.region ?? '',
      commune: terrain.commune ?? '',
      localisationDetail: terrain.localisationDetail ?? '',
      latitude: this.toNumber(terrain.latitude),
      longitude: this.toNumber(terrain.longitude),
      typeBien: terrain.typeBien ?? 'terrain',
      superficie: this.toNumber(terrain.superficie),
      surfaceHabitable: this.toNumber(terrain.surfaceHabitable),
      nombrePieces: terrain.nombrePieces ?? '',
      nombreChambres: terrain.nombreChambres,
      nombreSallesEau: terrain.nombreSallesEau,
      niveaux: terrain.niveaux,
      anneeConstruction: terrain.anneeConstruction,
      etatBien: terrain.etatBien ?? '',
      dimensions: typeof terrain.dimensions === 'string' ? terrain.dimensions : terrain.dimensions ? JSON.stringify(terrain.dimensions) : '',
      prixAcquisition: this.toNumber(terrain.prixAcquisition),
      prixPublic: this.toNumber(terrain.prixPublic),
      marge: this.toNumber(terrain.marge),
      commission: this.toNumber(terrain.commission),
      statutCommercial: terrain.statutCommercial,
      misEnAvant: !!terrain.misEnAvant,
      accesRoutier: terrain.accesRoutier ?? '',
      eauDisponible: terrain.eauDisponible,
      electriciteDisponible: terrain.electriciteDisponible,
      voisinage: terrain.voisinage ?? '',
      vocation: terrain.vocation ?? '',
      proximiteAxes: terrain.proximiteAxes ?? '',
      description: terrain.description ?? '',
      notesInternes: terrain.notesInternes ?? '',
    });
    this.pointsInteretArray.clear();
    (terrain.pointsInteret ?? []).forEach((point) => this.pointsInteretArray.push(this.buildPointInteretGroup(point)));
    this.formValue.set(this.form.getRawValue());
    this.loading.set(false);
  }

  private toNumber(value: number | string | null | undefined): number | null {
    return value === null || value === undefined || value === '' ? null : Number(value);
  }

  private cleanPayload(value: ReturnType<typeof this.form.getRawValue>): CreateTerrainPayload {
    const pointsInteret = (value.pointsInteret ?? [])
      .filter((point) => point.nom?.trim())
      .map((point) => ({ nom: point.nom!.trim(), type: point.type?.trim() || undefined, distanceKm: point.distanceKm ?? undefined }));
    const cleaned: Record<string, unknown> = {
      ...value,
      dimensions: value.dimensions?.trim() ? { description: value.dimensions.trim() } : undefined,
      pointsInteret: pointsInteret.length ? pointsInteret : undefined,
    };
    if (this.terrainId) {
      delete cleaned['statutJuridique'];
      delete cleaned['niveauVerification'];
    }
    // Une parcelle nue n'a ni pièces ni surface habitable : l'API rejette la
    // requête si ces champs l'accompagnent. On les retire plutôt que de
    // laisser passer une 400 incompréhensible après un changement de type.
    if (!this.estBati()) {
      for (const champ of CHAMPS_BATI) delete cleaned[champ];
    }
    for (const [key, item] of Object.entries(cleaned)) {
      if (typeof item === 'string' && item.trim() === '') cleaned[key] = undefined;
    }
    if (!this.justificationRequired()) delete cleaned['justification'];
    // Sans accès financier, la fiche nous a renvoyé des montants à `null` :
    // les réexpédier effacerait les vrais. L'API les ignore aussi de son
    // côté, mais autant ne pas les envoyer du tout.
    if (!this.canViewFinancials) {
      for (const champ of ['prixAcquisition', 'marge', 'commission']) {
        delete cleaned[champ];
      }
    }
    // Un commercial ne choisit pas le responsable : l'API le rattache lui-même.
    if (!this.canAssign) delete cleaned['commercialResponsableId'];
    return cleaned as unknown as CreateTerrainPayload;
  }

  protected controlInvalid(name: string): boolean {
    const control: AbstractControl | null = this.form.get(name);
    return !!control && control.invalid && control.touched;
  }
}
