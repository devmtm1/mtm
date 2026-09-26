import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConstructionApiService } from './api/construction-api.service';
import { ContactApiService } from './api/contact-api.service';
import { CrmApiService } from './api/crm-api.service';
import { MandatsApiService } from './api/mandats-api.service';
import { VentesApiService } from './api/ventes-api.service';
import { SessionService } from './session.service';

export type FeedSeverity = 'info' | 'warning' | 'danger';

export interface FeedItem {
  id: string;
  severity: FeedSeverity;
  title: string;
  detail: string;
  route: string[];
  queryParams?: Record<string, string>;
}

const MANDAT_ALERT_DAYS = 30;
const MAX_ITEMS_PER_SOURCE = 5;

/** Ce qui dérape sur un chantier, dit en trois mots (section 16). */
function alerteTitre(situation: string): string {
  if (situation === 'retard_et_depassement') return 'en retard et hors budget';
  if (situation === 'depassement_budget') return 'budget dépassé';
  return 'en retard';
}

/**
 * Fil des points d'attention affiché derrière la cloche de l'en-tête. Il
 * n'existe pas encore de service de notifications côté API (prévu J2.4) :
 * le fil agrège les signaux métier déjà disponibles — mandats qui expirent,
 * tâches CRM en retard, chantiers en retard ou hors budget, demandes web
 * non lues, demandes de réservation à traiter — chacun limité aux
 * permissions de l'utilisateur.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsFeedService {
  private readonly session = inject(SessionService);
  private readonly mandatsApi = inject(MandatsApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly contactApi = inject(ContactApiService);
  private readonly ventesApi = inject(VentesApiService);
  private readonly constructionApi = inject(ConstructionApiService);

  load(): Observable<FeedItem[]> {
    const sources: Observable<FeedItem[]>[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (this.session.hasPermission('mandats:consulter')) {
      sources.push(
        this.mandatsApi.getExpirants(MANDAT_ALERT_DAYS).pipe(
          map((items) =>
            items.slice(0, MAX_ITEMS_PER_SOURCE).map((mandat) => {
              const days = Math.max(0, Math.ceil((new Date(mandat.dateFin).getTime() - Date.now()) / 86_400_000));
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
                severity: new Date(task.dateEcheance as string) < new Date(today.getTime() - 86_400_000) ? ('danger' as const) : ('warning' as const),
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
                detail: request.terrain ? `${request.terrain.referenceInterne} · ${request.terrain.nom}` : 'Terrain non précisé',
                route: ['/ventes'],
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

    if (sources.length === 0) return of([]);
    return forkJoin(sources).pipe(map((groups) => groups.flat()));
  }
}
