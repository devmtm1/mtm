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
  terrainId?: string | null;
  createdAt: string;
  terrain?: {
    id: string;
    referenceInterne: string;
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

  convertToProspect(id: string, commercialResponsableId?: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${id}/convert-to-prospect`, { commercialResponsableId });
  }
}
