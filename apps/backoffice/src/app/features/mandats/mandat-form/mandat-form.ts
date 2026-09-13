import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideArrowLeft, LucidePlus, LucideSave } from '@lucide/angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { CreateMandatPayload, MandatDetail, MandatOptions, ProprietaireSummary } from '../../../core/models/mandat.model';
import type { CommercialSummary } from '../../../core/models/prospect.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { ProprietaireDialog } from '../../terrains/proprietaire-dialog';
import { MANDAT_STATUS, RESTRICTION_OPTIONS, TYPE_MANDAT_HELP, joursRestants, statusHelp } from '../mandat-status';

/** La date de fin doit suivre la date de début. */
function periodValidator(group: AbstractControl): ValidationErrors | null {
  const debut = group.get('dateDebut')?.value as string;
  const fin = group.get('dateFin')?.value as string;
  return debut && fin && fin < debut ? { period: true } : null;
}

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

/**
 * Création / modification d'un mandat (J1.4). Un seul écran en trois blocs :
 * les parties, le contrat, les conditions. Les restrictions contractuelles
 * sont des cases à cocher (plus de JSON à saisir).
 */
@Component({
  selector: 'app-mandat-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucidePlus,
    LucideSave,
  ],
  templateUrl: './mandat-form.html',
  styleUrl: './mandat-form.scss',
})
export class MandatForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(MandatsApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mandatId: string | null = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = this.mandatId !== null;
  protected readonly loading = signal(this.isEdit);
  protected readonly saving = signal(false);
  protected readonly options = signal<MandatOptions>({ typeMandat: [], statut: [], statutLot: [], documentTypes: [] });
  protected readonly proprietaires = signal<ProprietaireSummary[]>([]);
  protected readonly commercials = signal<CommercialSummary[]>([]);
  protected readonly restrictionOptions = RESTRICTION_OPTIONS;
  protected readonly mandatStatus = MANDAT_STATUS;
  protected readonly typeHelp = TYPE_MANDAT_HELP;

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      referenceInterne: ['', [Validators.required, Validators.maxLength(100)]],
      proprietaireId: ['', Validators.required],
      commercialResponsableId: [''],
      typeMandat: ['', Validators.required],
      dateDebut: [toDateInput(new Date().toISOString()), Validators.required],
      dateFin: ['', Validators.required],
      exclusivite: [false],
      alerteEcheanceJours: [30, [Validators.min(1), Validators.max(365)]],
      statut: ['Brouillon', Validators.required],
      prixConditions: [''],
      commissions: [''],
      clauses: [''],
      restrictions: this.formBuilder.nonNullable.group(
        Object.fromEntries(RESTRICTION_OPTIONS.map((option) => [option.key, [false]])) as Record<string, [boolean]>,
      ),
      restrictionsAutres: [''],
      objectifsCommercialisation: [''],
    },
    { validators: periodValidator },
  );

  private readonly formValue = signal(this.form.getRawValue());

  /** Durée lisible du contrat, recalculée en direct. */
  protected readonly duration = computed(() => {
    const { dateDebut, dateFin } = this.formValue();
    if (!dateDebut || !dateFin || dateFin < dateDebut) return null;
    const days = Math.round((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86_400_000);
    const months = Math.round(days / 30.44);
    const remaining = joursRestants(dateFin);
    return { days, months, remaining };
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => {
        this.options.set(options);
        if (!this.isEdit && !this.form.controls.typeMandat.value && options.typeMandat.length) this.form.controls.typeMandat.setValue(options.typeMandat[0]);
      },
    });
    this.api.getProprietaires().subscribe({ next: (list) => this.proprietaires.set(list) });
    if (this.session.hasPermission('crm:consulter')) {
      this.crmApi
        .getCommercials()
        .pipe(catchError(() => of([] as CommercialSummary[])))
        .subscribe((list) => this.commercials.set(list));
    }
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.formValue.set(this.form.getRawValue()));

    const preselected = this.route.snapshot.queryParamMap.get('proprietaireId');
    if (preselected) this.form.controls.proprietaireId.setValue(preselected);

    if (this.mandatId) {
      this.api.findOne(this.mandatId).subscribe({
        next: (mandat) => this.hydrate(mandat),
        error: (error: unknown) => {
          this.notify.error(error, 'Mandat introuvable');
          this.goBack();
        },
      });
    }
  }

  protected help(value: string | null | undefined): string {
    return statusHelp(MANDAT_STATUS, value);
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
            this.notify.success('Propriétaire créé et sélectionné');
          },
          error: (error: unknown) => this.notify.error(error, 'Impossible de créer le propriétaire'),
        });
      });
  }

  protected submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.info(this.form.hasError('period') ? 'La date de fin doit être postérieure à la date de début.' : 'Complétez les champs obligatoires signalés.');
      return;
    }
    this.saving.set(true);
    const payload = this.toPayload();
    const request$ = this.mandatId ? this.api.update(this.mandatId, payload) : this.api.create(payload);
    request$.subscribe({
      next: (mandat) => {
        this.saving.set(false);
        this.notify.success(this.mandatId ? 'Mandat mis à jour' : 'Mandat créé — rattachez maintenant les terrains concernés');
        void this.router.navigate(['/mandats', mandat.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Impossible d’enregistrer le mandat');
      },
    });
  }

  protected goBack(): void {
    if (this.mandatId) void this.router.navigate(['/mandats', this.mandatId]);
    else void this.router.navigate(['/mandats']);
  }

  protected controlInvalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && control.touched;
  }

  private hydrate(mandat: MandatDetail): void {
    const restrictions = mandat.restrictionsContractuelles ?? {};
    this.form.patchValue({
      referenceInterne: mandat.referenceInterne,
      proprietaireId: mandat.proprietaire?.id ?? '',
      commercialResponsableId: mandat.commercialResponsable?.id ?? '',
      typeMandat: mandat.typeMandat,
      dateDebut: toDateInput(mandat.dateDebut),
      dateFin: toDateInput(mandat.dateFin),
      exclusivite: !!mandat.exclusivite,
      alerteEcheanceJours: mandat.alerteEcheanceJours ?? 30,
      statut: mandat.statut,
      prixConditions: mandat.prixConditions ?? '',
      commissions: mandat.commissions ?? '',
      clauses: mandat.clauses ?? '',
      restrictions: Object.fromEntries(RESTRICTION_OPTIONS.map((option) => [option.key, restrictions[option.key] === true])),
      restrictionsAutres: typeof restrictions['autres'] === 'string' ? restrictions['autres'] : typeof restrictions['raw'] === 'string' ? restrictions['raw'] : '',
      objectifsCommercialisation: mandat.objectifsCommercialisation ?? '',
    });
    this.formValue.set(this.form.getRawValue());
    this.loading.set(false);
  }

  private toPayload(): CreateMandatPayload {
    const value = this.form.getRawValue();
    const restrictions: Record<string, unknown> = {};
    for (const option of RESTRICTION_OPTIONS) {
      if (value.restrictions[option.key]) restrictions[option.key] = true;
    }
    if (value.restrictionsAutres.trim()) restrictions['autres'] = value.restrictionsAutres.trim();
    const text = (item: string) => (item.trim() ? item.trim() : undefined);
    return {
      referenceInterne: value.referenceInterne.trim(),
      proprietaireId: value.proprietaireId,
      commercialResponsableId: value.commercialResponsableId || undefined,
      typeMandat: value.typeMandat,
      dateDebut: value.dateDebut,
      dateFin: value.dateFin,
      exclusivite: value.exclusivite,
      alerteEcheanceJours: value.alerteEcheanceJours,
      statut: value.statut,
      prixConditions: text(value.prixConditions),
      commissions: text(value.commissions),
      clauses: text(value.clauses),
      restrictionsContractuelles: Object.keys(restrictions).length ? restrictions : undefined,
      objectifsCommercialisation: text(value.objectifsCommercialisation),
    };
  }
}
