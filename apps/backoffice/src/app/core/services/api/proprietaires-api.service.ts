import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ProprietaireSummary } from '../../models/terrain.model';

export interface ProprietaireDetail extends ProprietaireSummary {
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProprietairesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/proprietaires`;

  findAll(): Observable<ProprietaireSummary[]> {
    return this.http.get<ProprietaireSummary[]>(this.baseUrl);
  }

  findOne(id: string): Observable<ProprietaireDetail> {
    return this.http.get<ProprietaireDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: Omit<ProprietaireSummary, 'id'>): Observable<ProprietaireSummary> {
    return this.http.post<ProprietaireSummary>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Omit<ProprietaireSummary, 'id'>>): Observable<ProprietaireSummary> {
    return this.http.patch<ProprietaireSummary>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }
}
