import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  type EnvoiAutomatique,
  type ReglagesPilotage,
  type SeuilsBlocage,
  PilotageApiService,
} from '../../core/services/api/pilotage-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';

/** Les cinq délais de « dossier bloqué », avec la phrase qui les explique. */
export const DELAIS: { cle: keyof SeuilsBlocage; label: string; aide: string }[] = [
  { cle: 'vente', label: 'Dossier de vente', aide: 'sans modification, paiement, réservation ni document' },
  { cle: 'mission', label: 'Mission', aide: 'sans modification, étape ni règlement' },
  { cle: 'chantier', label: 'Chantier en cours', aide: 'sans journée saisie ni modification' },
  { cle: 'prospect', label: 'Prospect actif', aide: 'sans activité, visite ni modification' },
  { cle: 'tache', label: 'Tâche en retard', aide: 'échéance dépassée depuis plus de…' },
];

/** Adresses saisies une par ligne (ou séparées par des virgules ou points-virgules), sans doublon. */
export function lireAdresses(texte: string): string[] {
  const vues = new Set<string>();
  for (const brut of texte.split(/[\s,;]+/)) {
    const adresse = brut.trim().toLowerCase();
    if (adresse) vues.add(adresse);
  }
  return [...vues];
}

const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Réglages du pilotage (J3.2) : délais de « dossier bloqué » et envoi
 * automatique des rapports. Remplace la saisie de JSON dans Paramètres.
 */
