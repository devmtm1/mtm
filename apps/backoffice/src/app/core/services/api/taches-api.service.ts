import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PersonneRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Collaborateur extends PersonneRef {
  roles: string[];
}

export interface Tache {
  id: string;
  titre: string;
  description: string | null;
  priorite: string;
  statut: string;
  dateLimite: string | null;
  termineeLe: string | null;
  responsableId: string;
  responsable: PersonneRef;
  creeParId: string;
  creePar: PersonneRef;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  createdAt: string;
  enRetard: boolean;
  peutModifier: boolean;
}

export interface LigneHistorique {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  auteur: PersonneRef | null;
}

export interface TacheDetail extends Tache {
  historique: LigneHistorique[];
}

export interface TachesPage {
  items: Tache[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TachesResume {
  enRetard: number;
  aujourdhui: number;
  aFaire: number;
}

export interface TachesQuery {
  scope?: 'mes' | 'creees' | 'equipe';
  statut?: string;
  priorite?: string;
  echeance?: string;
  responsableId?: string;
  entityType?: string;
  entityId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TachePayload {
  titre: string;
  description?: string;
  priorite?: string;
  dateLimite?: string;
  responsableId?: string;
  entityType?: string;
  entityId?: string;
}

export interface TacheUpdate {
  titre?: string;
  description?: string;
  priorite?: string;
  statut?: string;
  dateLimite?: string | null;
  responsableId?: string;
}

@Injectable({ providedIn: 'root' })
export class TachesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/taches`;

  list(query: TachesQuery = {}): Observable<TachesPage> {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(query)) {
      if (valeur !== undefined && valeur !== '') params = params.set(cle, String(valeur));
    }
    return this.http.get<TachesPage>(this.baseUrl, { params });
  }

  resume(): Observable<TachesResume> {
    return this.http.get<TachesResume>(`${this.baseUrl}/resume`);
  }

  collaborateurs(): Observable<Collaborateur[]> {
    return this.http.get<Collaborateur[]>(`${this.baseUrl}/collaborateurs`);
  }

  detail(id: string): Observable<TacheDetail> {
    return this.http.get<TacheDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: TachePayload): Observable<Tache> {
    return this.http.post<Tache>(this.baseUrl, payload);
  }

  update(id: string, payload: TacheUpdate): Observable<TacheDetail> {
    return this.http.patch<TacheDetail>(`${this.baseUrl}/${id}`, payload);
  }

  comment(id: string, texte: string): Observable<TacheDetail> {
    return this.http.post<TacheDetail>(`${this.baseUrl}/${id}/commentaires`, { texte });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
