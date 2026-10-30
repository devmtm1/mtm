import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  CreatePaiementSejourPayload,
  CreateSejourPayload,
  DemandeResiliation,
  DemandeResiliationPayload,
  EtatDesLieuxPayload,
  EtatsDesLieux,
  ResiliationPage,
  ResiliationStats,
  SejourDetail,
  SejourPage,
  SejourQuery,
  SejourStats,
  TraiterResiliationPayload,
  UpdateSejourPayload,
} from '../../models/sejour.model';

/**
 * Séjours de courte durée, états des lieux et demandes
 * de résiliation de bail : les écrans de la gestion locative qui s'ajoutent aux
 * baux au mois.
 */
@Injectable({ providedIn: 'root' })
export class SejoursApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/locatif`;

  // --- Séjours ---

  findAll(query: SejourQuery = {}): Observable<SejourPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([cle, valeur]) => {
      if (valeur !== undefined && valeur !== '') params = params.set(cle, String(valeur));
    });
    return this.http.get<SejourPage>(`${this.baseUrl}/sejours`, { params });
  }

  getStats(): Observable<SejourStats> {
    return this.http.get<SejourStats>(`${this.baseUrl}/sejours/stats`);
  }

  findOne(id: string): Observable<SejourDetail> {
    return this.http.get<SejourDetail>(`${this.baseUrl}/sejours/${id}`);
  }

  create(payload: CreateSejourPayload): Observable<SejourDetail> {
    return this.http.post<SejourDetail>(`${this.baseUrl}/sejours`, payload);
  }

  update(id: string, payload: UpdateSejourPayload): Observable<SejourDetail> {
    return this.http.patch<SejourDetail>(`${this.baseUrl}/sejours/${id}`, payload);
  }

  changerStatut(id: string, statut: 'confirmee' | 'en_cours' | 'terminee'): Observable<SejourDetail> {
    return this.http.patch<SejourDetail>(`${this.baseUrl}/sejours/${id}/statut`, { statut });
  }

  annuler(id: string, motif: string): Observable<SejourDetail> {
    return this.http.post<SejourDetail>(`${this.baseUrl}/sejours/${id}/annuler`, { motif });
  }

  addPaiement(id: string, payload: CreatePaiementSejourPayload): Observable<SejourDetail> {
    return this.http.post<SejourDetail>(`${this.baseUrl}/sejours/${id}/paiements`, payload);
  }

  removePaiement(id: string, paiementId: string): Observable<SejourDetail> {
    return this.http.delete<SejourDetail>(`${this.baseUrl}/sejours/${id}/paiements/${paiementId}`);
  }

  verserCaution(id: string, payload: { montant?: number; date?: string } = {}): Observable<SejourDetail> {
    return this.http.post<SejourDetail>(`${this.baseUrl}/sejours/${id}/caution/verser`, payload);
  }

  restituerCaution(
    id: string,
    payload: { retenue?: number; justification?: string; date?: string },
  ): Observable<SejourDetail> {
    return this.http.post<SejourDetail>(`${this.baseUrl}/sejours/${id}/caution/restituer`, payload);
  }

  // --- États des lieux (séjour ou bail) ---

  getEtats(cible: 'sejours' | 'baux', id: string): Observable<EtatsDesLieux> {
    return this.http.get<EtatsDesLieux>(`${this.baseUrl}/${cible}/${id}/etats-des-lieux`);
  }

  saveEtat(
    cible: 'sejours' | 'baux',
    id: string,
    type: 'entree' | 'sortie',
    payload: EtatDesLieuxPayload,
  ): Observable<EtatsDesLieux> {
    return this.http.put<EtatsDesLieux>(`${this.baseUrl}/${cible}/${id}/etats-des-lieux/${type}`, payload);
  }

  addPhotoEtat(etatId: string, file: File, legende?: string): Observable<EtatsDesLieux> {
    const formulaire = new FormData();
    formulaire.append('file', file);
    if (legende) formulaire.append('legende', legende);
    return this.http.post<EtatsDesLieux>(`${this.baseUrl}/etats-des-lieux/${etatId}/photos`, formulaire);
  }

  removePhotoEtat(etatId: string, photoId: string): Observable<EtatsDesLieux> {
    return this.http.delete<EtatsDesLieux>(`${this.baseUrl}/etats-des-lieux/${etatId}/photos/${photoId}`);
  }

  // --- Demandes de résiliation ---

  findResiliations(statut: string | undefined, page: number, pageSize: number): Observable<ResiliationPage> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (statut) params = params.set('statut', statut);
    return this.http.get<ResiliationPage>(`${this.baseUrl}/resiliations`, { params });
  }

  getResiliationStats(): Observable<ResiliationStats> {
    return this.http.get<ResiliationStats>(`${this.baseUrl}/resiliations/stats`);
  }

  enregistrerResiliation(bailId: string, payload: DemandeResiliationPayload): Observable<DemandeResiliation> {
    return this.http.post<DemandeResiliation>(`${this.baseUrl}/resiliations/baux/${bailId}`, payload);
  }

  traiterResiliation(id: string, payload: TraiterResiliationPayload): Observable<DemandeResiliation> {
    return this.http.patch<DemandeResiliation>(`${this.baseUrl}/resiliations/${id}/traiter`, payload);
  }
}
