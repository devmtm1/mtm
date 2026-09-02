import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  CreateMandatPayload,
  CreateMandatLotPayload,
  MandatDetail,
  MandatExpirant,
  MandatFinancialSummary,
  MandatOptions,
  MandatPage,
  MandatQuery,
  MandatStats,
  ProprietaireSummary,
} from '../../models/mandat.model';

@Injectable({ providedIn: 'root' })
export class MandatsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/mandats`;

  findAll(query: MandatQuery = {}): Observable<MandatPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<MandatPage>(this.baseUrl, { params });
  }

  findOne(id: string): Observable<MandatDetail> {
    return this.http.get<MandatDetail>(`${this.baseUrl}/${id}`);
  }

  getOptions(): Observable<MandatOptions> {
    return this.http.get<MandatOptions>(`${this.baseUrl}/options`);
  }

  getStats(): Observable<MandatStats> {
    return this.http.get<MandatStats>(`${this.baseUrl}/stats`);
  }

  getFinancialSummary(id: string): Observable<MandatFinancialSummary> {
    return this.http.get<MandatFinancialSummary>(`${this.baseUrl}/${id}/financial`);
  }

  getExpirants(jours?: number): Observable<MandatExpirant[]> {
    let params = new HttpParams();
    if (jours) params = params.set('jours', String(jours));
    return this.http.get<MandatExpirant[]>(`${this.baseUrl}/expirants`, { params });
  }

  getHistory(id: string): Observable<{ items: AuditHistoryItem[] }> {
    return this.http.get<{ items: AuditHistoryItem[] }>(`${this.baseUrl}/${id}/history`);
  }

  getProprietaires(): Observable<ProprietaireSummary[]> {
    return this.http.get<ProprietaireSummary[]>(`${environment.apiUrl}/proprietaires`);
  }

  create(payload: CreateMandatPayload): Observable<MandatDetail> {
    return this.http.post<MandatDetail>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<CreateMandatPayload>): Observable<MandatDetail> {
    return this.http.patch<MandatDetail>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  addLot(mandatId: string, payload: CreateMandatLotPayload): Observable<MandatLotItem> {
    return this.http.post<MandatLotItem>(`${this.baseUrl}/${mandatId}/lots`, payload);
  }

  updateLot(mandatId: string, lotId: string, payload: { statutLot?: string }): Observable<MandatLotItem> {
    return this.http.patch<MandatLotItem>(`${this.baseUrl}/${mandatId}/lots/${lotId}`, payload);
  }

  removeLot(mandatId: string, lotId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${mandatId}/lots/${lotId}`);
  }

  addDocument(mandatId: string, file: File, type: string, title?: string, isPublic = false): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (title) formData.append('title', title);
    formData.append('isPublic', String(isPublic));
    return this.http.post<unknown>(`${this.baseUrl}/${mandatId}/documents`, formData);
  }

  removeDocument(mandatId: string, documentId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${mandatId}/documents/${documentId}`);
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

export interface MandatLotItem {
  id: string;
  statutLot: string;
  dateAttribution: string;
  terrain: {
    id: string;
    referenceInterne: string;
    nom: string;
    commune: string | null;
    region: string | null;
    superficie: number | string | null;
    prixPublic: number | string | null;
    statutCommercial: string;
  };
}
