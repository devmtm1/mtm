import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ObjectifCommercial, ObjectifProgress, UpsertObjectifPayload } from '../../models/objectif.model';

@Injectable({ providedIn: 'root' })
export class ObjectifsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ventes/objectifs`;

  /** Managers : tous les objectifs ; commercial : les siens. */
  findAll(periode?: string): Observable<ObjectifCommercial[]> {
    const params = periode ? new HttpParams().set('periode', periode) : undefined;
    return this.http.get<ObjectifCommercial[]>(this.baseUrl, { params });
  }

  getProgress(commercialId: string, periode: string): Observable<ObjectifProgress> {
    return this.http.get<ObjectifProgress>(`${this.baseUrl}/progression/${commercialId}`, {
      params: new HttpParams().set('periode', periode),
    });
  }

  /** Crée ou remplace l'objectif du couple (commercial, mois). */
  upsert(payload: UpsertObjectifPayload): Observable<ObjectifCommercial> {
    return this.http.put<ObjectifCommercial>(this.baseUrl, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
