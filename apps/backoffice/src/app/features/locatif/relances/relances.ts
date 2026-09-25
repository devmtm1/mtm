import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideChevronDown, LucideMail } from '@lucide/angular';
import type { Observable } from 'rxjs';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type { LocatifOptions, RelanceLoyer } from '../../../core/models/locatif.model';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { JustificationDialog } from '../../../shared/dialogs/justification-dialog';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  MODELES_RELANCE,
  SITUATIONS_PAIEMENT,
  STATUTS_RELANCE,
  label,
  nomPropre,
  pillClass,
  simpleLabel,
} from '../locatif-status';

/**
 * File de relances de loyer (section 15 : « modèles configurables et calendrier
 * de relance »). Le calendrier paramétré alimente cette file chaque nuit ; le
 * gestionnaire envoie par e-mail, trace un autre canal, ou abandonne.
 */
@Component({
  selector: 'app-relances',
  imports: [
    DatePipe,
    MoneyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
    LucideChevronDown,
    LucideMail,
  ],
  templateUrl: './relances.html',
  styleUrl: './relances.scss',
})
export class Relances implements OnInit {
  private readonly api = inject(LocatifApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessionService = inject(SessionService);

  protected readonly relances = signal<RelanceLoyer[]>([]);
  protected readonly options = signal<Partial<LocatifOptions>>({});
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly canModify = computed(() => this.sessionService.hasPermission('locatif:modifier'));

  protected readonly filtres = this.formBuilder.nonNullable.group({
    statut: ['a_envoyer'],
  });

  /** « 5, 15 puis 30 jours » : le calendrier en une phrase, dans le sous-titre. */
  protected readonly paliers = computed(() => {
    const modeles = this.options().relanceModeles ?? [];
    if (modeles.length === 0) return '';
    return modeles.map((modele) => `${modele.joursRetard} j`).join(', ');
  });

  /** Total encore dû sur les échéances relancées : l'enjeu de la file. */
  protected readonly montantConcerne = computed(() =>
    this.relances().reduce((somme, relance) => {
      const prevu = Number(relance.echeance?.montantPrevu ?? 0);
      const paye = Number(relance.echeance?.montantPaye ?? 0);
      return somme + Math.max(0, prevu - paye);
    }, 0),
  );

  ngOnInit(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set({}),
    });
    this.filtres.controls.statut.valueChanges.subscribe(() => this.charger());
    this.charger();
  }

  protected modeleLabel(code: string): string {
    return simpleLabel(MODELES_RELANCE, code);
  }
  protected statutLabel(statut: string): string {
    return label(STATUTS_RELANCE, statut);
  }
  protected statutPill(statut: string): string {
    return pillClass(STATUTS_RELANCE, statut);
  }
  protected situationLabel(situation: string): string {
    return label(SITUATIONS_PAIEMENT, situation);
  }
  protected situationPill(situation: string): string {
    return pillClass(SITUATIONS_PAIEMENT, situation);
  }
  protected locataireNom(relance: RelanceLoyer): string {
    return nomPropre(relance.bailLocatif?.locataire ?? null);
  }

  protected montantDu(relance: RelanceLoyer): number {
    const prevu = Number(relance.echeance?.montantPrevu ?? 0);
    const paye = Number(relance.echeance?.montantPaye ?? 0);
    return Math.max(0, prevu - paye);
  }

  protected ouvrirBien(relance: RelanceLoyer): void {
    const bienId = relance.bailLocatif?.bienLocatif.id;
    if (!bienId) return;
    void this.router.navigate(['/locatif/biens', bienId]);
  }

  /** Envoi par e-mail, avec le modèle paramétré. */
  protected envoyer(relance: RelanceLoyer): void {
    this.executer(
      this.api.envoyerRelance(relance.id, { canal: 'email' }),
      'Relance envoyée par e-mail',
    );
  }

  /**
   * Relance passée par un autre canal (appel, WhatsApp) : l'envoi multicanal
   * relève de J2.4, la trace est déjà nécessaire ici.
   */
  protected tracerEnvoiManuel(relance: RelanceLoyer): void {
    JustificationDialog.ask(this.dialog, {
      title: 'Relance passée hors e-mail',
      description: 'Notez le canal utilisé et ce que le locataire a répondu.',
      confirmLabel: 'Marquer comme envoyée',
    }).subscribe((note) => {
      if (!note) return;
      this.executer(
        this.api.envoyerRelance(relance.id, { canal: 'manuel', note }),
        'Relance tracée',
      );
    });
  }

  protected abandonner(relance: RelanceLoyer): void {
    this.executer(this.api.annulerRelance(relance.id), 'Relance abandonnée');
  }

  private charger(): void {
    this.loading.set(true);
    this.api.findRelances(this.filtres.controls.statut.value).subscribe({
      next: (relances) => {
        this.relances.set(relances);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les relances');
      },
    });
  }

  private executer(action: Observable<unknown>, succes: string): void {
    this.saving.set(true);
    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(succes);
        this.charger();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Action impossible');
      },
    });
  }
}
