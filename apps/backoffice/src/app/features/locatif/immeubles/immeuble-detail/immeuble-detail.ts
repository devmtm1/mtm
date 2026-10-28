import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucidePlus } from '@lucide/angular';
import { DatePipe } from '@angular/common';
import { LocatifApiService } from '../../../../core/services/api/locatif-api.service';
import { SessionService } from '../../../../core/services/session.service';
import type {
  BienListItem,
  ChargeImmeuble,
  ImmeubleDetail,
  LogementImmeuble,
  RepartitionCharge,
  ReleveImmeuble,
} from '../../../../core/models/locatif.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ConfirmService } from '../../../../shared/dialogs/confirm-dialog';
import {
  BIEN_STATUTS,
  REPARTITIONS_CHARGE,
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
    DatePipe,
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
  private readonly confirmer = inject(ConfirmService);

  /** Squelette au premier chargement seulement : un rechargement après ajout garde la fiche affichée. */
  protected readonly loading = signal(true);
  protected readonly immeuble = signal<ImmeubleDetail | null>(null);
  protected readonly ajoutOuvert = signal(false);
  protected readonly saving = signal(false);
  protected readonly typesBien = Object.entries(TYPES_BIEN);
  protected readonly canCreate = computed(() => this.session.hasPermission('locatif:creer'));
  protected readonly canEdit = computed(() => this.session.hasPermission('locatif:modifier'));
  /** Biens du même propriétaire qui ne sont dans aucune propriété : candidats au rattachement. */
  protected readonly rattachables = signal<BienListItem[]>([]);
  protected readonly rattachementOuvert = signal(false);
  protected readonly rattachement = this.formBuilder.nonNullable.group({
    bienId: ['', Validators.required],
    numeroLot: [''],
  });

  protected readonly ajout = this.formBuilder.nonNullable.group({
    numeroLot: ['', Validators.required],
    type: ['appartement', Validators.required],
    nombreChambres: [null as number | null, [Validators.min(0), Validators.max(30)]],
    superficie: [null as number | null, [Validators.min(0)]],
    loyerMensuel: [null as number | null, [Validators.min(0)]],
  });

  // --- Charges communes et relevé de la propriété ---

  protected readonly charges = signal<ChargeImmeuble[]>([]);
  protected readonly releves = signal<ReleveImmeuble[]>([]);
  protected readonly chargeOuverte = signal(false);
  protected readonly generation = signal(false);
  protected readonly repartitions = Object.entries(REPARTITIONS_CHARGE);
  protected readonly totalCharges = computed(() => this.charges().reduce((somme, charge) => somme + charge.montant, 0));
  protected readonly chargeForm = this.formBuilder.nonNullable.group({
    libelle: ['', [Validators.required, Validators.maxLength(120)]],
    montant: [null as number | null, [Validators.required, Validators.min(1)]],
    dateCharge: [new Date().toISOString().slice(0, 10), Validators.required],
    repartition: ['egale' as RepartitionCharge, Validators.required],
  });

  ngOnInit(): void {
    this.charger();
  }

  protected repartitionLabel(code: string): string {
    return simpleLabel(REPARTITIONS_CHARGE, code);
  }

  protected ajouterCharge(): void {
    const immeuble = this.immeuble();
    if (!immeuble) return;
    if (this.chargeForm.invalid) {
      this.chargeForm.markAllAsTouched();
      return;
    }
    const valeur = this.chargeForm.getRawValue();
    this.saving.set(true);
    this.api
      .addChargeImmeuble(immeuble.id, {
        libelle: valeur.libelle.trim(),
        montant: Number(valeur.montant),
        dateCharge: valeur.dateCharge,
        repartition: valeur.repartition,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.chargeForm.reset({ libelle: '', montant: null, dateCharge: valeur.dateCharge, repartition: valeur.repartition });
          this.notify.success('Charge enregistrée');
          this.chargerCharges(immeuble.id);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }

  protected supprimerCharge(charge: ChargeImmeuble): void {
    const immeuble = this.immeuble();
    if (!immeuble) return;
    this.confirmer.ask(`Supprimer la charge « ${charge.libelle} » ?`).subscribe((confirme) => {
      if (!confirme) return;
      this.api.removeChargeImmeuble(immeuble.id, charge.id).subscribe({
        next: () => {
          this.notify.success('Charge supprimée');
          this.chargerCharges(immeuble.id);
        },
        error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
      });
    });
  }

  /** Génère le relevé de la propriété (douze derniers mois) et le publie au propriétaire, qui en est prévenu. */
  protected genererReleve(): void {
    const immeuble = this.immeuble();
    if (!immeuble) return;
    this.generation.set(true);
    this.api.genererReleveImmeuble(immeuble.id).subscribe({
      next: (releve) => {
        this.generation.set(false);
        this.notify.success(`Relevé ${releve.reference} généré et publié au propriétaire`);
        this.chargerReleves(immeuble.id);
      },
      error: (error: unknown) => {
        this.generation.set(false);
        this.notify.error(error, 'Génération impossible');
      },
    });
  }

  private chargerCharges(id: string): void {
    this.api.findChargesImmeuble(id).subscribe({
      next: (charges) => this.charges.set(charges),
      error: () => this.charges.set([]),
    });
  }

  private chargerReleves(id: string): void {
    this.api.findRelevesImmeuble(id).subscribe({
      next: (releves) => this.releves.set(releves),
      error: () => this.releves.set([]),
    });
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

  protected modifier(): void {
    const immeuble = this.immeuble();
    if (immeuble) void this.router.navigate(['/locatif/immeubles', immeuble.id, 'modifier']);
  }

  /** Ouvre le panneau et charge les biens de ce propriétaire qui ne sont encore dans aucune propriété. */
  protected basculerRattachement(): void {
    const immeuble = this.immeuble();
    if (!immeuble) return;
    const ouvert = !this.rattachementOuvert();
    this.rattachementOuvert.set(ouvert);
    if (!ouvert) return;
    this.api.findBiens({ proprietaireId: immeuble.proprietaire.id, pageSize: 200 }).subscribe({
      next: (page) => this.rattachables.set(page.items.filter((bien) => !bien.immeuble)),
      error: (error: unknown) =>
        this.notify.error(error, 'Impossible de charger les biens du propriétaire'),
    });
  }

  protected rattacher(): void {
    const immeuble = this.immeuble();
    if (!immeuble) return;
    if (this.rattachement.invalid) {
      this.rattachement.markAllAsTouched();
      return;
    }
    const { bienId, numeroLot } = this.rattachement.getRawValue();
    this.saving.set(true);
    this.api
      .updateBien(bienId, { immeubleId: immeuble.id, numeroLot: numeroLot.trim() || null })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.rattachement.reset({ bienId: '', numeroLot: '' });
          this.rattachementOuvert.set(false);
          this.notify.success('Bien rattaché à la propriété');
          this.charger();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Rattachement impossible');
        },
      });
  }

  protected libelleBien(bien: BienListItem): string {
    return `${bien.referenceInterne} · ${simpleLabel(TYPES_BIEN, bien.type)} · ${bien.adresse}`;
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
        this.chargerCharges(immeuble.id);
        this.chargerReleves(immeuble.id);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Propriété introuvable');
      },
    });
  }
}
