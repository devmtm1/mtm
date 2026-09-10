import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  DossierVenteListItem,
  ReservationRequestItem,
  VenteDashboardStats,
  VenteDetail,
  VenteDocumentSearchItem,
  VenteEcheance,
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

  findReservationRequests(): Observable<ReservationRequestItem[]> {
    return this.http.get<ReservationRequestItem[]>(`${this.baseUrl}/reservation-requests`);
  }

  createDossier(payload: {
    prospectId: string;
    prixVente?: number;
    statut?: string;
    notes?: string;
  }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}`, payload);
  }

  createClientAccount(prospectId: string, password: string): Observable<{ id: string; email: string; firstName: string; lastName: string }> {
    return this.http.post<{ id: string; email: string; firstName: string; lastName: string }>(
      `${this.baseUrl}/client-accounts`,
      { prospectId, password },
    );
  }

  convertReservationRequest(
    requestId: string,
    payload: { mandatId?: string; commercialResponsableId?: string; prixVente?: number; notes?: string },
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
    payload: { montant: number; mode: string; reference?: string },
  ): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${dossierId}/paiements`, payload);
  }

  getDashboardStats(): Observable<VenteDashboardStats> {
    return this.http.get<VenteDashboardStats>(`${this.baseUrl}/dashboard/stats`);
  }

  getCommercialPerformance(commercialId: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/dashboard/commercial/${commercialId}`);
  }

  searchDocuments(filters: {
    dossierVenteId?: string;
    prospectId?: string;
    terrainId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Observable<VenteDocumentSearchItem[]> {
    return this.http.get<VenteDocumentSearchItem[]>(`${this.baseUrl}/documents/search`, {
      params: filters,
    });
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
      commercialId?: string;
      typeRegle?: string;
      taux?: number;
      montantFixe?: number;
      montantEstime?: number;
      bonus?: number;
      palier?: number;
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
