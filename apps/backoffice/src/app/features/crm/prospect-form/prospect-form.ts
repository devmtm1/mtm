import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideArrowLeft } from '@lucide/angular';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { CreateProspectPayload, ProspectOptions } from '../../../core/models/prospect.model';

@Component({
  selector: 'app-prospect-form',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, LucideArrowLeft],
  templateUrl: './prospect-form.html',
  styleUrl: './prospect-form.scss',
})
export class ProspectForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly snack = inject(MatSnackBar);

  protected readonly options = signal<ProspectOptions | null>(null);
  protected readonly loading = signal(false);
  protected readonly isEdit = signal(false);
  protected readonly commercials = signal<{ id: string; firstName: string; lastName: string }[]>([]);

  readonly form = this.fb.group({
    nom: ['', Validators.required],
    prenom: [''],
    email: ['', Validators.email],
    telephone: [''],
    paysResidence: [''],
    sourceAcquisition: [''],
    budgetMin: [null as number | null],
    budgetMax: [null as number | null],
    score: [0, [Validators.min(0), Validators.max(100)]],
    besoins: [''],
    preferences: [''],
    commercialResponsableId: [''],
  });

  private savedStatutPipeline = 'nouveau_contact';
  private savedScore = 0;

  ngOnInit(): void {
    this.loadOptions();
    this.loadCommercials();
    const id = this.route.snapshot.paramMap.get('id');
    if (id && this.route.snapshot.url.some((s) => s.path === 'modifier')) {
      this.isEdit.set(true);
      this.loadProspect(id);
    }
  }

  protected goBack(): void { this.router.navigate(['/crm/prospects']); }

  protected submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const raw = this.form.getRawValue();
    const base = {
      nom: raw.nom ?? '',
      prenom: raw.prenom || undefined,
      email: raw.email || undefined,
      telephone: raw.telephone || undefined,
      paysResidence: raw.paysResidence || undefined,
      sourceAcquisition: raw.sourceAcquisition || undefined,
      besoins: raw.besoins || undefined,
      budgetMin: raw.budgetMin ?? undefined,
      budgetMax: raw.budgetMax ?? undefined,
      score: raw.score ?? 0,
      preferences: raw.preferences || undefined,
      commercialResponsableId: raw.commercialResponsableId || undefined,
    };

    if (this.isEdit()) {
      const payload: Partial<CreateProspectPayload> = {
        ...base,
        statutPipeline: this.savedStatutPipeline,
      };
      this.api.update((this.route.snapshot.paramMap.get('id') as string), payload).subscribe({
        next: () => { this.snack.open('Prospect mis à jour', 'Fermer', { duration: 3000 }); this.router.navigate(['/crm/prospects']); this.loading.set(false); },
        error: () => { this.snack.open('Erreur', 'Fermer', { duration: 4000 }); this.loading.set(false); },
      });
      return;
    }

    const payload: CreateProspectPayload = {
      ...base,
      statutPipeline: 'nouveau_contact',
    };
    this.api.create(payload).subscribe({
      next: () => { this.snack.open('Prospect créé', 'Fermer', { duration: 3000 }); this.router.navigate(['/crm/prospects']); this.loading.set(false); },
      error: () => { this.snack.open('Erreur', 'Fermer', { duration: 4000 }); this.loading.set(false); },
    });
  }

  private loadOptions(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.snack.open('Impossible de charger les options', 'Fermer', { duration: 4000 }),
    });
  }

  private loadCommercials(): void {
    this.api.getCommercials().subscribe({
      next: (list) => this.commercials.set(list),
      error: () => this.snack.open('Impossible de charger les commerciaux', 'Fermer', { duration: 4000 }),
    });
  }

  private loadProspect(id: string): void {
    this.api.findOne(id).subscribe({
      next: (prospect) => {
        this.savedStatutPipeline = prospect.statutPipeline;
        this.savedScore = prospect.score ?? 0;
        this.form.patchValue({
          nom: prospect.nom,
          prenom: prospect.prenom || '',
          email: prospect.email || '',
          telephone: prospect.telephone || '',
          paysResidence: prospect.paysResidence || '',
          sourceAcquisition: prospect.sourceAcquisition || '',
          budgetMin: prospect.budgetMin ?? null,
          budgetMax: prospect.budgetMax ?? null,
          score: prospect.score ?? 0,
          besoins: prospect.besoins || '',
          preferences: prospect.preferences || '',
          commercialResponsableId: prospect.commercialResponsable?.id || '',
        });
      },
      error: () => { this.snack.open('Prospect introuvable', 'Fermer', { duration: 4000 }); this.goBack(); },
    });
  }
}
