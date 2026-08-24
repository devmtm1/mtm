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
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);

  findAll(query: AuditQuery = {}): Observable<AuditLogPage> {
    const params: Record<string, string> = {};
    if (query.entityType) params['entityType'] = query.entityType;
    if (query.action) params['action'] = query.action;
    if (query.userId) params['userId'] = query.userId;
    if (query.page) params['page'] = String(query.page);
    if (query.pageSize) params['pageSize'] = String(query.pageSize);

    return this.http.get<AuditLogPage>(`${environment.apiUrl}/audit`, { params });
  }
}
