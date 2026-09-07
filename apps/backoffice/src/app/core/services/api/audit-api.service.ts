import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { AuditLogPage } from '../../models/audit.model';

export interface AuditQuery {
  entityType?: string;
  action?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
  entityId?: string;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);

  findAll(query: AuditQuery = {}): Observable<AuditLogPage> {
    const params: Record<string, string> = {};
    if (query.entityType) params['entityType'] = query.entityType;
    if (query.action) params['action'] = query.action;
    if (query.userId) params['userId'] = query.userId;
    if (query.entityId) params['entityId'] = query.entityId;
    if (query.from) params['from'] = query.from;
    if (query.to) params['to'] = query.to;
    if (query.page) params['page'] = String(query.page);
    if (query.pageSize) params['pageSize'] = String(query.pageSize);

    return this.http.get<AuditLogPage>(`${environment.apiUrl}/audit`, { params });
  }

  export(query: AuditQuery, justification: string): Observable<unknown[]> {
    const params: Record<string, string> = {};
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params[key] = String(value);
    });
    return this.http.post<unknown[]>(`${environment.apiUrl}/audit/export`, {
      justification,
    }, { params });
  }
}
