import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ProprietaireSummary } from '../../models/terrain.model';
import type { ClientAccountCreated } from '../../models/client-account.model';

export interface ProprietaireDetail extends ProprietaireSummary {
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { terrains: number; biensLocatifs: number; mandats: number };
}

@Injectable({ providedIn: 'root' })
export class ProprietairesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/proprietaires`;

  findAll(): Observable<ProprietaireSummary[]> {
    return this.http.get<ProprietaireSummary[]>(this.baseUrl);
  }

  /** Matricule que recevra le prochain propriétaire. */
  prochainMatricule(): Observable<{ matricule: string }> {
    return this.http.get<{ matricule: string }>(`${this.baseUrl}/prochain-matricule`);
  }

  findOne(id: string): Observable<ProprietaireDetail> {
    return this.http.get<ProprietaireDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: Omit<ProprietaireSummary, 'id'>): Observable<ProprietaireSummary> {
    return this.http.post<ProprietaireSummary>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Omit<ProprietaireSummary, 'id'>>): Observable<ProprietaireSummary> {
    return this.http.patch<ProprietaireSummary>(`${this.baseUrl}/${id}`, payload);
  }

  /**
   * Copie PDF de la pièce d'identité, après l'enregistrement de la fiche : envoie le fichier choisi, ou retire
   * l'ancien si on l'a demandé. Sans l'un ni l'autre, rien n'est envoyé.
   */
  enregistrerPiece(id: string, fichier: File | null, retirer: boolean): Observable<unknown> {
    if (fichier) {
      const corps = new FormData();
      corps.append('file', fichier);
      return this.http.post(`${this.baseUrl}/${id}/piece-identite`, corps);
    }
    return retirer ? this.http.delete(`${this.baseUrl}/${id}/piece-identite`) : of(null);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Ouvre l'espace client (« Mon bien »). L'API envoie l'invitation par
   * e-mail ; si l'envoi échoue, elle renvoie le jeton pour une transmission
   * par un autre canal.
   */
  createClientAccount(id: string, password: string): Observable<ClientAccountCreated> {
    return this.http.post<ClientAccountCreated>(`${this.baseUrl}/${id}/compte-client`, { password });
  }
}
