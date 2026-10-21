import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Où en est la diffusion d'une publication sur le site. */
export type StatutPublication = 'sans_video' | 'brouillon' | 'programmee' | 'en_ligne';

export type CategoriePublication = 'conseil' | 'actualite' | 'foncier' | 'construction' | 'autre';

/** Vidéo de la page « Actualités et conseils » du site public. */
export interface Publication {
  id: string;
  titre: string;
  categorie: CategoriePublication;
  resume: string | null;
  /** Lien de lecture ; `null` tant qu'aucune vidéo n'est envoyée. */
  videoUrl: string | null;
  /** Image fixe tirée de la vidéo. */
  posterUrl: string | null;
  dureeSecondes: number | null;
  largeur: number | null;
  hauteur: number | null;
  tailleOctets: number | null;
  datePublication: string | null;
  misEnAvant: boolean;
  isActive: boolean;
  statut: StatutPublication;
}

export interface PublicationPayload {
  titre: string;
  categorie: CategoriePublication;
  resume?: string;
  /** AAAA-MM-JJ ; `null` à la modification retire la date. */
  datePublication?: string | null;
  misEnAvant?: boolean;
}

/** Autorisation signée pour envoyer une vidéo directement à Cloudinary. */
export interface AutorisationEnvoi {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

@Injectable({ providedIn: 'root' })
export class PublicationsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/publications`;

  findAllAdmin(): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.baseUrl}/admin`);
  }

  create(payload: PublicationPayload): Observable<Publication> {
    return this.http.post<Publication>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<PublicationPayload>): Observable<Publication> {
    return this.http.patch<Publication>(`${this.baseUrl}/${id}`, payload);
  }

  publish(id: string, isActive: boolean): Observable<Publication> {
    return this.http.patch<Publication>(`${this.baseUrl}/${id}/publish`, { isActive });
  }

  autorisationEnvoi(): Observable<AutorisationEnvoi> {
    return this.http.post<AutorisationEnvoi>(`${this.baseUrl}/autorisation-envoi`, {});
  }

  /** Dit à l'API quelle vidéo vient d'arriver chez Cloudinary : elle la vérifie et la rattache. */
  attacherVideo(id: string, publicId: string): Observable<Publication> {
    return this.http.post<Publication>(`${this.baseUrl}/${id}/video`, { publicId });
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }
}
