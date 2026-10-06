import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucideImagePlus, LucideSave, LucideX } from '@lucide/angular';
import { SessionService } from '../../../core/services/session.service';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import { ProprietairesApiService } from '../../../core/services/api/proprietaires-api.service';
import type { CreateBienPayload, LocatifOptions, LocatifPersonne } from '../../../core/models/locatif.model';
import type { ProprietaireSummary } from '../../../core/models/terrain.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { TYPES_BIEN, nomPersonne, simpleLabel } from '../locatif-status';
import { TYPES_PHOTOS, nombreOuUndefined, trierFichiers } from '../locatif-form';

/** Fiche bien locatif (section 15 du cahier des charges, étape 1 de J2.1). */
@Component({
  selector: 'app-bien-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideArrowLeft,
    LucideImagePlus,
    LucideSave,
    LucideX,
  ],
  templateUrl: './bien-form.html',
  styleUrl: './bien-form.scss',
})
export class BienForm implements OnInit, OnDestroy {
  private readonly api = inject(LocatifApiService);
  private readonly proprietairesApi = inject(ProprietairesApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly sessionService = inject(SessionService);

  protected readonly saving = signal(false);
  protected readonly accept = TYPES_PHOTOS;
  /** Photos choisies, déposées après l'enregistrement du bien (il faut son identifiant). */
  protected readonly photos = signal<{ file: File; apercu: string | null }[]>([]);
  protected readonly options = signal<Partial<LocatifOptions>>({});
  protected readonly proprietaires = signal<ProprietaireSummary[]>([]);
  protected readonly collaborateurs = signal<LocatifPersonne[]>([]);
  /** Types proposés : ceux du serveur, ou la liste connue si le chargement échoue. */
  protected readonly types = computed(() => this.options().typesBien ?? Object.keys(TYPES_BIEN));
  /** Désigner un autre responsable que soi relève de la modification des biens. */
  protected readonly peutAssigner = computed(() => this.sessionService.hasPermission('locatif:modifier'));

  protected readonly form = this.formBuilder.nonNullable.group({
    proprietaireId: ['', Validators.required],
    type: ['appartement', Validators.required],
    adresse: ['', Validators.required],
    commune: [''],
    region: [''],
    superficie: [null as number | null, [Validators.min(0)]],
    notes: [''],
    responsableId: [''],
    // Ce que le bien rapporte : repris ensuite comme valeurs par défaut du bail.
    loyerMensuel: [null as number | null, [Validators.min(0)]],
    charges: [null as number | null, [Validators.min(0)]],
    moisCaution: [null as number | null, [Validators.min(0), Validators.max(12)]],
    nombrePieces: [null as number | null, [Validators.min(0), Validators.max(50)]],
    nombreChambres: [null as number | null, [Validators.min(0), Validators.max(30)]],
    nombreSallesEau: [null as number | null, [Validators.min(0), Validators.max(30)]],
    meuble: [false],
  });

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set({}),
    });
    this.api.getCollaborateurs().subscribe({
      next: (liste) => this.collaborateurs.set(liste),
      error: () => this.collaborateurs.set([]),
    });
    this.proprietairesApi.findAll().subscribe({
      next: (items) => this.proprietaires.set(items),
      error: () => this.proprietaires.set([]),
    });
  }

  protected typeLabel(type: string): string {
    return simpleLabel(TYPES_BIEN, type);
  }

  protected nomProprietaire(proprietaire: ProprietaireSummary): string {
    return [proprietaire.firstName, proprietaire.lastName].filter(Boolean).join(' ');
  }

  ngOnDestroy(): void {
    this.photos().forEach((photo) => photo.apercu && URL.revokeObjectURL(photo.apercu));
  }

  protected choisirPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const { valides, trop } = trierFichiers(Array.from(input.files ?? []));
    input.value = '';
    if (trop.length > 0) {
      this.notify.info(`${trop.map((fichier) => fichier.name).join(', ')} : fichier de plus de 10 Mo, non ajouté.`);
    }
    this.photos.update((liste) => [
      ...liste,
      ...valides.map((file) => ({
        file,
        apercu: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })),
    ]);
  }

  protected retirerPhoto(index: number): void {
    this.photos.update((liste) => {
      const apercu = liste[index]?.apercu;
      if (apercu) URL.revokeObjectURL(apercu);
      return liste.filter((_, position) => position !== index);
    });
  }

  protected personne(personne: LocatifPersonne): string {
    return nomPersonne(personne);
  }

  protected retour(): void {
    void this.router.navigate(['/locatif/biens']);
  }

  /**
   * Dépose les photos l'une après l'autre (l'ordre choisi est l'ordre de
   * l'annonce). Un échec n'annule pas le bien, déjà créé : on l'indique et on
   * ouvre la fiche, où l'on peut réessayer.
   */
  private deposerPhotos(bienId: string, fichiers: File[]): void {
    const ouvrirFiche = () => {
      this.saving.set(false);
      void this.router.navigate(['/locatif/biens', bienId]);
    };
    const envoyer = (restants: File[]): void => {
      const [fichier, ...suite] = restants;
      if (!fichier) return ouvrirFiche();
      this.api.addBienMedia(bienId, fichier).subscribe({
        next: () => envoyer(suite),
        error: (error: unknown) => {
          this.notify.error(error, `Envoi de « ${fichier.name} » impossible : ajoutez-le depuis la fiche`);
          ouvrirFiche();
        },
      });
    };
    envoyer(fichiers);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.saving.set(true);
    const payload: CreateBienPayload = {
      proprietaireId: valeur.proprietaireId,
      type: valeur.type,
      adresse: valeur.adresse.trim(),
      commune: texte(valeur.commune),
      region: texte(valeur.region),
      superficie: nombreOuUndefined(valeur.superficie),
      notes: texte(valeur.notes),
      responsableId: valeur.responsableId || undefined,
      loyerMensuel: nombreOuUndefined(valeur.loyerMensuel),
      charges: nombreOuUndefined(valeur.charges),
      moisCaution: nombreOuUndefined(valeur.moisCaution),
      nombrePieces: nombreOuUndefined(valeur.nombrePieces),
      nombreChambres: nombreOuUndefined(valeur.nombreChambres),
      nombreSallesEau: nombreOuUndefined(valeur.nombreSallesEau),
      meuble: valeur.meuble,
    };
    this.api
      .createBien(payload)
      .subscribe({
        next: (bien) => {
          this.notify.success(`Bien ${bien.referenceInterne} enregistré`);
          this.deposerPhotos(bien.id, [...this.photos()].map((photo) => photo.file));
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }
}
