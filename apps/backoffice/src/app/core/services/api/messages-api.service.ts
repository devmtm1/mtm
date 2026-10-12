import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PersonneRef } from './taches-api.service';

/** Types de dossiers qui portent un fil de discussion. */
export type TypeDossier = 'prospect' | 'vente' | 'mandat' | 'mission' | 'bail' | 'chantier' | 'terrain';

export interface MessageDossier {
  id: string;
  corps: string;
  visibleClient: boolean;
  deClient: boolean;
  createdAt: string;
  auteur: PersonneRef;
}

export interface FilDossier {
  items: MessageDossier[];
  /** Vrai quand ce type de dossier a un espace client où écrire au client. */
  clientPeutLire: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessagesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/messages`;

  fil(type: TypeDossier, id: string): Observable<FilDossier> {
    return this.http.get<FilDossier>(`${this.baseUrl}/${type}/${id}`);
  }

  poster(type: TypeDossier, id: string, corps: string, visibleClient: boolean): Observable<MessageDossier> {
    return this.http.post<MessageDossier>(`${this.baseUrl}/${type}/${id}`, { corps, visibleClient });
  }
}
