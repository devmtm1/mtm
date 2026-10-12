import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConstructionApiService } from './api/construction-api.service';
import { LocatifApiService } from './api/locatif-api.service';
import { ContactApiService } from './api/contact-api.service';
import { CrmApiService } from './api/crm-api.service';
import { NotificationsApiService } from './api/notifications-api.service';
import { MandatsApiService } from './api/mandats-api.service';
import { VentesApiService } from './api/ventes-api.service';
import { SessionService } from './session.service';
import { AgendaApiService } from './api/agenda-api.service';
import { TachesApiService } from './api/taches-api.service';

export type FeedSeverity = 'info' | 'warning' | 'danger';

export interface FeedItem {
  id: string;
  severity: FeedSeverity;
  title: string;
  detail: string;
  route: string[];
  queryParams?: Record<string, string>;
  /** Notification serveur à marquer lue à l'ouverture (absente des signaux calculés). */
  notificationId?: string;
}

/**
 * Types de notifications serveur déjà représentés par un signal calculé du
 * fil (mandats qui expirent, loyers à relancer, chantiers en alerte) : les
 * afficher deux fois serait du bruit. Ils partent quand même par e-mail.
 */
const TYPES_DEJA_AU_FIL = new Set([
  'mandat_echeance',
  'loyer_relances',
  'chantier_alerte',
  'tache_en_retard',
  'tache_echeance',
]);

const MANDAT_ALERT_DAYS = 30;
const MAX_ITEMS_PER_SOURCE = 5;
/**
 * Au-delà de ce retard, un loyer impayé cesse d'être un oubli : c'est le
 * seuil de l'« impayé prolongé » de la section 15, et le fil le passe en
 * rouge. Le module locatif le rend paramétrable ; ici il ne sert qu'à
 * colorer une ligne, un défaut suffit.
 */
const IMPAYE_PROLONGE_JOURS = 30;

/** « /taches?tache=abc » → route Angular + paramètres de requête. */
export function routeDeLien(lien?: string | null): {
  route: string[];
  queryParams?: Record<string, string>;
} {
  if (!lien) return { route: ['/'] };
  const [chemin, requete] = lien.split('?');
  const route = chemin
    .split('/')
    .filter(Boolean)
    .map((part, index) => (index === 0 ? `/${part}` : part));
  const queryParams = requete
    ? Object.fromEntries(new URLSearchParams(requete).entries())
    : undefined;
  return { route: route.length ? route : ['/'], ...(queryParams ? { queryParams } : {}) };
}

/** Ce qui dérape sur un chantier, dit en trois mots (section 16). */
function alerteTitre(situation: string): string {
  if (situation === 'retard_et_depassement') return 'en retard et hors budget';
  if (situation === 'depassement_budget') return 'budget dépassé';
  return 'en retard';
}

