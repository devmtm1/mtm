import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CreateRolePayload, RoleListItem } from '../../models/role.model';

@Injectable({ providedIn: 'root' })
export class RolesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/roles`;

  findAll(): Observable<RoleListItem[]> {
    return this.http.get<RoleListItem[]>(this.baseUrl);
  }

  create(payload: CreateRolePayload): Observable<RoleListItem> {
    return this.http.post<RoleListItem>(this.baseUrl, payload);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  assignPermissions(
    roleId: string,
    permissionNames: string[],
  ): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/${roleId}/permissions`, {
      permissionNames,
    });
  }

  removePermission(
    roleId: string,
    permissionId: string,
  ): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.baseUrl}/${roleId}/permissions/${permissionId}/remove`,
      {},
    );
  }
}
