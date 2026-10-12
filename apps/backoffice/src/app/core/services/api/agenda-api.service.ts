import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Collaborateur, PersonneRef } from './taches-api.service';

export type SourceAgenda =
  | 'evenement'
  | 'tache'
  | 'visite'
  | 'mandat'
  | 'jalon'
  | 'sejour'
  | 'loyer'
  | 'echeance_vente'
  | 'reservation';

export interface ItemAgenda {
  id: string;
  source: SourceAgenda;
  type: string;
  titre: string;
  debut: string;
  fin: string | null;
  journeeEntiere: boolean;
  lieu?: string | null;
  statut?: string;
  lien?: string;
  entityLabel?: string | null;
  modifiable: boolean;
  participants?: PersonneRef[];
  createur?: PersonneRef;
  description?: string | null;
  visibilite?: string;
  rappelMinutes?: number | null;
  entityType?: string | null;
  entityId?: string | null;
}

export interface EvenementPayload {
  type: string;
  titre: string;
  description?: string;
  lieu?: string;
  debut: string;
  fin?: string;
  journeeEntiere?: boolean;
  visibilite?: string;
  participantIds?: string[];
  entityType?: string;
  entityId?: string;
  rappelMinutes?: number;
}

export interface EvenementUpdate extends Partial<Omit<EvenementPayload, 'fin' | 'entityType' | 'entityId' | 'rappelMinutes'>> {
  fin?: string | null;
  statut?: string;
  rappelMinutes?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AgendaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/agenda`;

  flux(du: Date, au: Date, scope: 'moi' | 'equipe'): Observable<ItemAgenda[]> {
    const params = new HttpParams()
      .set('du', du.toISOString())
      .set('au', au.toISOString())
      .set('scope', scope);
    return this.http.get<ItemAgenda[]>(this.baseUrl, { params });
  }

  collaborateurs(): Observable<Collaborateur[]> {
    return this.http.get<Collaborateur[]>(`${this.baseUrl}/collaborateurs`);
  }

  create(payload: EvenementPayload): Observable<ItemAgenda> {
    return this.http.post<ItemAgenda>(`${this.baseUrl}/evenements`, payload);
  }

  update(id: string, payload: EvenementUpdate): Observable<ItemAgenda> {
    return this.http.patch<ItemAgenda>(`${this.baseUrl}/evenements/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/evenements/${id}`);
  }
}
