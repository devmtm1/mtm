import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CreateTerrainPayload, TerrainDetail, TerrainOptions, TerrainPage, TerrainQuery, ProprietaireSummary } from '../../models/terrain.model';

@Injectable({ providedIn: 'root' })
export class TerrainsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/terrains`;

  findAll(query: TerrainQuery = {}): Observable<TerrainPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<TerrainPage>(this.baseUrl, { params });
  }

  findOne(id: string): Observable<TerrainDetail> {
    return this.http.get<TerrainDetail>(`${this.baseUrl}/${id}`);
  }

  getOptions(): Observable<TerrainOptions> {
    return this.http.get<TerrainOptions>(`${this.baseUrl}/options`);
  }

  getProprietaires(): Observable<ProprietaireSummary[]> {
    return this.http.get<ProprietaireSummary[]>(`${environment.apiUrl}/proprietaires`);
  }

  createProprietaire(payload: Omit<ProprietaireSummary, 'id'>): Observable<ProprietaireSummary> {
    return this.http.post<ProprietaireSummary>(`${environment.apiUrl}/proprietaires`, payload);
  }

  updateProprietaire(id: string, payload: Partial<Omit<ProprietaireSummary, 'id'>>): Observable<ProprietaireSummary> {
    return this.http.patch<ProprietaireSummary>(`${environment.apiUrl}/proprietaires/${id}`, payload);
  }

  getHistory(id: string): Observable<{ items: AuditHistoryItem[] }> {
    return this.http.get<{ items: AuditHistoryItem[] }>(`${environment.apiUrl}/audit`, {
      params: { entityType: 'Terrain', entityId: id, pageSize: '100' },
    });
  }

  create(payload: CreateTerrainPayload): Observable<TerrainDetail> {
    return this.http.post<TerrainDetail>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<CreateTerrainPayload>): Observable<TerrainDetail> {
    return this.http.patch<TerrainDetail>(`${this.baseUrl}/${id}`, payload);
  }

  upload(id: string, kind: 'media' | 'documents', file: File, type: string, title?: string, isPublic = false): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (title) formData.append('title', title);
    formData.append('isPublic', String(isPublic));
    return this.http.post<unknown>(`${this.baseUrl}/${id}/${kind}`, formData);
  }
}

export interface AuditHistoryItem {
  id: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  justification: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
}