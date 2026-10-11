import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Où en est la diffusion d'une promotion sur le site. */
export type StatutDiffusion = 'sans_media' | 'brouillon' | 'programmee' | 'en_ligne' | 'expiree';

/** Publicité ou promotion du bandeau d'accueil du site public. */
export interface Promotion {
  id: string;
  titre: string;
  description: string | null;
  /** Image (affiche) ou vidéo ; `null` tant que rien n'a été envoyé. */
  mediaUrl: string | null;
  /** « image » ou « video ». */
  resourceType: string;
  /** Image fixe tirée d'une vidéo. */
  posterUrl: string | null;
  lienUrl: string | null;
  libelleLien: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  ordre: number;
  isActive: boolean;
  statut: StatutDiffusion;
}

export interface PromotionPayload {
  titre: string;
  description?: string;
  lienUrl?: string;
  libelleLien?: string;
  /** AAAA-MM-JJ ; `null` à la modification retire la limite. */
  dateDebut?: string | null;
  dateFin?: string | null;
  ordre?: number;
}

@Injectable({ providedIn: 'root' })
export class PromotionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/promotions`;

  findAllAdmin(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.baseUrl}/admin`);
  }

  create(payload: PromotionPayload): Observable<Promotion> {
    return this.http.post<Promotion>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<PromotionPayload>): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.baseUrl}/${id}`, payload);
  }

  publish(id: string, isActive: boolean): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.baseUrl}/${id}/publish`, { isActive });
  }

  uploadMedia(id: string, file: File): Observable<Promotion> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Promotion>(`${this.baseUrl}/${id}/media`, formData);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }
}
