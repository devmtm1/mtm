import { Component, OnInit, inject, signal } from '@angular/core';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { LucideArrowLeft, LucideSave } from '@lucide/angular';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { CommercialSummary, CreateProspectPayload, ProspectDetail } from '../../../core/models/prospect.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { SOURCE_OPTIONS } from '../crm-status';

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

/**
 * Création / modification d'un prospect (J1.5). Trois blocs : qui il est,
 * ce qu'il cherche, qui le suit. Le pipeline se change depuis la fiche.
 */
@Component({
  selector: 'app-prospect-form',
  imports: [MoneyPipe, ReactiveFormsModule, MatAutocompleteModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSliderModule, LucideArrowLeft, LucideSave],
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
  protected readonly sourceOptions = SOURCE_OPTIONS;

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      nom: ['', [Validators.required, Validators.maxLength(150)]],
      prenom: ['', Validators.maxLength(150)],
      telephone: ['', Validators.maxLength(30)],
      email: ['', [Validators.email, Validators.maxLength(200)]],
      paysResidence: ['Sénégal'],
      sourceAcquisition: [''],
      besoins: [''],
      budgetMin: [null as number | null, Validators.min(0)],
      budgetMax: [null as number | null, Validators.min(0)],
      preferences: [''],
      score: [0, [Validators.min(0), Validators.max(100)]],
      commercialResponsableId: [''],
    },
    { validators: [contactValidator, budgetValidator] },
  );

  ngOnInit(): void {
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

  protected scoreHint(): string {
    const score = this.form.controls.score.value;
    if (score >= 75) return 'Très chaud : projet précis, budget prêt.';
    if (score >= 50) return 'Intéressé : à relancer régulièrement.';
    if (score >= 25) return 'Tiède : projet à moyen terme.';
    return 'Faible : simple curiosité pour l’instant.';
  }

  protected goBack(): void {
    if (this.prospectId) void this.router.navigate(['/crm/prospects', this.prospectId]);
    else void this.router.navigate(['/crm/prospects']);
  }

  protected submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const message = this.form.hasError('contact') ? 'Indiquez au moins un téléphone ou un e-mail.' : this.form.hasError('budget') ? 'Le budget maximum doit être supérieur au minimum.' : 'Complétez les champs signalés.';
      this.notify.info(message);
      return;
    }
    this.saving.set(true);
    const payload = this.toPayload();
    const request$ = this.prospectId ? this.api.update(this.prospectId, payload) : this.api.create({ ...payload, statutPipeline: 'nouveau_contact' });
    request$.subscribe({
      next: (prospect) => {
        this.saving.set(false);
        this.notify.success(this.prospectId ? 'Prospect mis à jour' : 'Prospect créé — planifiez maintenant la première action');
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
      email: prospect.email ?? '',
      paysResidence: prospect.paysResidence ?? '',
      sourceAcquisition: prospect.sourceAcquisition ?? '',
      besoins: prospect.besoins ?? '',
      budgetMin: prospect.budgetMin,
      budgetMax: prospect.budgetMax,
      preferences: prospect.preferences ?? '',
      score: prospect.score ?? 0,
      commercialResponsableId: prospect.commercialResponsable?.id ?? '',
    });
    this.loading.set(false);
  }

  private toPayload(): CreateProspectPayload {
    const value = this.form.getRawValue();
    const text = (item: string) => (item.trim() ? item.trim() : undefined);
    return {
      nom: value.nom.trim(),
      prenom: text(value.prenom),
      telephone: text(value.telephone),
      email: text(value.email),
      paysResidence: text(value.paysResidence),
      sourceAcquisition: text(value.sourceAcquisition),
      besoins: text(value.besoins),
      budgetMin: value.budgetMin ?? undefined,
      budgetMax: value.budgetMax ?? undefined,
      preferences: text(value.preferences),
      score: value.score,
      commercialResponsableId: value.commercialResponsableId || undefined,
    };
  }
}
