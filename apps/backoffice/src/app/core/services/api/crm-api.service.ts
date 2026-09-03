import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  CreateActiviteCrmPayload,
  CreateProspectPayload,
  ProspectDetail,
  Prospect360,
  ProspectOptions,
  ProspectPage,
  ProspectQuery,
  ProspectStats,
  CommercialSummary,
} from '../../models/prospect.model';

export interface ProspectTimeline {
  prospect: ProspectDetail | null;
  upcoming: { id: string; titre: string; dateEcheance: string | null; priorite: string }[];
  overdue: { id: string; titre: string; dateEcheance: string | null; priorite: string }[];
  activites: { id: string; titre: string; statut: string; dateEcheance: string | null }[];
  audits: { id: string; action: string; createdAt: string; user: { firstName: string; lastName: string } | null }[];
  dossiers: { id: string; statut: string; createdAt: string; terrain?: { referenceInterne: string }; mandat?: { referenceInterne: string } }[];
}

export interface UpcomingTask {
  id: string;
  titre: string;
  dateEcheance: string | null;
  priorite: string;
  statut: string;
  prospect: { id: string; nom: string; prenom: string | null; statutPipeline: string };
}

@Injectable({ providedIn: 'root' })
export class CrmApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/crm/prospects`;

  findAll(query: ProspectQuery = {}): Observable<ProspectPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<ProspectPage>(this.baseUrl, { params });
  }

  findOne(id: string): Observable<ProspectDetail> {
    return this.http.get<ProspectDetail>(`${this.baseUrl}/${id}`);
  }

  find360(id: string): Observable<Prospect360> {
    return this.http.get<Prospect360>(`${this.baseUrl}/${id}/360`);
  }

  getOptions(): Observable<ProspectOptions> {
    return this.http.get<ProspectOptions>(`${this.baseUrl}/options`);
  }

  getStats(): Observable<ProspectStats> {
    return this.http.get<ProspectStats>(`${this.baseUrl}/stats`);
  }

  getUpcomingTasks(limit = 20): Observable<UpcomingTask[]> {
    return this.http.get<UpcomingTask[]>(`${this.baseUrl}/upcoming-tasks`, { params: new HttpParams().set('limit', String(limit)) });
  }

  getTimeline(id: string): Observable<ProspectTimeline> {
    return this.http.get<ProspectTimeline>(`${this.baseUrl}/${id}/timeline`);
  }

  getHistory(id: string): Observable<{ items: AuditHistoryItem[] }> {
    return this.http.get<{ items: AuditHistoryItem[] }>(`${this.baseUrl}/${id}/history`);
  }

  getCommercials(): Observable<CommercialSummary[]> {
    return this.http.get<CommercialSummary[]>(`${this.baseUrl}/commercials`);
  }

  create(payload: CreateProspectPayload): Observable<ProspectDetail> {
    return this.http.post<ProspectDetail>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<CreateProspectPayload>): Observable<ProspectDetail> {
    return this.http.patch<ProspectDetail>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  addActivite(prospectId: string, payload: CreateActiviteCrmPayload) {
    return this.http.post(`${this.baseUrl}/${prospectId}/activites`, payload);
  }

  updateActivite(prospectId: string, activiteId: string, payload: { statut?: string; priorite?: string; titre?: string; description?: string; dateEcheance?: string }) {
    return this.http.patch(`${this.baseUrl}/${prospectId}/activites/${activiteId}`, payload);
  }

  removeActivite(prospectId: string, activiteId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${prospectId}/activites/${activiteId}`);
  }

  transitionPipeline(prospectId: string, stage: string, justification?: string) {
    return this.http.patch(`${this.baseUrl}/${prospectId}/pipeline`, {
      statutPipeline: stage,
      ...(justification ? { justification } : {}),
    });
  }

  convertContact(contactId: string, commercialResponsableId?: string) {
    return this.http.post<ProspectDetail>(
      `${this.baseUrl}/contacts/${contactId}/convert`,
      commercialResponsableId ? { commercialResponsableId } : {},
    );
  }

  assignCommercial(prospectId: string, commercialResponsableId: string) {
    return this.http.patch(`${this.baseUrl}/${prospectId}/assign-commercial`, { commercialResponsableId });
  }

  addDocument(prospectId: string, file: File, type: string, title?: string, isPublic = false) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (title) formData.append('title', title);
    formData.append('isPublic', String(isPublic));
    return this.http.post<unknown>(`${this.baseUrl}/${prospectId}/documents`, formData);
  }

  removeDocument(prospectId: string, documentId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${prospectId}/documents/${documentId}`);
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
