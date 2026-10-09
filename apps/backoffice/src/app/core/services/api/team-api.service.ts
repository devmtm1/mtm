import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type TeamKind = 'directeur' | 'groupe' | 'membre';

export interface TeamMember {
  id: string;
  kind: TeamKind;
  /** Pour la photo de groupe : la légende. */
  nom: string;
  poste: string | null;
  /** Mot du directeur. */
  message: string | null;
  imageUrl: string | null;
  ordre: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamPayload {
  kind: TeamKind;
  nom: string;
  poste?: string;
  message?: string;
  ordre?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/team`;

  findAllAdmin(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.baseUrl}/admin`);
  }

  create(payload: TeamPayload): Observable<TeamMember> {
    return this.http.post<TeamMember>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Omit<TeamPayload, 'kind' | 'isActive'>>): Observable<TeamMember> {
    return this.http.patch<TeamMember>(`${this.baseUrl}/${id}`, payload);
  }

  publish(id: string, isActive: boolean): Observable<TeamMember> {
    return this.http.patch<TeamMember>(`${this.baseUrl}/${id}/publish`, { isActive });
  }

  uploadImage(id: string, file: File): Observable<TeamMember> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TeamMember>(`${this.baseUrl}/${id}/image`, formData);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }
}
