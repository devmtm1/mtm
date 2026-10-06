import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type GedOrigine = 'terrain' | 'mandat' | 'vente' | 'crm' | 'demarche' | 'locatif' | 'chantier';

export interface GedDocument {
  origine: GedOrigine;
  id: string;
  titre: string;
  type: string;
  version: number;
  genere: boolean;
  /** Diffusé hors de MTM : site public, espace client, propriétaire ou locataire. */
  diffuse: boolean;
  createdAt: string;
  entiteId: string;
  entiteLibelle: string;
  /** Route du back-office de l'objet qui porte le document. */
  lien: string;
  url: string;
}

export interface GedPage {
  items: GedDocument[];
  total: number;
  page: number;
  pageSize: number;
  /** Origines que l'utilisateur a le droit de consulter. */
  origines: GedOrigine[];
}

export interface GedQuery {
  q?: string;
  origines?: GedOrigine[];
  type?: string;
  depuis?: string;
  jusqua?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class GedApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ged`;

  search(query: GedQuery): Observable<GedPage> {
    let params = new HttpParams();
    if (query.q) params = params.set('q', query.q);
    if (query.origines?.length) params = params.set('origines', query.origines.join(','));
    if (query.type) params = params.set('type', query.type);
    if (query.depuis) params = params.set('depuis', query.depuis);
    // La date de fin est inclusive : on la porte à la fin de la journée.
    if (query.jusqua) params = params.set('jusqua', `${query.jusqua}T23:59:59.999Z`);
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    return this.http.get<GedPage>(`${this.baseUrl}/documents`, { params });
  }
}
