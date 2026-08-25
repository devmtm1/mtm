import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CreateUserPayload, UserListItem } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  findAll(): Observable<UserListItem[]> {
    return this.http.get<UserListItem[]>(this.baseUrl);
  }

  create(payload: CreateUserPayload): Observable<UserListItem> {
    return this.http.post<UserListItem>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<CreateUserPayload>): Observable<UserListItem> {
    return this.http.patch<UserListItem>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  activate(id: string): Observable<UserListItem> {
    return this.http.patch<UserListItem>(`${this.baseUrl}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<UserListItem> {
    return this.http.patch<UserListItem>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  assignRole(userId: string, roleId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/${userId}/roles`, {
      roleId,
    });
  }

  removeRole(userId: string, roleId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.baseUrl}/${userId}/roles/${roleId}/remove`,
      {},
    );
  }
}
