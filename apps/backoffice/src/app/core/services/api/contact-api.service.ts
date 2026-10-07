import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ContactMessage {
  id: string;
  nom: string;
  email?: string | null;
  telephone?: string | null;
  sujet?: string | null;
  message: string;
  lu: boolean;
  /** Réponse de l'équipe, une fois donnée : elle part par e-mail et s'affiche dans l'espace client. */
  reponse?: string | null;
  reponduLe?: string | null;
  terrainId?: string | null;
  createdAt: string;
  terrain?: {
    id: string;
    referenceInterne: string;
  } | null;
  /** Annonce de location d'où vient la demande. */
  bienLocatif?: {
    id: string;
    referenceInterne: string;
    titre?: string | null;
    type: string;
  } | null;
  /** Prospect CRM déjà rattaché à cette personne (même e-mail ou téléphone). */
  prospect?: {
    id: string;
    referenceInterne?: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/contact`;

  findAll(filters: { lu?: boolean } = {}): Observable<ContactMessage[]> {
    let params = new HttpParams();
    if (filters.lu !== undefined) {
      params = params.set('lu', String(filters.lu));
    }
    return this.http.get<ContactMessage[]>(this.baseUrl, { params });
  }

  markRead(id: string): Observable<ContactMessage> {
    return this.http.patch<ContactMessage>(`${this.baseUrl}/${id}/read`, {});
  }

  /** Répond au message : e-mail au demandeur, affichage dans son espace client. */
  repondre(id: string, reponse: string): Observable<{ contact: ContactMessage; emailEnvoye: boolean }> {
    return this.http.post<{ contact: ContactMessage; emailEnvoye: boolean }>(`${this.baseUrl}/${id}/repondre`, { reponse });
  }

  convertToProspect(id: string, commercialResponsableId?: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${id}/convert-to-prospect`, { commercialResponsableId });
  }
}
