import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideArrowLeft } from '@lucide/angular';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import { ProprietaireDialog } from '../../terrains/proprietaire-dialog';
import type { CreateMandatPayload, MandatDetail, ProprietaireSummary } from '../../../core/models/mandat.model';

@Component({
  selector: 'app-mandat-form',
  imports: [FormsModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, LucideArrowLeft],
  templateUrl: './mandat-form.html',
  styleUrl: './mandat-form.scss',
})
export class MandatForm implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly api: MandatsApiService = inject(MandatsApiService);
  private readonly formBuilder: FormBuilder = inject(FormBuilder);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected mandatId: string | null = null;
  protected mandat: MandatDetail | null = null;
  protected saving = false;
  protected options = { typeMandat: [], statut: [] } as { typeMandat: string[]; statut: string[] };
  protected proprietaires: ProprietaireSummary[] = [];

  protected addProprietaire(): void {
    const ref = this.dialog.open(ProprietaireDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
    });
    ref.afterClosed().subscribe((payload: Omit<ProprietaireSummary, 'id'> | undefined) => {
      if (!payload) return;
      this.api.createProprietaire(payload).subscribe({
        next: (proprietaire) => {
          this.proprietaires = [...this.proprietaires, proprietaire].sort((a, b) =>
            `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`),
          );
          this.form.controls.proprietaireId.setValue(proprietaire.id);
          this.snackBar.open('Propriétaire créé et sélectionné', 'Fermer', { duration: 3000 });
        },
        error: (error: HttpErrorResponse) => {
          this.snackBar.open(this.getApiErrorMessage(error), 'Fermer', { duration: 4000 });
        },
      });
    });
  }

  protected readonly form = this.formBuilder.nonNullable.group({
    referenceInterne: ['', [Validators.required, Validators.maxLength(100)]],
    proprietaireId: ['', Validators.required],
    commercialResponsableId: [''],
    typeMandat: ['', Validators.required],
    dateDebut: ['', Validators.required],
    dateFin: ['', Validators.required],
    exclusivite: [false],
    prixConditions: [''],
    commissions: [''],
    clauses: [''],
    restrictionsContractuelles: [''],
    objectifsCommercialisation: [''],
    alerteEcheanceJours: [30, [Validators.min(1)]],
    statut: ['Brouillon', Validators.required],
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({ next: (options) => { this.options = options; } });
    this.api.getProprietaires().subscribe({ next: (proprietaires) => { this.proprietaires = proprietaires; } });
    this.mandatId = this.route.snapshot.paramMap.get('id');
    if (this.mandatId) {
      this.api.findOne(this.mandatId).subscribe({
        next: (mandat) => {
          this.mandat = mandat;
          this.form.patchValue(this.toFormValue(mandat));
        },
        error: () => this.goBack(),
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const value = this.form.getRawValue();
    const payload = this.cleanPayload(value);
    const request$ = this.mandatId ? this.api.update(this.mandatId, payload) : this.api.create(payload);
    request$.subscribe({
      next: (mandat: MandatDetail) => {
        this.saving = false;
        this.snackBar.open(this.mandatId ? 'Mandat mis à jour' : 'Mandat créé', 'Fermer', { duration: 3000 });
        this.router.navigate(['/mandats', mandat.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.snackBar.open(this.getApiErrorMessage(error), 'Fermer', { duration: 4000 });
      },
    });
  }

  protected goBack(): void { this.router.navigate(['/mandats']); }

  private toFormValue(mandat: MandatDetail) {
    return {
      referenceInterne: mandat.referenceInterne,
      proprietaireId: mandat.proprietaire?.id ?? '',
      commercialResponsableId: mandat.commercialResponsable?.id ?? '',
      typeMandat: mandat.typeMandat,
      dateDebut: mandat.dateDebut,
      dateFin: mandat.dateFin,
      exclusivite: !!mandat.exclusivite,
      prixConditions: mandat.prixConditions ?? '',
      commissions: mandat.commissions ?? '',
      clauses: mandat.clauses ?? '',
      restrictionsContractuelles: mandat.restrictionsContractuelles ? JSON.stringify(mandat.restrictionsContractuelles, null, 2) : '',
      objectifsCommercialisation: mandat.objectifsCommercialisation ?? '',
      alerteEcheanceJours: mandat.alerteEcheanceJours ?? 30,
      statut: mandat.statut,
    };
  }

  private cleanPayload(value: ReturnType<typeof this.form.getRawValue>): CreateMandatPayload {
    let restrictionsContractuelles: Record<string, unknown> | undefined;
    try {
      restrictionsContractuelles = value.restrictionsContractuelles ? JSON.parse(value.restrictionsContractuelles) : undefined;
    } catch {
      restrictionsContractuelles = { raw: value.restrictionsContractuelles };
    }

    const stringFields = ['prixConditions', 'commissions', 'clauses', 'objectifsCommercialisation', 'restrictionsContractuelles'] as const;
    const cleaned: Record<string, unknown> = { ...value, restrictionsContractuelles };
    for (const field of stringFields) {
      if (typeof cleaned[field] === 'string' && cleaned[field].trim() === '') {
        cleaned[field] = undefined;
      }
    }
    if (!(cleaned['commercialResponsableId'] as string | undefined)) cleaned['commercialResponsableId'] = undefined;
    return cleaned as unknown as CreateMandatPayload;
  }

  private getApiErrorMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message.trim()) return message;
    return 'Impossible d’enregistrer le mandat';
  }
}
