import { Component, OnInit, inject, signal } from '@angular/core';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucideSave } from '@lucide/angular';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { CommercialSummary, CreateProspectPayload, ProspectDetail, ProspectOptions } from '../../../core/models/prospect.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { CONTACT_CHANNELS, INTEREST_LEVELS, PURCHASE_GOALS, SOURCES, label } from '../crm-status';

/** Au moins un moyen de contact (téléphone ou e-mail). */
function contactValidator(group: AbstractControl): ValidationErrors | null {
  const email = (group.get('email')?.value as string) ?? '';
  const telephone = (group.get('telephone')?.value as string) ?? '';
  return email.trim() || telephone.trim() ? null : { contact: true };
}

/** Budget max ≥ budget min quand les deux sont renseignés. */
function budgetValidator(group: AbstractControl): ValidationErrors | null {
  const min = group.get('budgetMin')?.value as number | null;
  const max = group.get('budgetMax')?.value as number | null;
  return min !== null && max !== null && min > max ? { budget: true } : null;
}

/** Score interne (tri, statistiques) déduit du niveau d'intérêt saisi. */
const INTEREST_SCORE: Record<string, number> = { faible: 25, moyen: 50, fort: 75, tres_interesse: 100 };

/**
 * Fiche prospect (cahier CRM § 3 et 4) : qui il est, comment il est arrivé,
 * ce qu'il cherche, et la suite à donner. Les étapes du parcours se changent
 * depuis la fiche, pas ici.
 */
