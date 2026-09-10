import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ShowcaseItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string | null;
  storageKey: string | null;
  resourceType: string;
  imageUrl: string | null;
  ordre: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShowcaseItemPayload {
  category: string;
  title: string;
  description?: string;
  location?: string;
  date?: string;
  ordre?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ShowcaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/showcase`;

  findAllAdmin(): Observable<ShowcaseItem[]> {
    return this.http.get<ShowcaseItem[]>(`${this.baseUrl}/admin`);
  }

  create(payload: CreateShowcaseItemPayload): Observable<ShowcaseItem> {
    return this.http.post<ShowcaseItem>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Omit<CreateShowcaseItemPayload, 'isActive'>>): Observable<ShowcaseItem> {
    return this.http.patch<ShowcaseItem>(`${this.baseUrl}/${id}`, payload);
  }

  publish(id: string, isActive: boolean): Observable<ShowcaseItem> {
    return this.http.patch<ShowcaseItem>(`${this.baseUrl}/${id}/publish`, { isActive });
  }

  uploadImage(id: string, file: File): Observable<ShowcaseItem> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ShowcaseItem>(`${this.baseUrl}/${id}/image`, formData);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }
}
