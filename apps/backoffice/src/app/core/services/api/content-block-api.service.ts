import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ContentBlock {
  id: string;
  key: string;
  title: string | null;
  content: string;
  type: string;
  ordre: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentBlockPayload {
  key: string;
  title?: string | null;
  content: string;
  type?: string;
  ordre?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContentBlockApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/content`;

  findAll(type?: string): Observable<ContentBlock[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<ContentBlock[]>(this.baseUrl, { params });
  }

  create(payload: CreateContentBlockPayload): Observable<ContentBlock> {
    return this.http.post<ContentBlock>(this.baseUrl, payload);
  }

  update(
    key: string,
    payload: Partial<CreateContentBlockPayload>,
  ): Observable<ContentBlock> {
    return this.http.patch<ContentBlock>(`${this.baseUrl}/${key}`, payload);
  }

  remove(key: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${key}`);
  }
}
