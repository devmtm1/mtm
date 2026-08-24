import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CreateTerrainPayload, TerrainDetail, TerrainPage, TerrainQuery } from '../../models/terrain.model';

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

  create(payload: CreateTerrainPayload): Observable<TerrainDetail> {
    return this.http.post<TerrainDetail>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<CreateTerrainPayload>): Observable<TerrainDetail> {
    return this.http.patch<TerrainDetail>(`${this.baseUrl}/${id}`, payload);
  }

  upload(id: string, kind: 'media' | 'documents', file: File, type: string): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post<unknown>(`${this.baseUrl}/${id}/${kind}`, formData);
  }
}