/**
 * Fil des points d'attention affiché derrière la cloche de l'en-tête. Il
 * agrège les notifications du serveur (paiement à valider, réservation
 * expirée…) et les signaux métier calculés — mandats qui expirent,
 * tâches CRM en retard, loyers impayés à relancer, chantiers en retard ou
 * hors budget, demandes web non lues, demandes de réservation à traiter —
 * chacun limité aux permissions de l'utilisateur.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsFeedService {
  private readonly session = inject(SessionService);
  private readonly mandatsApi = inject(MandatsApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly contactApi = inject(ContactApiService);
  private readonly ventesApi = inject(VentesApiService);
  private readonly constructionApi = inject(ConstructionApiService);
  private readonly locatifApi = inject(LocatifApiService);
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly tachesApi = inject(TachesApiService);
  private readonly agendaApi = inject(AgendaApiService);

  load(): Observable<FeedItem[]> {
    const sources: Observable<FeedItem[]>[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (this.session.hasPermission('mandats:consulter')) {
      sources.push(
        this.mandatsApi.getExpirants(MANDAT_ALERT_DAYS).pipe(
          map((items) =>
            items.slice(0, MAX_ITEMS_PER_SOURCE).map((mandat) => {
              const days = Math.max(
                0,
                Math.ceil((new Date(mandat.dateFin).getTime() - Date.now()) / 86_400_000),
              );
              return {
                id: `mandat-${mandat.id}`,
                severity: days <= 7 ? ('danger' as const) : ('warning' as const),
                title: `Mandat ${mandat.referenceInterne} expire ${days === 0 ? "aujourd'hui" : `dans ${days} jour${days > 1 ? 's' : ''}`}`,
                detail: `${mandat.proprietaire.lastName} ${mandat.proprietaire.firstName}`,
                route: ['/mandats', mandat.id],
              };
            }),
          ),
          catchError(() => of([])),
        ),
      );
    }

    if (this.session.hasPermission('crm:consulter')) {
      sources.push(
        this.crmApi.getUpcomingTasks(20).pipe(
          map((tasks) =>
            tasks
              .filter((task) => task.dateEcheance && new Date(task.dateEcheance) <= today)
              .slice(0, MAX_ITEMS_PER_SOURCE)
              .map((task) => ({
                id: `task-${task.id}`,
                severity:
                  new Date(task.dateEcheance as string) < new Date(today.getTime() - 86_400_000)
                    ? ('danger' as const)
                    : ('warning' as const),
                title: task.titre,
                detail: `${task.prospect.nom} ${task.prospect.prenom ?? ''}`.trim(),
                route: ['/crm/prospects', task.prospect.id],
              })),
          ),
          catchError(() => of([])),
        ),
      );
    }

    if (this.session.hasPermission('contact:consulter')) {
      sources.push(
        this.contactApi.findAll({ lu: false }).pipe(
          map((messages) =>
            messages.slice(0, MAX_ITEMS_PER_SOURCE).map((message) => ({
              id: `contact-${message.id}`,
              severity: 'info' as const,
              title: `Demande web de ${message.nom}`,
              detail: message.sujet || message.message.slice(0, 80),
              route: ['/contacts'],
            })),
          ),
          catchError(() => of([])),
        ),
      );
    }

    if (this.session.hasPermission('ventes:consulter')) {
      sources.push(
        this.ventesApi.findReservationRequests().pipe(
          map((requests) =>
            requests
              .filter((request) => request.statut === 'nouvelle')
              .slice(0, MAX_ITEMS_PER_SOURCE)
              .map((request) => ({
                id: `reservation-${request.id}`,
                severity: 'info' as const,
                title: `Demande de réservation de ${request.nom}`,
                detail: request.terrain
                  ? `${request.terrain.referenceInterne} · ${request.terrain.nom}`
                  : 'Bien non précisé',
                route: ['/ventes'],
              })),
          ),
          catchError(() => of([])),
        ),
      );
    }

    if (this.session.hasPermission('locatif:consulter')) {
      sources.push(
        this.locatifApi.findRelances('a_envoyer').pipe(
          map((relances) =>
            relances.slice(0, MAX_ITEMS_PER_SOURCE).map((relance) => ({
              id: `relance-${relance.id}`,
              severity:
                relance.joursRetard >= IMPAYE_PROLONGE_JOURS
                  ? ('danger' as const)
                  : ('warning' as const),
              title: `Relance à envoyer — ${relance.joursRetard} jour${relance.joursRetard > 1 ? 's' : ''} de retard`,
              detail: relance.bailLocatif
                ? `${relance.bailLocatif.locataire.lastName ?? ''} ${relance.bailLocatif.locataire.firstName ?? ''}`.trim() +
                  ` · ${relance.bailLocatif.bienLocatif.adresse}`
                : relance.objet,
              route: ['/locatif/relances'],
            })),
          ),
          catchError(() => of([])),
        ),
      );
    }

    if (this.session.hasPermission('construction:consulter')) {
      sources.push(
        this.constructionApi.findAll({ vue: 'en_alerte', pageSize: MAX_ITEMS_PER_SOURCE }).pipe(
          map((page) =>
            page.items.map((chantier) => ({
              id: `chantier-${chantier.id}`,
              // Déraper à la fois sur les délais et sur l'argent est le
              // seul cas franchement rouge (section 16).
              severity:
                chantier.situationAlerte === 'retard_et_depassement'
                  ? ('danger' as const)
                  : ('warning' as const),
              title: `${chantier.intitule} — ${alerteTitre(chantier.situationAlerte)}`,
              detail: `${chantier.referenceInterne} · ${chantier.avancement} % d’avancement`,
              route: ['/construction/chantiers', chantier.id],
            })),
          ),
          catchError(() => of([])),
        ),
      );
    }

    // Mes tâches : ce qui est en retard et ce qui est dû aujourd'hui.
    if (this.session.hasPermission('taches:consulter')) {
      sources.push(
        this.tachesApi.resume().pipe(
          map((resume) => {
            const items: FeedItem[] = [];
            if (resume.enRetard > 0) {
              items.push({
                id: 'taches-retard',
                severity: 'danger',
                title: `${resume.enRetard} tâche${resume.enRetard > 1 ? 's' : ''} en retard`,
                detail: 'Ouvrez vos tâches pour les terminer ou les replanifier.',
                route: ['/taches'],
              });
            }
            if (resume.aujourdhui > 0) {
              items.push({
                id: 'taches-aujourdhui',
                severity: 'warning',
                title: `${resume.aujourdhui} tâche${resume.aujourdhui > 1 ? 's' : ''} pour aujourd’hui`,
                detail: 'À rendre avant ce soir.',
                route: ['/taches'],
              });
            }
            return items;
          }),
          catchError(() => of([])),
        ),
      );
    }

    // Mon agenda du jour.
    if (this.session.hasPermission('agenda:consulter')) {
      const debut = new Date(today);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(debut.getTime() + 24 * 3600 * 1000);
      sources.push(
        this.agendaApi.flux(debut, fin, 'moi').pipe(
          map((items) => {
            // Les échéances d'autres modules ont déjà leur propre signal : on ne compte que les rendez-vous.
            const rendezVous = items.filter((item) => item.source === 'evenement' || item.source === 'visite');
            return rendezVous.length > 0
              ? [
                  {
                    id: 'agenda-aujourdhui',
                    severity: 'info' as const,
                    title: `${rendezVous.length} rendez-vous aujourd’hui`,
                    detail: rendezVous
                      .slice(0, 2)
                      .map((item) => item.titre)
                      .join(' · '),
                    route: ['/agenda'],
                  },
                ]
              : [];
          }),
          catchError(() => of([])),
        ),
      );
    }

    // Événements à traiter, avec état lu / non lu : ouverts par tout utilisateur.
    sources.push(
      this.notificationsApi.list({ nonLues: true, limite: 20 }).pipe(
        map((page) =>
          page.items
            .filter((item) => !TYPES_DEJA_AU_FIL.has(item.type))
            .slice(0, MAX_ITEMS_PER_SOURCE)
            .map((item) => ({
              id: `notification-${item.id}`,
              notificationId: item.id,
              severity: item.niveau === 'alerte' ? ('danger' as const) : ('info' as const),
              title: item.titre,
              detail: item.message ?? '',
              ...routeDeLien(item.lien),
            })),
        ),
        catchError(() => of([])),
      ),
    );

    return forkJoin(sources).pipe(map((groups) => groups.flat()));
  }
}