@Component({
  selector: 'app-prospect-form',
  imports: [MoneyPipe, ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideArrowLeft, LucideSave],
  templateUrl: './prospect-form.html',
  styleUrl: './prospect-form.scss',
})
export class ProspectForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly notify = inject(NotificationService);

  protected readonly prospectId: string | null = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = this.prospectId !== null;
  protected readonly loading = signal(this.isEdit);
  protected readonly saving = signal(false);
  protected readonly commercials = signal<CommercialSummary[]>([]);
  protected readonly isSupervisor = this.session.hasSupervisionScope('crm');
  protected readonly options = signal<Pick<ProspectOptions, 'sourcesAcquisition' | 'niveauxInteret' | 'moyensContact' | 'objectifsAchat' | 'typesDocumentSouhaite'>>({
    sourcesAcquisition: [],
    niveauxInteret: [],
    moyensContact: [],
    objectifsAchat: [],
    typesDocumentSouhaite: [],
  });

  protected readonly sourceLabel = (value: string) => label(SOURCES, value);
  protected readonly interestLabel = (value: string) => label(INTEREST_LEVELS, value);
  protected readonly channelLabel = (value: string) => label(CONTACT_CHANNELS, value);
  protected readonly goalLabel = (value: string) => label(PURCHASE_GOALS, value);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      // Qui est-ce
      nom: ['', [Validators.required, Validators.maxLength(150)]],
      prenom: ['', Validators.maxLength(150)],
      telephone: ['', Validators.maxLength(30)],
      whatsapp: [false],
      email: ['', [Validators.email, Validators.maxLength(200)]],
      villeResidence: [''],
      paysResidence: ['Sénégal'],
      sourceAcquisition: [''],
      niveauInteret: [''],
      // Premier contact
      premierContactLe: [null as Date | null],
      premierContactMoyen: [''],
      // Ce qu'il cherche
      zoneRecherchee: [''],
      surfaceSouhaitee: [null as number | null, Validators.min(0)],
      budgetMin: [null as number | null, Validators.min(0)],
      budgetMax: [null as number | null, Validators.min(0)],
      typeDocumentSouhaite: [''],
      objectifAchat: [''],
      besoins: [''],
      preferences: [''],
      // Suivi
      prochaineAction: ['', Validators.maxLength(200)],
      prochaineRelanceLe: [null as Date | null],
      commercialResponsableId: [''],
    },
    { validators: [contactValidator, budgetValidator] },
  );

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) =>
        this.options.set({
          sourcesAcquisition: options.sourcesAcquisition ?? [],
          niveauxInteret: options.niveauxInteret ?? [],
          moyensContact: options.moyensContact ?? [],
          objectifsAchat: options.objectifsAchat ?? [],
          typesDocumentSouhaite: options.typesDocumentSouhaite ?? [],
        }),
      error: () => undefined,
    });
    if (this.isSupervisor) this.api.getCommercials().subscribe({ next: (list) => this.commercials.set(list), error: () => this.commercials.set([]) });
    if (this.prospectId) {
      this.api.findOne(this.prospectId).subscribe({
        next: (prospect) => this.hydrate(prospect),
        error: (error: unknown) => {
          this.notify.error(error, 'Prospect introuvable');
          this.goBack();
        },
      });
    }
  }

  protected goBack(): void {
    if (this.prospectId) void this.router.navigate(['/crm/prospects', this.prospectId]);
    else void this.router.navigate(['/crm/prospects']);
  }

  protected submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const message = this.form.hasError('contact')
        ? 'Indiquez au moins un téléphone ou un e-mail.'
        : this.form.hasError('budget')
          ? 'Le budget maximum doit être supérieur au minimum.'
          : 'Complétez les champs signalés.';
      this.notify.info(message);
      return;
    }
    this.saving.set(true);
    const payload = this.toPayload();
    const request$ = this.prospectId ? this.api.update(this.prospectId, payload) : this.api.create({ ...payload, statutPipeline: 'nouveau' });
    request$.subscribe({
      next: (prospect) => {
        this.saving.set(false);
        this.notify.success(this.prospectId ? 'Prospect mis à jour' : 'Prospect créé — programmez maintenant la première action');
        void this.router.navigate(['/crm/prospects', prospect.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Impossible d’enregistrer le prospect');
      },
    });
  }

  private hydrate(prospect: ProspectDetail): void {
    this.form.patchValue({
      nom: prospect.nom,
      prenom: prospect.prenom ?? '',
      telephone: prospect.telephone ?? '',
      whatsapp: prospect.whatsapp ?? false,
      email: prospect.email ?? '',
      villeResidence: prospect.villeResidence ?? '',
      paysResidence: prospect.paysResidence ?? '',
      sourceAcquisition: prospect.sourceAcquisition ?? '',
      niveauInteret: prospect.niveauInteret ?? '',
      premierContactLe: prospect.premierContactLe ? new Date(prospect.premierContactLe) : null,
      premierContactMoyen: prospect.premierContactMoyen ?? '',
      zoneRecherchee: prospect.zoneRecherchee ?? '',
      surfaceSouhaitee: prospect.surfaceSouhaitee,
      budgetMin: prospect.budgetMin,
      budgetMax: prospect.budgetMax,
      typeDocumentSouhaite: prospect.typeDocumentSouhaite ?? '',
      objectifAchat: prospect.objectifAchat ?? '',
      besoins: prospect.besoins ?? '',
      preferences: prospect.preferences ?? '',
      prochaineAction: prospect.prochaineAction ?? '',
      prochaineRelanceLe: prospect.prochaineRelanceLe ? new Date(prospect.prochaineRelanceLe) : null,
      commercialResponsableId: prospect.commercialResponsable?.id ?? '',
    });
    this.loading.set(false);
  }

  private toPayload(): CreateProspectPayload {
    const value = this.form.getRawValue();
    const text = (item: string) => (item.trim() ? item.trim() : undefined);
    const day = (date: Date | null) => (date ? date.toISOString() : undefined);
    return {
      nom: value.nom.trim(),
      prenom: text(value.prenom),
      telephone: text(value.telephone),
      whatsapp: value.whatsapp,
      email: text(value.email),
      villeResidence: text(value.villeResidence),
      paysResidence: text(value.paysResidence),
      sourceAcquisition: text(value.sourceAcquisition),
      niveauInteret: text(value.niveauInteret),
      premierContactLe: day(value.premierContactLe),
      premierContactMoyen: text(value.premierContactMoyen),
      zoneRecherchee: text(value.zoneRecherchee),
      surfaceSouhaitee: value.surfaceSouhaitee ?? undefined,
      budgetMin: value.budgetMin ?? undefined,
      budgetMax: value.budgetMax ?? undefined,
      typeDocumentSouhaite: text(value.typeDocumentSouhaite),
      objectifAchat: text(value.objectifAchat),
      besoins: text(value.besoins),
      preferences: text(value.preferences),
      prochaineAction: text(value.prochaineAction),
      prochaineRelanceLe: day(value.prochaineRelanceLe),
      // Le score interne suit le niveau d'intérêt : une seule notion à saisir.
      score: INTEREST_SCORE[value.niveauInteret] ?? 0,
      commercialResponsableId: value.commercialResponsableId || undefined,
    };
  }
}
