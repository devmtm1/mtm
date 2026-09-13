import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CrmApiService } from './api/crm-api.service';
import { MandatsApiService } from './api/mandats-api.service';
import { TerrainsApiService } from './api/terrains-api.service';
import { VentesApiService } from './api/ventes-api.service';
import { SessionService } from './session.service';

export type SearchResultKind = 'terrain' | 'prospect' | 'mandat' | 'vente';

export interface GlobalSearchResult {
  kind: SearchResultKind;
  /** Libellé du type, affiché en tête de groupe. */
  kindLabel: string;
  id: string;
  title: string;
  hint: string;
  route: string[];
}

const KIND_LABELS: Record<SearchResultKind, string> = {
  terrain: 'Terrains',
  prospect: 'Prospects',
  mandat: 'Mandats',
  vente: 'Dossiers de vente',
};

const PER_KIND = 5;

/**
 * Recherche globale du back-office (champ Ctrl+K de l'en-tête) : interroge
 * en parallèle les référentiels auxquels l'utilisateur a accès et renvoie
 * une liste courte et homogène, prête à la navigation. Chaque source qui
 * échoue est simplement ignorée : la recherche ne bloque jamais.
 */
@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly session = inject(SessionService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly mandatsApi = inject(MandatsApiService);
  private readonly ventesApi = inject(VentesApiService);

  search(term: string): Observable<GlobalSearchResult[]> {
    const query = term.trim();
    if (query.length < 2) return of([]);
    const sources: Observable<GlobalSearchResult[]>[] = [];

    if (this.session.hasPermission('terrains:consulter')) {
      sources.push(
        this.terrainsApi.findAll({ search: query, pageSize: PER_KIND }).pipe(
          map((page) =>
            page.items.map((item) => ({
              kind: 'terrain' as const,
              kindLabel: KIND_LABELS.terrain,
              id: item.id,
              title: `${item.referenceInterne} · ${item.nom}`,
              hint: [item.commune, item.region].filter(Boolean).join(', ') || item.statutCommercial,
              route: ['/terrains', item.id],
            })),
          ),
          catchError(() => of([])),
        ),
      );
    }

    if (this.session.hasPermission('crm:consulter')) {
      sources.push(
        this.crmApi.findAll({ search: query, pageSize: PER_KIND }).pipe(
          map((page) =>
            page.items.map((item) => ({
              kind: 'prospect' as const,
              kindLabel: KIND_LABELS.prospect,
              id: item.id,
              title: `${item.nom} ${item.prenom ?? ''}`.trim(),
              hint: [item.email, item.telephone].filter(Boolean).join(' · '),
              route: ['/crm/prospects', item.id],
            })),
          ),
          catchError(() => of([])),
        ),
      );
    }

    if (this.session.hasPermission('mandats:consulter')) {
      sources.push(
        this.mandatsApi.findAll({ search: query, pageSize: PER_KIND }).pipe(
          map((page) =>
            page.items.map((item) => ({
              kind: 'mandat' as const,
              kindLabel: KIND_LABELS.mandat,
              id: item.id,
              title: item.referenceInterne,
              hint: `${item.proprietaire.lastName} ${item.proprietaire.firstName} · ${item.typeMandat}`,
              route: ['/mandats', item.id],
            })),
          ),
          catchError(() => of([])),
        ),
      );
    }

    if (this.session.hasPermission('ventes:consulter')) {
      const needle = query.toLowerCase();
      sources.push(
        this.ventesApi.findAll().pipe(
          map((dossiers) =>
            dossiers
              .filter((dossier) =>
                [dossier.referenceInterne, dossier.prospect?.nom, dossier.prospect?.prenom, dossier.terrain?.nom]
                  .filter((value): value is string => typeof value === 'string')
                  .some((value) => value.toLowerCase().includes(needle)),
              )
              .slice(0, PER_KIND)
              .map((dossier) => ({
                kind: 'vente' as const,
                kindLabel: KIND_LABELS.vente,
                id: dossier.id,
                title: dossier.referenceInterne ?? 'Dossier de vente',
                hint: `${dossier.prospect?.nom ?? ''} ${dossier.prospect?.prenom ?? ''}`.trim() || dossier.statut,
                route: ['/ventes', dossier.id],
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
