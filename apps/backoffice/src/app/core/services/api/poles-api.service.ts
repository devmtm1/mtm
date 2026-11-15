import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Un pôle d'activité, tel que le back-office le gère (le site public n'en reçoit qu'une partie). */
export interface Pole {
  id: string;
  /** Ancre stable dans la page « Nos services » : ne change pas quand on renomme le pôle. */
  slug: string;
  nom: string;
  accroche: string | null;
  /** Phrase courte des cartes de l'accueil. */
  description: string | null;
  /** Les prestations, une par puce. */
  points: string[];
  imageUrl: string | null;
  lienUrl: string | null;
  libelleLien: string | null;
  ordre: number;
  /** Montré parmi les services de l'accueil du site. */
  surAccueil: boolean;
  /** Identifiants des pôles proposés en complément sur la page de celui-ci. */
  lies: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolePayload {
  nom: string;
  accroche?: string;
  description?: string;
  points?: string[];
  lienUrl?: string;
  libelleLien?: string;
  ordre?: number;
  surAccueil?: boolean;
  lies?: string[];
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PolesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/poles`;

  findAllAdmin(): Observable<Pole[]> {
    return this.http.get<Pole[]>(`${this.baseUrl}/admin`);
  }

  create(payload: PolePayload): Observable<Pole> {
    return this.http.post<Pole>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Omit<PolePayload, 'isActive'>>): Observable<Pole> {
    return this.http.patch<Pole>(`${this.baseUrl}/${id}`, payload);
  }

  publish(id: string, isActive: boolean): Observable<Pole> {
    return this.http.patch<Pole>(`${this.baseUrl}/${id}/publish`, { isActive });
  }

  uploadImage(id: string, file: File): Observable<Pole> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Pole>(`${this.baseUrl}/${id}/image`, formData);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }
}
