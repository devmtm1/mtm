import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CreateSettingPayload, SettingListItem } from '../../models/setting.model';

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/settings`;

  findAll(): Observable<SettingListItem[]> {
    return this.http.get<SettingListItem[]>(this.baseUrl);
  }

  create(payload: CreateSettingPayload): Observable<SettingListItem> {
    return this.http.post<SettingListItem>(this.baseUrl, payload);
  }

  update(
    key: string,
    value: unknown,
    description?: string,
  ): Observable<SettingListItem> {
    return this.http.put<SettingListItem>(`${this.baseUrl}/${key}`, {
      value,
      description,
    });
  }

  remove(key: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${key}`);
  }
}