@Component({
  selector: 'app-reglages-pilotage',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './reglages-pilotage.html',
  styleUrl: './reglages-pilotage.scss',
})
export class ReglagesPilotageComponent implements OnInit {
  private readonly api = inject(PilotageApiService);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder);

  protected readonly delais = DELAIS;
  protected readonly loading = signal(true);
  protected readonly enregistrementSeuils = signal(false);
  protected readonly enregistrementEnvoi = signal(false);
  protected readonly essaiEnCours = signal(false);
  protected readonly reglages = signal<ReglagesPilotage | null>(null);
  protected readonly monEmail = computed(() => this.session.user()?.email ?? 'votre adresse');

  protected readonly seuils = this.fb.nonNullable.group({
    vente: [15, [Validators.required, Validators.min(1), Validators.max(365)]],
    mission: [10, [Validators.required, Validators.min(1), Validators.max(365)]],
    chantier: [7, [Validators.required, Validators.min(1), Validators.max(365)]],
    prospect: [14, [Validators.required, Validators.min(1), Validators.max(365)]],
    tache: [3, [Validators.required, Validators.min(1), Validators.max(365)]],
  });

  protected readonly envoi = this.fb.nonNullable.group({
    actif: [false],
    frequence: ['hebdomadaire' as EnvoiAutomatique['frequence']],
    destinataires: [''],
  });
  protected readonly rapportsChoisis = signal<string[]>([]);
  protected readonly formatsChoisis = signal<('pdf' | 'xlsx')[]>(['pdf']);
  protected readonly erreurEnvoi = signal<string | null>(null);

  protected readonly freqControl = this.envoi.controls.frequence as FormControl<EnvoiAutomatique['frequence']>;

  ngOnInit(): void {
    this.charger();
  }

  protected titreRapport(code: string): string {
    return this.reglages()?.rapports.find((r) => r.code === code)?.titre ?? code;
  }

  protected rapportCoche(code: string): boolean {
    return this.rapportsChoisis().includes(code);
  }

  protected basculerRapport(code: string, coche: boolean): void {
    this.rapportsChoisis.update((liste) => (coche ? [...new Set([...liste, code])] : liste.filter((c) => c !== code)));
  }

  protected formatCoche(format: 'pdf' | 'xlsx'): boolean {
    return this.formatsChoisis().includes(format);
  }

  protected basculerFormat(format: 'pdf' | 'xlsx', coche: boolean): void {
    this.formatsChoisis.update((liste) => (coche ? [...new Set([...liste, format])] : liste.filter((f) => f !== format)));
  }

  protected enregistrerSeuils(): void {
    if (this.seuils.invalid) {
      this.seuils.markAllAsTouched();
      return;
    }
    this.enregistrementSeuils.set(true);
    this.api.enregistrerSeuils(this.seuils.getRawValue()).subscribe({
      next: (reglages) => {
        this.appliquer(reglages);
        this.enregistrementSeuils.set(false);
        this.notify.success('Délais enregistrés : ils s’appliquent dès maintenant.');
      },
      error: (error: unknown) => {
        this.enregistrementSeuils.set(false);
        this.notify.error(error, 'Enregistrement impossible');
      },
    });
  }

  protected enregistrerEnvoi(): void {
    const erreur = this.verifierEnvoi();
    this.erreurEnvoi.set(erreur);
    if (erreur) return;
    this.enregistrementEnvoi.set(true);
    this.api.enregistrerEnvoi(this.construireEnvoi()).subscribe({
      next: (reglages) => {
        this.appliquer(reglages);
        this.enregistrementEnvoi.set(false);
        this.notify.success(reglages.envoi.actif ? 'Envoi automatique enregistré et actif.' : 'Réglage enregistré : l’envoi automatique est désactivé.');
      },
      error: (error: unknown) => {
        this.enregistrementEnvoi.set(false);
        this.notify.error(error, 'Enregistrement impossible');
      },
    });
  }

  protected essayer(): void {
    this.essaiEnCours.set(true);
    this.api.essaiEnvoi().subscribe({
      next: (resultat) => {
        this.essaiEnCours.set(false);
        if (resultat.envoye) {
          this.notify.success(`Un exemplaire a été envoyé à ${this.monEmail()}.`);
        } else if (resultat.raison === 'aucun_rapport') {
          this.notify.info('Choisissez et enregistrez au moins un rapport avant de faire un essai.');
        } else {
          this.notify.info('Aucun e-mail n’est parti : la messagerie du serveur (SMTP) n’est pas configurée ou ne répond pas.');
        }
      },
      error: (error: unknown) => {
        this.essaiEnCours.set(false);
        this.notify.error(error, 'Essai impossible');
      },
    });
  }

  private construireEnvoi(): EnvoiAutomatique {
    const valeur = this.envoi.getRawValue();
    return {
      actif: valeur.actif,
      frequence: valeur.frequence,
      rapports: this.rapportsChoisis(),
      formats: this.formatsChoisis(),
      destinataires: lireAdresses(valeur.destinataires),
    };
  }

  /** Message clair avant l'envoi au serveur : ce qui empêcherait l'activation. */
  private verifierEnvoi(): string | null {
    const envoi = this.construireEnvoi();
    const invalide = envoi.destinataires.find((adresse) => !COURRIEL.test(adresse));
    if (invalide) return `« ${invalide} » n’est pas une adresse e-mail valide.`;
    if (envoi.destinataires.length > 20) return 'Vingt destinataires au plus.';
    if (envoi.formats.length === 0) return 'Choisissez au moins un format (PDF ou Excel).';
    if (envoi.actif && envoi.rapports.length === 0) return 'Choisissez au moins un rapport à envoyer.';
    if (envoi.actif && envoi.destinataires.length === 0) return 'Indiquez au moins un destinataire pour activer l’envoi.';
    return null;
  }

  private charger(): void {
    this.api.reglages().subscribe({
      next: (reglages) => {
        this.appliquer(reglages);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les réglages');
      },
    });
  }

  private appliquer(reglages: ReglagesPilotage): void {
    this.reglages.set(reglages);
    this.seuils.reset(reglages.seuils);
    this.envoi.reset({
      actif: reglages.envoi.actif,
      frequence: reglages.envoi.frequence,
      destinataires: reglages.envoi.destinataires.join('\n'),
    });
    this.rapportsChoisis.set([...reglages.envoi.rapports]);
    this.formatsChoisis.set([...reglages.envoi.formats]);
    this.erreurEnvoi.set(null);
  }
}
