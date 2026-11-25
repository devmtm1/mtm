import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  LucideArrowLeft,
  LucideExternalLink,
  LucideMapPin,
  LucidePlus,
  LucideTriangleAlert,
  LucideUpload,
} from '@lucide/angular';
import { Observable } from 'rxjs';
import {
  MaterielApiService,
  type Destinataires,
  type EtatMateriel,
  type MaterielDetail,
  type OptionsMateriel,
  type RoleFichierMateriel,
  type TypeEntretien,
  type TypeSortieMateriel,
} from '../../core/services/api/materiel-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

type Action = 'confier' | 'retour' | 'entretien' | 'sortie' | 'modifier' | null;

const MAX_FICHIER = 10 * 1024 * 1024;
const LIBELLES_ENTRETIEN: Record<TypeEntretien, string> = {
  preventif: 'Entretien préventif',
  reparation: 'Réparation',
  controle: 'Contrôle',
};
const LIBELLES_ROLE: Record<RoleFichierMateriel, string> = {
  photo: 'Photo',
  etiquette: 'Photo de l’autocollant',
  facture: 'Facture',
  autre: 'Autre pièce',
};

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

/**
 * Fiche d'un objet du parc, sur sa propre page (comme un bien, un mandat ou un chantier). L'en-tête donne l'identité, le statut et
 * les gestes du jour ; un bandeau dit où est l'objet ; chaque formulaire s'ouvre sous l'en-tête, un seul à la fois ; à gauche ce
 * qu'est l'objet (informations, photos), à droite ce qui lui arrive (entretiens, historique). Le serveur reste juge : un objet
 * sorti du parc ne se modifie plus.
 */
