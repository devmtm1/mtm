import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import type {
  CreateTerrainPayload,
  ProprietaireSummary,
  TerrainCatalogueItem,
  TerrainDetail,
  TerrainOptions,
  TerrainPage,
  TerrainQuery,
  TerrainStats,
} from '../../models/terrain.model';

@Injectable({ providedIn: 'root' })
export class TerrainsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/terrains`;

  /**
   * Référentiels mis en cache pour la durée de la session : ils changent
   * rarement (Paramètres) et sont demandés par chaque formulaire — les
   * recharger à chaque écran faisait attendre l'utilisateur inutilement.
   */
  private options$?: Observable<TerrainOptions>;
  private proprietaires$?: Observable<ProprietaireSummary[]>;

  findAll(query: TerrainQuery = {}): Observable<TerrainPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<TerrainPage>(this.baseUrl, { params });
  }

  /**
   * Terrains proposables à un prospect (tout le catalogue encore vendable),
   * là où findAll ne montre au commercial que les terrains dont il est
   * responsable.
   */
  catalogueProposition(search?: string): Observable<TerrainCatalogueItem[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<TerrainCatalogueItem[]>(`${this.baseUrl}/catalogue`, { params });
  }

  findOne(id: string): Observable<TerrainDetail> {
    return this.http.get<TerrainDetail>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<TerrainStats> {
    return this.http.get<TerrainStats>(`${this.baseUrl}/stats`);
  }

  getOptions(): Observable<TerrainOptions> {
    this.options$ ??= this.http
      .get<TerrainOptions>(`${this.baseUrl}/options`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.options$;
  }

  getProprietaires(): Observable<ProprietaireSummary[]> {
    this.proprietaires$ ??= this.http
      .get<ProprietaireSummary[]>(`${environment.apiUrl}/proprietaires`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.proprietaires$;
  }

  createProprietaire(payload: Omit<ProprietaireSummary, 'id'>): Observable<ProprietaireSummary> {
    return this.http
      .post<ProprietaireSummary>(`${environment.apiUrl}/proprietaires`, payload)
      .pipe(tap(() => (this.proprietaires$ = undefined)));
  }

  updateProprietaire(
    id: string,
    payload: Partial<Omit<ProprietaireSummary, 'id'>>,
  ): Observable<ProprietaireSummary> {
    return this.http
      .patch<ProprietaireSummary>(`${environment.apiUrl}/proprietaires/${id}`, payload)
      .pipe(tap(() => (this.proprietaires$ = undefined)));
  }

  getHistory(id: string): Observable<{ items: AuditHistoryItem[] }> {
    return this.http.get<{ items: AuditHistoryItem[] }>(`${this.baseUrl}/${id}/history`);
  }

  create(payload: CreateTerrainPayload): Observable<TerrainDetail> {
    return this.http.post<TerrainDetail>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<CreateTerrainPayload>): Observable<TerrainDetail> {
    return this.http.patch<TerrainDetail>(`${this.baseUrl}/${id}`, payload);
  }

  /** Mise en avant sur la page d'accueil du site public (le terrain doit être « Disponible »). */
  setFeatured(id: string, misEnAvant: boolean): Observable<TerrainDetail> {
    return this.update(id, { misEnAvant });
  }

  updateJuridicalStatus(id: string, value: string, justification?: string) {
    return this.updateStatus(id, 'juridical-status', value, justification);
  }

  updateVerificationStatus(id: string, value: string, justification?: string) {
    return this.updateStatus(id, 'verification-status', value, justification);
  }

  updateCommercialStatus(id: string, value: string, justification?: string) {
    return this.updateStatus(id, 'commercial-status', value, justification);
  }

  private updateStatus(id: string, path: string, value: string, justification?: string) {
    return this.http.patch<TerrainDetail>(`${this.baseUrl}/${id}/${path}`, {
      value,
      ...(justification ? { justification } : {}),
    });
  }

  upload(
    id: string,
    kind: 'media' | 'documents',
    file: File,
    type: string,
    title?: string,
    isPublic = false,
  ): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (title) formData.append('title', title);
    formData.append('isPublic', String(isPublic));
    return this.http.post<unknown>(`${this.baseUrl}/${id}/${kind}`, formData);
  }

  removeMedia(id: string, mediaId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}/media/${mediaId}`);
  }

  removeDocument(id: string, documentId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}/documents/${documentId}`);
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
