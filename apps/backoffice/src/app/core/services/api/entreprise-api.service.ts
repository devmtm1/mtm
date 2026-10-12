import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Champs texte de l'identité de l'entreprise, tels que l'API les stocke. */
export const CHAMPS_ENTREPRISE = [
  'raisonSociale',
  'nomCommercial',
  'slogan',
  'formeJuridique',
  'capital',
  'ninea',
  'rccm',
  'adresse',
  'telephone',
  'email',
  'siteWeb',
  'banque',
  'mentionPied',
] as const;

export type ChampEntreprise = (typeof CHAMPS_ENTREPRISE)[number];

export interface ProfilEntreprise {
  valeurs: Record<ChampEntreprise, string>;
  /** Ce que les documents affichent quand le champ est vide. */
  parDefaut: {
    nomCommercial: string;
    slogan: string;
    adresse: string;
    telephone: string;
    email: string;
  };
  logoUrl: string | null;
  logoPersonnalise: boolean;
}

@Injectable({ providedIn: 'root' })
export class EntrepriseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/entreprise`;

  getProfil(): Observable<ProfilEntreprise> {
    return this.http.get<ProfilEntreprise>(`${this.baseUrl}/profil`);
  }

  enregistrer(valeurs: Partial<Record<ChampEntreprise, string>>): Observable<ProfilEntreprise> {
    return this.http.put<ProfilEntreprise>(`${this.baseUrl}/profil`, valeurs);
  }

  changerLogo(file: File): Observable<ProfilEntreprise> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ProfilEntreprise>(`${this.baseUrl}/logo`, body);
  }

  retirerLogo(): Observable<ProfilEntreprise> {
    return this.http.delete<ProfilEntreprise>(`${this.baseUrl}/logo`);
  }

  apercu(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/apercu`, { responseType: 'blob' });
  }
}
