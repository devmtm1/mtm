import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ServerNotification {
  id: string;
  type: string;
  niveau: 'info' | 'alerte';
  titre: string;
  message?: string | null;
  /** Route du back-office où traiter l'événement. */
  lien?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  items: ServerNotification[];
  nonLues: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  list(options: { nonLues?: boolean; limite?: number } = {}): Observable<NotificationsPage> {
    let params = new HttpParams();
    if (options.nonLues) params = params.set('nonLues', 'true');
    if (options.limite) params = params.set('limite', options.limite);
    return this.http.get<NotificationsPage>(this.baseUrl, { params });
  }

  markRead(id: string): Observable<{ marquees: number }> {
    return this.http.post<{ marquees: number }>(`${this.baseUrl}/${id}/read`, {});
  }

  markAllRead(): Observable<{ marquees: number }> {
    return this.http.post<{ marquees: number }>(`${this.baseUrl}/read-all`, {});
  }
}
