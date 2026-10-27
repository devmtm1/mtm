import type { AvecModifications } from '../../../../core/guards/modifications-non-enregistrees.guard';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucidePlus, LucideSave, LucideTrash2 } from '@lucide/angular';
import { LocatifApiService } from '../../../../core/services/api/locatif-api.service';
import { ContactApiService, type ContactMessage } from '../../../../core/services/api/contact-api.service';
import { preparerDepuisDemande, type PreparationDepuisDemande } from '../../demande-gestion';
import { ProprietairesApiService } from '../../../../core/services/api/proprietaires-api.service';
import { SessionService } from '../../../../core/services/session.service';
import type {
  CreateImmeublePayload,
  LocatifPersonne,
  LogementInitial,
} from '../../../../core/models/locatif.model';
import type { ProprietaireSummary } from '../../../../core/models/terrain.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProprietaireDialog } from '../../../terrains/proprietaire-dialog';
import { TYPES_BIEN, TYPES_IMMEUBLE, nomPersonne, simpleLabel } from '../../locatif-status';
import { nombreOuUndefined } from '../../locatif-form';

/** Nouvelle propriété : la villa ou l'immeuble confié, et, si on les connaît déjà, ses logements. */
@Component({
  selector: 'app-immeuble-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideArrowLeft,
    LucidePlus,
    LucideSave,
    LucideTrash2,
  ],
  templateUrl: './immeuble-form.html',
  styleUrl: './immeuble-form.scss',
})
export class ImmeubleForm implements OnInit, AvecModifications {
  private readonly api = inject(LocatifApiService);
  private readonly contactApi = inject(ContactApiService);
  private readonly proprietairesApi = inject(ProprietairesApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);
  private readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);

  protected readonly saving = signal(false);
  /** Demande du site d'où part la création : le formulaire est déjà rempli d'après ce que le propriétaire a écrit. */
  protected readonly demande = signal<ContactMessage | null>(null);
  /** Fiche ouverte depuis « Modifier » : on corrige la propriété, ses logements se gèrent depuis sa fiche. */
  protected readonly immeubleId = this.route.snapshot.paramMap.get('id');
  protected readonly modification = this.immeubleId !== null;
  protected readonly proprietaires = signal<ProprietaireSummary[]>([]);
  protected readonly collaborateurs = signal<LocatifPersonne[]>([]);
  protected readonly typesImmeuble = Object.entries(TYPES_IMMEUBLE);
  protected readonly typesBien = Object.entries(TYPES_BIEN);
  protected readonly peutAssigner = computed(() =>
    this.sessionService.hasPermission('locatif:modifier'),
  );
  protected readonly peutAjouterProprietaire = computed(() =>
    this.sessionService.hasPermission('proprietaires:creer'),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    nom: ['', Validators.required],
    type: ['villa', Validators.required],
    proprietaireId: ['', Validators.required],
    adresse: ['', Validators.required],
    commune: [''],
    region: [''],
    tauxGestion: [null as number | null, [Validators.min(0), Validators.max(100)]],
    responsableId: [''],
    notes: [''],
    logements: this.formBuilder.array([]) as FormArray,
  });

  /** Aide à la saisie : « 4 logements, A1 à A4 » remplit d'un coup les lignes. */
  protected readonly generateur = this.formBuilder.nonNullable.group({
    nombre: [4, [Validators.min(1), Validators.max(50)]],
    prefixe: ['A'],
    type: ['appartement'],
  });

  protected get logements(): FormArray {
    return this.form.controls.logements;
  }

  aDesModifications(): boolean {
    return this.form.dirty;
  }

  ngOnInit(): void {
    if (this.immeubleId) {
      this.api.findImmeuble(this.immeubleId).subscribe({
        next: (immeuble) => {
          this.form.patchValue({
            nom: immeuble.nom,
            type: immeuble.type,
            proprietaireId: immeuble.proprietaire.id,
            adresse: immeuble.adresse,
            commune: immeuble.commune ?? '',
            region: immeuble.region ?? '',
            tauxGestion: immeuble.tauxGestion === null ? null : Number(immeuble.tauxGestion),
            responsableId: immeuble.responsable?.id ?? '',
            notes: immeuble.notes ?? '',
          });
          this.form.markAsPristine();
        },
        error: (error: unknown) => this.notify.error(error, 'Propriété introuvable'),
      });
    }
    const proprietaireId = this.route.snapshot.queryParamMap.get('proprietaireId');
    if (proprietaireId) this.form.controls.proprietaireId.setValue(proprietaireId);
    this.api.getCollaborateurs().subscribe({
      next: (liste) => this.collaborateurs.set(liste),
      error: () => this.collaborateurs.set([]),
    });
    this.proprietairesApi.findAll().subscribe({
      next: (items) => this.proprietaires.set(items),
      error: () => this.proprietaires.set([]),
    });
    const contactId = this.route.snapshot.queryParamMap.get('contactId');
    if (contactId && !this.immeubleId) this.preparerDepuisDemande(contactId);
  }

  /** Remplit le formulaire d'après la demande, puis propose de créer le propriétaire (déjà prérempli). */
  private preparerDepuisDemande(contactId: string): void {
    this.contactApi.findAll().subscribe({
      next: (demandes) => {
        const demande = demandes.find((item) => item.id === contactId);
        if (!demande) return;
        const prepa = preparerDepuisDemande(demande);
        this.demande.set(demande);
        this.form.patchValue({
          nom: ['Immeuble', prepa.commune].filter(Boolean).join(' · '),
          type: prepa.typeImmeuble,
          adresse: prepa.adresse,
          commune: prepa.commune,
          region: prepa.region,
          notes: prepa.notes,
        });
        if (prepa.nombreLogements) {
          this.generateur.patchValue({ nombre: prepa.nombreLogements });
          this.generer();
          if (prepa.loyerSouhaite) {
            this.logements.controls.forEach((ligne) => ligne.patchValue({ loyerMensuel: prepa.loyerSouhaite }));
          }
        }
        this.form.markAsDirty();
        if (this.peutAjouterProprietaire()) this.ajouterProprietaire(prepa);
      },
      error: () => this.notify.info('Demande introuvable : remplissez le formulaire à la main.'),
    });
  }

  protected nomProprietaire(proprietaire: ProprietaireSummary): string {
    const nom = [proprietaire.firstName, proprietaire.lastName].filter(Boolean).join(' ');
    return proprietaire.matricule ? `${nom} · ${proprietaire.matricule}` : nom;
  }

  protected personne(personne: LocatifPersonne): string {
    return nomPersonne(personne);
  }

  protected typeBienLabel(type: string): string {
    return simpleLabel(TYPES_BIEN, type);
  }

  protected ajouterProprietaire(depuisDemande?: PreparationDepuisDemande): void {
    this.dialog
      .open(ProprietaireDialog, {
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
        data: depuisDemande ? { prefill: depuisDemande.proprietaire } : undefined,
      })
      .afterClosed()
      .subscribe((payload: Omit<ProprietaireSummary, 'id'> | undefined) => {
        if (!payload) return;
        this.proprietairesApi.create(payload).subscribe({
          next: (proprietaire) => {
            this.proprietaires.update((liste) =>
              [...liste, proprietaire].sort((a, b) =>
                `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`),
              ),
            );
            this.form.controls.proprietaireId.setValue(proprietaire.id);
            this.form.controls.proprietaireId.markAsDirty();
            this.notify.success('Propriétaire ajouté et sélectionné');
          },
          error: (error: unknown) =>
            this.notify.error(error, 'Impossible d’ajouter le propriétaire'),
        });
      });
  }

  protected ajouterLigne(numeroLot = '', type = 'appartement'): void {
    this.logements.push(
      this.formBuilder.nonNullable.group({
        numeroLot: [numeroLot],
        type: [type, Validators.required],
        nombreChambres: [null as number | null, [Validators.min(0), Validators.max(30)]],
        superficie: [null as number | null, [Validators.min(0)]],
        loyerMensuel: [null as number | null, [Validators.min(0)]],
      }),
    );
    this.form.markAsDirty();
  }

  protected retirerLigne(index: number): void {
    this.logements.removeAt(index);
    this.form.markAsDirty();
  }

  /** Remplace les lignes par n logements A1…An (ou le préfixe choisi). */
  protected generer(): void {
    const { nombre, prefixe, type } = this.generateur.getRawValue();
    const n = Math.min(Math.max(Math.trunc(Number(nombre)) || 0, 0), 50);
    this.logements.clear();
    for (let i = 1; i <= n; i += 1) this.ajouterLigne(`${prefixe.trim()}${i}`, type);
  }

  protected retour(): void {
    void this.router.navigate(
      this.immeubleId ? ['/locatif/immeubles', this.immeubleId] : ['/locatif/immeubles'],
    );
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    if (this.immeubleId) {
      this.saving.set(true);
      this.api
        .updateImmeuble(this.immeubleId, {
          nom: valeur.nom.trim(),
          type: valeur.type,
          proprietaireId: valeur.proprietaireId,
          adresse: valeur.adresse.trim(),
          commune: texte(valeur.commune),
          region: texte(valeur.region),
          tauxGestion: nombreOuUndefined(valeur.tauxGestion),
          responsableId: valeur.responsableId || undefined,
          notes: texte(valeur.notes),
        })
        .subscribe({
          next: () => {
            this.form.markAsPristine();
            this.notify.success('Propriété mise à jour');
            void this.router.navigate(['/locatif/immeubles', this.immeubleId]);
          },
          error: (error: unknown) => {
            this.saving.set(false);
            this.notify.error(error, 'Modification impossible');
          },
        });
      return;
    }
    const logements: LogementInitial[] = (valeur.logements as Record<string, unknown>[]).map(
      (ligne) => ({
        numeroLot: texte(String(ligne['numeroLot'] ?? '')),
        type: String(ligne['type']),
        nombreChambres: nombreOuUndefined(ligne['nombreChambres'] as number | null),
        superficie: nombreOuUndefined(ligne['superficie'] as number | null),
        loyerMensuel: nombreOuUndefined(ligne['loyerMensuel'] as number | null),
      }),
    );
    const payload: CreateImmeublePayload = {
      nom: valeur.nom.trim(),
      type: valeur.type,
      proprietaireId: valeur.proprietaireId,
      adresse: valeur.adresse.trim(),
      commune: texte(valeur.commune),
      region: texte(valeur.region),
      tauxGestion: nombreOuUndefined(valeur.tauxGestion),
      responsableId: valeur.responsableId || undefined,
      notes: texte(valeur.notes),
      logements: logements.length > 0 ? logements : undefined,
    };
    this.saving.set(true);
    this.api.createImmeuble(payload).subscribe({
      next: (immeuble) => {
        this.form.markAsPristine();
        this.notify.success(`Propriété ${immeuble.referenceInterne} enregistrée`);
        const demande = this.demande();
        // La demande est traitée : elle sort des messages à lire (sans bloquer la suite si le droit manque).
        if (demande && !demande.lu) this.contactApi.markRead(demande.id).subscribe({ error: () => undefined });
        void this.router.navigate(['/locatif/immeubles', immeuble.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Enregistrement impossible');
      },
    });
  }
}
