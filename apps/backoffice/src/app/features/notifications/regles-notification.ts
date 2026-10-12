import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  type CatalogueNotifications,
  type EvenementNotification,
  type RegleNotification,
  NotificationsApiService,
} from '../../core/services/api/notifications-api.service';
import { NotificationService } from '../../shared/services/notification.service';

/** Groupes de destinataires proposés : une permission, dite en clair. */
export const DESTINATAIRES: { permission: string; label: string }[] = [
  { permission: 'crm:administrer', label: 'Encadrement commercial' },
  { permission: 'crm:modifier', label: 'Tous les commerciaux' },
  { permission: 'ventes:valider', label: 'Valideurs des ventes et paiements' },
  { permission: 'mandats:administrer', label: 'Responsables des mandats' },
  { permission: 'locatif:valider', label: 'Responsables de la gestion locative' },
  { permission: 'locatif:modifier', label: 'Gestionnaires locatifs' },
  { permission: 'demarches:valider', label: 'Responsables des démarches' },
  { permission: 'construction:administrer', label: 'Responsables de la construction' },
  { permission: 'contact:modifier', label: 'Traitement des demandes du site' },
];

/** État modifiable d'un événement dans l'écran. */
export interface LigneRegle {
  evenement: EvenementNotification;
  actif: boolean;
  permission: string | null;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

/** Ne garde, par événement, que ce qui s'écarte du comportement par défaut. */
export function reglesAEnvoyer(lignes: LigneRegle[]): Record<string, RegleNotification> {
  const regles: Record<string, RegleNotification> = {};
  for (const ligne of lignes) {
    const regle: RegleNotification = {};
    if (!ligne.actif) regle.actif = false;
    if (ligne.email !== ligne.evenement.emailParDefaut) regle.email = ligne.email;
    if (ligne.sms) regle.sms = true;
    if (ligne.whatsapp) regle.whatsapp = true;
    if (
      ligne.evenement.destinataire === 'permission' &&
      ligne.permission &&
      ligne.permission !== ligne.evenement.permission
    ) {
      regle.permission = ligne.permission;
    }
    if (Object.keys(regle).length > 0) regles[ligne.evenement.cle] = regle;
  }
  return regles;
}

/**
 * Règles de notification (section 25) : pour chaque événement, on l'active ou
 * non, on choisit qui est prévenu et par quels canaux — sans toucher au code.
 */
@Component({
  selector: 'app-regles-notification',
  standalone: true,
  imports: [MatButtonModule, MatSelectModule, MatSlideToggleModule],
  templateUrl: './regles-notification.html',
  styleUrl: './regles-notification.scss',
})
export class ReglesNotification implements OnInit {
  private readonly api = inject(NotificationsApiService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly catalogue = signal<CatalogueNotifications | null>(null);
  protected readonly lignes = signal<LigneRegle[]>([]);
  protected readonly modifie = signal(false);
  protected readonly destinataires = DESTINATAIRES;

  protected readonly familles = computed(() => {
    const groupes = new Map<string, LigneRegle[]>();
    for (const ligne of this.lignes()) {
      const liste = groupes.get(ligne.evenement.famille) ?? [];
      liste.push(ligne);
      groupes.set(ligne.evenement.famille, liste);
    }
    return [...groupes.entries()];
  });

  ngOnInit(): void {
    this.api.catalogue().subscribe({
      next: (catalogue) => this.appliquer(catalogue),
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les règles');
      },
    });
  }

  protected changer(
    ligne: LigneRegle,
    champ: 'actif' | 'email' | 'sms' | 'whatsapp' | 'permission',
    valeur: boolean | string,
  ): void {
    this.lignes.update((lignes) =>
      lignes.map((courante) => (courante === ligne ? { ...courante, [champ]: valeur } : courante)),
    );
    this.modifie.set(true);
  }

  protected rendreParDefaut(): void {
    const catalogue = this.catalogue();
    if (!catalogue) return;
    this.lignes.set(
      catalogue.evenements.map((evenement) => ({
        evenement,
        actif: true,
        permission: evenement.permission ?? null,
        email: evenement.emailParDefaut,
        sms: false,
        whatsapp: false,
      })),
    );
    this.modifie.set(true);
  }

  protected enregistrer(): void {
    this.saving.set(true);
    this.api.saveRegles(reglesAEnvoyer(this.lignes())).subscribe({
      next: (catalogue) => {
        this.appliquer(catalogue);
        this.saving.set(false);
        this.notify.success('Règles enregistrées : elles s’appliquent aux prochaines alertes');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Enregistrement impossible');
      },
    });
  }

  /** Libellé d'une permission : le groupe de destinataires connu, sinon la permission brute. */
  protected libellePermission(permission: string | null): string {
    return DESTINATAIRES.find((d) => d.permission === permission)?.label ?? permission ?? '—';
  }

  protected optionsPour(ligne: LigneRegle): { permission: string; label: string }[] {
    const courante = ligne.permission;
    return courante && !DESTINATAIRES.some((d) => d.permission === courante)
      ? [...DESTINATAIRES, { permission: courante, label: courante }]
      : DESTINATAIRES;
  }

  private appliquer(catalogue: CatalogueNotifications): void {
    this.catalogue.set(catalogue);
    this.lignes.set(
      catalogue.evenements.map((evenement) => ({
        evenement,
        actif: evenement.effectif.actif,
        permission: evenement.effectif.permission,
        email: evenement.effectif.email,
        sms: evenement.effectif.sms,
        whatsapp: evenement.effectif.whatsapp,
      })),
    );
    this.modifie.set(false);
    this.loading.set(false);
  }
}
