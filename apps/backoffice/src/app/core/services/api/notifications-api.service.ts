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

export interface PreferencesNotification {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  telephone: string;
  /** Canaux dont la passerelle est branchée côté serveur. */
  canaux: { sms: boolean; whatsapp: boolean };
}

export interface RegleNotification {
  actif?: boolean;
  permission?: string;
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
}

export interface EvenementNotification {
  cle: string;
  famille: string;
  libelle: string;
  description: string;
  destinataire: 'permission' | 'personne' | 'client';
  permission?: string;
  emailParDefaut: boolean;
  regle: RegleNotification;
  effectif: {
    actif: boolean;
    permission: string | null;
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

export interface CatalogueNotifications {
  canaux: { email: boolean; sms: boolean; whatsapp: boolean };
  evenements: EvenementNotification[];
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

  preferences(): Observable<PreferencesNotification> {
    return this.http.get<PreferencesNotification>(`${this.baseUrl}/preferences`);
  }

  savePreferences(
    valeurs: Partial<Pick<PreferencesNotification, 'email' | 'sms' | 'whatsapp' | 'telephone'>>,
  ): Observable<PreferencesNotification> {
    return this.http.put<PreferencesNotification>(`${this.baseUrl}/preferences`, valeurs);
  }

  catalogue(): Observable<CatalogueNotifications> {
    return this.http.get<CatalogueNotifications>(`${this.baseUrl}/regles`);
  }

  saveRegles(regles: Record<string, RegleNotification>): Observable<CatalogueNotifications> {
    return this.http.put<CatalogueNotifications>(`${this.baseUrl}/regles`, { regles });
  }
}
