import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import type {
  CreateMissionPayload,
  MissionCollaborateur,
  DocumentMission,
  EtapeMission,
  EtapeMissionPayload,
  MissionDetail,
  MissionOptions,
  MissionPage,
  MissionQuery,
  MissionStats,
  UpdateMissionPayload,
} from '../../models/mission.model';

/** Missions de vérification foncière (J2.2, section 14 du cahier des charges). */
@Injectable({ providedIn: 'root' })
export class DemarchesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/demarches/missions`;

  /** Référentiels et tarifs : ils changent rarement, on les garde en session. */
  private options$?: Observable<MissionOptions>;

  findAll(query: MissionQuery = {}): Observable<MissionPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([cle, valeur]) => {
      if (valeur !== undefined && valeur !== '') params = params.set(cle, String(valeur));
    });
    return this.http.get<MissionPage>(this.baseUrl, { params });
  }

  findOne(id: string): Observable<MissionDetail> {
    return this.http.get<MissionDetail>(`${this.baseUrl}/${id}`);
  }

  getOptions(): Observable<MissionOptions> {
    this.options$ ??= this.http
      .get<MissionOptions>(`${this.baseUrl}/options`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.options$;
  }

  /** Collaborateurs à qui confier une mission. */
  getCollaborateurs(): Observable<MissionCollaborateur[]> {
    return this.http.get<MissionCollaborateur[]>(`${this.baseUrl}/collaborateurs`);
  }

  /** Export CSV tracé : la justification part dans le corps, jamais dans l'URL. */
  exportCsv(justification: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export`, { justification }, { responseType: 'blob' });
  }

  getStats(): Observable<MissionStats> {
    return this.http.get<MissionStats>(`${this.baseUrl}/stats`);
  }

  create(payload: CreateMissionPayload): Observable<MissionDetail> {
    return this.http.post<MissionDetail>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateMissionPayload): Observable<MissionDetail> {
    return this.http.patch<MissionDetail>(`${this.baseUrl}/${id}`, payload);
  }

  /** Changement d'étape ; la justification n'est exigée qu'à l'abandon. */
  transition(id: string, statut: string, justification?: string): Observable<MissionDetail> {
    return this.http.patch<MissionDetail>(`${this.baseUrl}/${id}/etape`, {
      statut,
      ...(justification ? { justification } : {}),
    });
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  // --- Constats ---

  getEtapes(id: string): Observable<EtapeMission[]> {
    return this.http.get<EtapeMission[]>(`${this.baseUrl}/${id}/etapes`);
  }

  addEtape(id: string, payload: EtapeMissionPayload): Observable<EtapeMission> {
    return this.http.post<EtapeMission>(`${this.baseUrl}/${id}/etapes`, payload);
  }

  updateEtape(
    id: string,
    etapeId: string,
    payload: Partial<EtapeMissionPayload>,
  ): Observable<EtapeMission> {
    return this.http.patch<EtapeMission>(`${this.baseUrl}/${id}/etapes/${etapeId}`, payload);
  }

  removeEtape(id: string, etapeId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}/etapes/${etapeId}`);
  }

  // --- Pièces et rapport ---

  getDocuments(id: string): Observable<DocumentMission[]> {
    return this.http.get<DocumentMission[]>(`${this.baseUrl}/${id}/documents`);
  }

  addDocument(id: string, type: string, file: File, title?: string): Observable<DocumentMission> {
    const formulaire = new FormData();
    formulaire.append('file', file);
    formulaire.append('type', type);
    if (title) formulaire.append('title', title);
    return this.http.post<DocumentMission>(`${this.baseUrl}/${id}/documents`, formulaire);
  }

  /** Génère le rapport de vérification et le publie dans l'espace client. */
  generateReport(id: string): Observable<DocumentMission> {
    return this.http.post<DocumentMission>(`${this.baseUrl}/${id}/rapport`, {});
  }

  setDocumentVisibility(
    id: string,
    documentId: string,
    isPublic: boolean,
  ): Observable<DocumentMission> {
    return this.http.patch<DocumentMission>(
      `${this.baseUrl}/${id}/documents/${documentId}/visibilite`,
      { isPublic },
    );
  }

  removeDocument(id: string, documentId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}/documents/${documentId}`);
  }
}
