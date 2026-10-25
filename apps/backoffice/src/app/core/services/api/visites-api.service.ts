import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type SourceVisite =
  'direct' | 'google' | 'facebook' | 'instagram' | 'whatsapp' | 'tiktok' | 'youtube' | 'autre';
export type TypeFiche = 'terrain' | 'location' | 'realisation' | 'projet';
export type PeriodeVisites = 7 | 30 | 90;

export interface TotauxVisites {
  /** Visiteurs distincts jour par jour : une personne qui revient un autre jour compte à nouveau. */
  visites: number;
  pagesVues: number;
  fichesVues: number;
  demandes: number;
}

export interface LigneBien {
  type: TypeFiche;
  id: string;
  titre: string;
  reference: string | null;
  lieu: string | null;
  vues: number;
  visiteurs: number;
  demandes: number;
}

export interface ResumeVisites {
  jours: number;
  depuis: string;
  jusqua: string;
  totaux: TotauxVisites;
  precedent: TotauxVisites;
  serie: { jour: string; visites: number; pagesVues: number }[];
  sources: { source: SourceVisite; visites: number }[];
  terrains: LigneBien[];
  locations: LigneBien[];
  sansDemande: LigneBien[];
  vitrine: LigneBien[];
}

export interface DetailBien {
  type: TypeFiche;
  id: string;
  jours: number;
  totaux: { vues: number; visiteurs: number; demandes: number };
  septJours: { vues: number; visiteurs: number };
  serie: { jour: string; vues: number; visiteurs: number }[];
  sources: { source: SourceVisite; visiteurs: number }[];
}

@Injectable({ providedIn: 'root' })
export class VisitesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/visites`;

  resume(jours: PeriodeVisites): Observable<ResumeVisites> {
    return this.http.get<ResumeVisites>(`${this.baseUrl}/resume`, {
      params: new HttpParams().set('jours', jours),
    });
  }

  pourBien(type: TypeFiche, id: string, jours: PeriodeVisites = 30): Observable<DetailBien> {
    return this.http.get<DetailBien>(`${this.baseUrl}/bien/${type}/${id}`, {
      params: new HttpParams().set('jours', jours),
    });
  }
}