@Component({
  selector: 'app-materiel-fiche',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MoneyPipe,
    LucideArrowLeft,
    LucideExternalLink,
    LucideMapPin,
    LucidePlus,
    LucideTriangleAlert,
    LucideUpload,
  ],
  templateUrl: './materiel-fiche.html',
  styleUrl: './materiel-fiche.scss',
})
export class MaterielFichePage implements OnInit {
  private readonly api = inject(MaterielApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutModifier = this.session.hasPermission('materiel:modifier');
  protected readonly peutSortir = this.session.hasPermission('materiel:valider');

  private id = '';
  protected readonly materiel = signal<MaterielDetail | null>(null);
  protected readonly options = signal<OptionsMateriel | null>(null);
  protected readonly destinataires = signal<Destinataires | null>(null);
  protected readonly erreur = signal(false);
  protected readonly envoi = signal(false);
  protected readonly action = signal<Action>(null);

  protected readonly formConfier = this.formBuilder.nonNullable.group({
    cible: 'collaborateur' as 'collaborateur' | 'chantier' | 'libre',
    userId: '',
    projetId: '',
    nom: '',
    note: '',
  });
  protected readonly cibleValide = computed(() => {
    const v = this.formConfier.getRawValue();
    return v.cible === 'collaborateur'
      ? !!v.userId
      : v.cible === 'chantier'
        ? !!v.projetId
        : v.nom.trim().length > 0;
  });
  protected readonly formRetour = this.formBuilder.nonNullable.group({
    etat: 'bon' as EtatMateriel,
    lieu: '',
    note: '',
  });
  protected readonly formEntretien = this.formBuilder.nonNullable.group({
    type: 'preventif' as TypeEntretien,
    description: ['', [Validators.required, Validators.minLength(2)]],
    date: [aujourdhui(), Validators.required],
    prestataire: '',
    cout: this.formBuilder.control<number | null>(null),
    fait: false,
    immobilise: false,
  });
  protected readonly formModifier = this.formBuilder.nonNullable.group({
    designation: ['', [Validators.required, Validators.minLength(2)]],
    categorie: ['', Validators.required],
    lieu: '',
    etat: 'bon' as EtatMateriel,
    marque: '',
    modele: '',
    numeroSerie: '',
    garantieJusqua: '',
    notes: '',
  });
  protected readonly formSortie = this.formBuilder.nonNullable.group({
    type: 'reforme' as TypeSortieMateriel,
    motif: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.options().subscribe({ next: (o) => this.options.set(o) });
    if (this.peutModifier)
      this.api.destinataires().subscribe({ next: (d) => this.destinataires.set(d) });
    this.api.detail(this.id).subscribe({
      next: (m) => this.afficher(m),
      error: () => this.erreur.set(true),
    });
  }

  private afficher(m: MaterielDetail): void {
    this.materiel.set(m);
    this.formRetour.patchValue({ etat: m.etat, lieu: '' });
    this.formModifier.patchValue({
      designation: m.designation,
      categorie: m.categorie,
      lieu: m.lieu ?? '',
      etat: m.etat,
      marque: m.marque ?? '',
      modele: m.modele ?? '',
      numeroSerie: m.numeroSerie ?? '',
      garantieJusqua: m.garantieJusqua ? m.garantieJusqua.slice(0, 10) : '',
      notes: m.notes ?? '',
    });
  }

  protected ouvrir(action: Action): void {
    this.action.set(action);
  }

  /** La couleur d'un statut : disponible (vert), confié (bleu de la charte), en maintenance (orange), sorti (rouge). */
  protected tonStatut(statut: string): string {
    if (statut === 'disponible') return 'status-pill--success';
    if (statut === 'affecte') return 'status-pill--primary';
    if (statut === 'en_maintenance') return 'status-pill--warning';
    if (statut === 'sorti') return 'status-pill--danger';
    return '';
  }

  protected tonEtat(etat: string): string {
    return etat === 'en_panne'
      ? 'status-pill--danger'
      : etat === 'usage'
        ? 'status-pill--warning'
        : '';
  }

  protected marqueModele(m: MaterielDetail): string {
    return [m.marque, m.modele].filter(Boolean).join(' ') || '—';
  }

  protected libelleEntretien(type: TypeEntretien): string {
    return LIBELLES_ENTRETIEN[type];
  }

  protected libelleRole(role: RoleFichierMateriel): string {
    return LIBELLES_ROLE[role];
  }

  /** Lance une action : un seul envoi à la fois, la fiche se met à jour avec la réponse. */
  private appliquer(requete: Observable<MaterielDetail>, succes: string, echec: string): void {
    if (this.envoi()) return;
    this.envoi.set(true);
    requete.subscribe({
      next: (m) => {
        this.envoi.set(false);
        this.action.set(null);
        this.afficher(m);
        this.notifications.success(succes);
      },
      error: (error: unknown) => {
        this.envoi.set(false);
        this.notifications.error(error, echec);
      },
    });
  }

  protected confier(): void {
    const v = this.formConfier.getRawValue();
    if (!this.cibleValide()) return;
    this.appliquer(
      this.api.affecter(this.id, {
        ...(v.cible === 'collaborateur' ? { userId: v.userId } : {}),
        ...(v.cible === 'chantier' ? { projetId: v.projetId } : {}),
        ...(v.cible === 'libre' ? { nom: v.nom.trim() } : {}),
        note: v.note.trim() || undefined,
      }),
      'Objet confié',
      'L’objet n’a pas pu être confié',
    );
  }

  protected retourner(): void {
    const v = this.formRetour.getRawValue();
    this.appliquer(
      this.api.retourner(this.id, {
        etat: v.etat,
        lieu: v.lieu || undefined,
        note: v.note.trim() || undefined,
      }),
      'Retour enregistré',
      'Le retour n’a pas pu être enregistré',
    );
  }

  protected ajouterEntretien(): void {
    if (this.formEntretien.invalid) return;
    const v = this.formEntretien.getRawValue();
    this.appliquer(
      this.api.ajouterEntretien(this.id, {
        type: v.type,
        description: v.description.trim(),
        date: v.date,
        fait: v.fait,
        immobilise: !v.fait && v.immobilise,
        cout: v.cout === null || v.cout === undefined ? undefined : Number(v.cout),
        prestataire: v.prestataire.trim() || undefined,
      }),
      'Entretien enregistré',
      'L’entretien n’a pas pu être enregistré',
    );
  }

  protected terminerEntretien(entretienId: string): void {
    this.appliquer(
      this.api.terminerEntretien(this.id, entretienId, {}),
      'Entretien marqué fait',
      'L’entretien n’a pas pu être terminé',
    );
  }

  protected enregistrerFiche(): void {
    if (this.formModifier.invalid) return;
    const v = this.formModifier.getRawValue();
    this.appliquer(
      this.api.modifier(this.id, {
        designation: v.designation.trim(),
        categorie: v.categorie,
        lieu: v.lieu,
        etat: v.etat,
        marque: v.marque,
        modele: v.modele,
        numeroSerie: v.numeroSerie,
        ...(v.garantieJusqua ? { garantieJusqua: v.garantieJusqua } : {}),
        notes: v.notes,
      }),
      'Fiche mise à jour',
      'La fiche n’a pas pu être modifiée',
    );
  }

  protected sortir(): void {
    if (this.formSortie.invalid) return;
    const v = this.formSortie.getRawValue();
    this.appliquer(
      this.api.sortir(this.id, { type: v.type, motif: v.motif.trim() }),
      'Objet sorti du parc',
      'La sortie n’a pas pu être enregistrée',
    );
  }

  protected deposer(evenement: Event, role: RoleFichierMateriel): void {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    if (!fichier) return;
    if (fichier.size > MAX_FICHIER) {
      this.notifications.error(new Error('Fichier trop lourd'), 'Ce fichier dépasse 10 Mo');
      return;
    }
    this.appliquer(
      this.api.deposerFichier(this.id, role, fichier),
      'Fichier ajouté',
      'Le fichier n’a pas pu être ajouté',
    );
  }
}
