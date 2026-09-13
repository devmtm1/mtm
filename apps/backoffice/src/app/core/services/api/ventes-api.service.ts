import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  DossierVenteListItem,
  ReservationRequestItem,
  VenteDashboardStats,
  VenteDetail,
  VenteDocument,
  VenteDocumentSearchItem,
  VenteEcheance,
  VenteOptions,
  ClientAccountCreated,
} from '../../models/vente.model';

@Injectable({ providedIn: 'root' })
export class VentesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ventes`;

  findAll(): Observable<DossierVenteListItem[]> {
    return this.http.get<DossierVenteListItem[]>(this.baseUrl);
  }

  findOne(id: string): Observable<VenteDetail> {
    return this.http.get<VenteDetail>(`${this.baseUrl}/${id}`);
  }

  /** Référentiels des formulaires : statuts et transitions, modes de paiement, règles de commission. */
  getOptions(): Observable<VenteOptions> {
    return this.http.get<VenteOptions>(`${this.baseUrl}/options`);
  }

  /** Compléter un dossier ouvert : terrain, prix, commercial, notes. */
  updateDossier(
    dossierId: string,
    payload: { terrainId?: string; mandatId?: string; commercialResponsableId?: string; prixVente?: number; notes?: string },
  ): Observable<VenteDetail> {
    return this.http.patch<VenteDetail>(`${this.baseUrl}/${dossierId}`, payload);
  }

  updateStatus(dossierId: string, statut: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${dossierId}/status`, { statut });
  }

  /** Export CSV tracé : la justification est obligatoire côté API (section 24). */
  exportCsv(justification: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export`, { justification }, { responseType: 'blob' });
  }

  findReservationRequests(): Observable<ReservationRequestItem[]> {
    return this.http.get<ReservationRequestItem[]>(`${this.baseUrl}/reservation-requests`);
  }

  createDossier(payload: {
    prospectId: string;
    terrainId?: string;
    mandatId?: string;
    prixVente?: number;
    statut?: string;
    notes?: string;
  }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.baseUrl}`, payload);
  }

  /**
   * Ouvre l'espace client. L'API envoie l'invitation par e-mail ; si l'envoi
   * échoue, elle renvoie le jeton pour une transmission par un autre canal.
   */
  createClientAccount(prospectId: string, password: string): Observable<ClientAccountCreated> {
    return this.http.post<ClientAccountCreated>(`${this.baseUrl}/client-accounts`, {
      prospectId,
      password,
    });
  }

  convertReservationRequest(
    requestId: string,
    payload: {
      mandatId?: string;
      commercialResponsableId?: string;
      prixVente?: number;
      notes?: string;
    },
  ): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/reservation-requests/${requestId}/convert`, payload);
  }

  createReservation(
    dossierId: string,
    payload: { montantAcompte: number; dureeBlocageJours: number; conditionsAnnulation?: string },
  ): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${dossierId}/reservations`, payload);
  }

  createPaiement(
    dossierId: string,
    payload: { montant: number; mode: string; reference?: string; datePaiement?: string; notes?: string },
  ): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${dossierId}/paiements`, payload);
  }

  getDashboardStats(): Observable<VenteDashboardStats> {
    return this.http.get<VenteDashboardStats>(`${this.baseUrl}/dashboard/stats`);
  }

  getCommercialPerformance(commercialId: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/dashboard/commercial/${commercialId}`);
  }

  searchDocuments(
    filters: {
      dossierVenteId?: string;
      prospectId?: string;
      terrainId?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ): Observable<VenteDocumentSearchItem[]> {
    // HttpClient sérialise `undefined` en chaîne « undefined » : seuls les filtres renseignés partent.
    const params = Object.fromEntries(
      Object.entries(filters).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '',
      ),
    );
    return this.http.get<VenteDocumentSearchItem[]>(`${this.baseUrl}/documents/search`, { params });
  }

  /** Génère un PDF (bon de réservation, reçu, facture, contrat, état de paiement) depuis le dossier. */
  generateDocument(
    dossierId: string,
    type: string,
    title?: string,
    isPublic = false,
  ): Observable<VenteDocument> {
    return this.http.post<VenteDocument>(`${this.baseUrl}/${dossierId}/documents/generated`, {
      type,
      title,
      isPublic,
    });
  }

  /** Dépose un fichier (justificatif, contrat signé…) sur le dossier. */
  addDocument(
    dossierId: string,
    file: File,
    type: string,
    title?: string,
    isPublic = false,
  ): Observable<VenteDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (title) formData.append('title', title);
    formData.append('isPublic', String(isPublic));
    return this.http.post<VenteDocument>(`${this.baseUrl}/${dossierId}/documents`, formData);
  }

  removeDocument(dossierId: string, documentId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${dossierId}/documents/${documentId}`,
    );
  }

  getEcheances(dossierId: string): Observable<VenteEcheance[]> {
    return this.http.get<VenteEcheance[]>(`${this.baseUrl}/${dossierId}/echeances`);
  }

  validatePayment(dossierId: string, paymentId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${dossierId}/paiements/${paymentId}/validate`, {});
  }

  createCommission(
    dossierId: string,
    payload: {
      commercialId: string;
      regleId: string;
      taux?: number;
      montantFixe?: number;
      palier?: number;
      bonus?: number;
    },
  ): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${dossierId}/commissions`, payload);
  }

  validateCommission(dossierId: string, commissionId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${dossierId}/commissions/${commissionId}/validate`, {});
  }

  payCommission(dossierId: string, commissionId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${dossierId}/commissions/${commissionId}/pay`, {});
  }
}
