import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucidePlus } from '@lucide/angular';
import { LocatifApiService } from '../../../../core/services/api/locatif-api.service';
import { SessionService } from '../../../../core/services/session.service';
import type { ImmeubleDetail, LogementImmeuble } from '../../../../core/models/locatif.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  BIEN_STATUTS,
  TYPES_BIEN,
  TYPES_IMMEUBLE,
  label,
  nomPropre,
  pillClass,
  simpleLabel,
} from '../../locatif-status';
import { nombreOuUndefined } from '../../locatif-form';

/** Fiche d'une propriété : synthèse de ses logements, leur état et l'ajout d'un nouveau logement. */
@Component({
  selector: 'app-immeuble-detail',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MoneyPipe,
    LucideArrowLeft,
    LucidePlus,
  ],
  templateUrl: './immeuble-detail.html',
  styleUrl: './immeuble-detail.scss',
})
export class ImmeubleDetailPage implements OnInit {
  private readonly api = inject(LocatifApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly formBuilder = inject(FormBuilder);

  /** Squelette au premier chargement seulement : un rechargement après ajout garde la fiche affichée. */
  protected readonly loading = signal(true);
  protected readonly immeuble = signal<ImmeubleDetail | null>(null);
  protected readonly ajoutOuvert = signal(false);
  protected readonly saving = signal(false);
  protected readonly typesBien = Object.entries(TYPES_BIEN);
  protected readonly canCreate = computed(() => this.session.hasPermission('locatif:creer'));

  protected readonly ajout = this.formBuilder.nonNullable.group({
    numeroLot: ['', Validators.required],
    type: ['appartement', Validators.required],
    nombreChambres: [null as number | null, [Validators.min(0), Validators.max(30)]],
    superficie: [null as number | null, [Validators.min(0)]],
    loyerMensuel: [null as number | null, [Validators.min(0)]],
  });

  ngOnInit(): void {
    this.charger();
  }

  protected typeLabel(type: string): string {
    return simpleLabel(TYPES_IMMEUBLE, type);
  }

  protected typeBienLabel(type: string): string {
    return simpleLabel(TYPES_BIEN, type);
  }

  protected proprietaire(immeuble: ImmeubleDetail): string {
    return nomPropre(immeuble.proprietaire);
  }

  protected locataire(logement: LogementImmeuble): string {
    return logement.bail ? nomPropre(logement.bail.locataire) : '—';
  }

  protected statutLabel(statut: string): string {
    return label(BIEN_STATUTS, statut);
  }

  protected statutPill(statut: string): string {
    return pillClass(BIEN_STATUTS, statut);
  }

  protected ouvrirLogement(logement: LogementImmeuble): void {
    void this.router.navigate(['/locatif/biens', logement.id]);
  }

  protected retour(): void {
    void this.router.navigate(['/locatif/immeubles']);
  }

  protected ajouterLogement(): void {
    const immeuble = this.immeuble();
    if (!immeuble) return;
    if (this.ajout.invalid) {
      this.ajout.markAllAsTouched();
      return;
    }
    const valeur = this.ajout.getRawValue();
    this.saving.set(true);
    this.api
      .ajouterLogements(immeuble.id, [
        {
          numeroLot: valeur.numeroLot.trim(),
          type: valeur.type,
          nombreChambres: nombreOuUndefined(valeur.nombreChambres),
          superficie: nombreOuUndefined(valeur.superficie),
          loyerMensuel: nombreOuUndefined(valeur.loyerMensuel),
        },
      ])
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.ajout.reset({ numeroLot: '', type: valeur.type });
          this.notify.success(`Logement ${valeur.numeroLot.trim()} ajouté`);
          this.charger();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Ajout impossible');
        },
      });
  }

  private charger(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.findImmeuble(id).subscribe({
      next: (immeuble) => {
        this.immeuble.set(immeuble);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Propriété introuvable');
      },
    });
  }
}
