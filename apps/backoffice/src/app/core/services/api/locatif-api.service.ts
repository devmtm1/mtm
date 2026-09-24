import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import type {
  BailDetail,
  BienDetail,
  BienPage,
  BienQuery,
  ChangerLocatairePayload,
  CreateBailPayload,
  CreateBienPayload,
  CreateIncidentPayload,
  CreateLocatairePayload,
  CreateMouvementCautionPayload,
  CreatePaiementPayload,
  CautionBail,
  DocumentLocatif,
  EcheanceLoyer,
  EnvoyerRelancePayload,
  GenererRelevePayload,
  IncidentLocatif,
  Locataire,
  LocataireBail,
  LocatifOptions,
  LocatifPersonne,
  LocatifStats,
  PaiementLoyer,
  PreavisPayload,
  Regularisation,
  RejetPaiementPayload,
  RelanceLoyer,
  ResiliationSansPreavisPayload,
  SoldeBail,
  SortiePayload,
  VisibiliteDocumentPayload,
  UpdateBailPayload,
  UpdateBienPayload,
  UpdateIncidentPayload,
  UpdateLocatairePayload,
} from '../../models/locatif.model';
import type { ClientAccountCreated } from '../../models/client-account.model';

/** Gestion locative (J2.1, section 15 du cahier des charges). */
@Injectable({ providedIn: 'root' })
export class LocatifApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/locatif`;

  private options$?: Observable<LocatifOptions>;

  // --- Biens ---

  findBiens(query: BienQuery = {}): Observable<BienPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([cle, valeur]) => {
      if (valeur !== undefined && valeur !== '') params = params.set(cle, String(valeur));
    });
    return this.http.get<BienPage>(`${this.baseUrl}/biens`, { params });
  }

  findBien(id: string): Observable<BienDetail> {
    return this.http.get<BienDetail>(`${this.baseUrl}/biens/${id}`);
  }

  getOptions(): Observable<LocatifOptions> {
    this.options$ ??= this.http
      .get<LocatifOptions>(`${this.baseUrl}/biens/options`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.options$;
  }

  getCollaborateurs(): Observable<LocatifPersonne[]> {
    return this.http.get<LocatifPersonne[]>(`${this.baseUrl}/biens/collaborateurs`);
  }

  getStats(): Observable<LocatifStats> {
    return this.http.get<LocatifStats>(`${this.baseUrl}/biens/stats`);
  }

  createBien(payload: CreateBienPayload): Observable<BienDetail> {
    return this.http.post<BienDetail>(`${this.baseUrl}/biens`, payload);
  }

  updateBien(id: string, payload: UpdateBienPayload): Observable<BienDetail> {
    return this.http.patch<BienDetail>(`${this.baseUrl}/biens/${id}`, payload);
  }

  removeBien(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/biens/${id}`);
  }

  // --- Baux ---

  findBaux(bienId: string): Observable<BailDetail[]> {
    return this.http.get<BailDetail[]>(`${this.baseUrl}/biens/${bienId}/baux`);
  }

  findBail(bailId: string): Observable<BailDetail> {
    return this.http.get<BailDetail>(`${this.baseUrl}/baux/${bailId}`);
  }

  createBail(bienId: string, payload: CreateBailPayload): Observable<BailDetail> {
    return this.http.post<BailDetail>(`${this.baseUrl}/biens/${bienId}/baux`, payload);
  }

  updateBail(bailId: string, payload: UpdateBailPayload): Observable<BailDetail> {
    return this.http.patch<BailDetail>(`${this.baseUrl}/baux/${bailId}`, payload);
  }

  donnerPreavis(bailId: string, payload: PreavisPayload): Observable<BailDetail> {
    return this.http.patch<BailDetail>(`${this.baseUrl}/baux/${bailId}/preavis`, payload);
  }

  cloturerBail(bailId: string, payload: SortiePayload): Observable<BailDetail> {
    return this.http.post<BailDetail>(`${this.baseUrl}/baux/${bailId}/sortie`, payload);
  }

  resilierSansPreavis(
    bailId: string,
    payload: ResiliationSansPreavisPayload,
  ): Observable<BailDetail> {
    return this.http.post<BailDetail>(
      `${this.baseUrl}/baux/${bailId}/resiliation-sans-preavis`,
      payload,
    );
  }

  changerLocataire(
    bienId: string,
    payload: ChangerLocatairePayload,
  ): Observable<BailDetail> {
    return this.http.post<BailDetail>(
      `${this.baseUrl}/biens/${bienId}/baux/changer-locataire`,
      payload,
    );
  }

  // --- Échéances et paiements ---

  getEcheances(bailId: string): Observable<EcheanceLoyer[]> {
    return this.http.get<EcheanceLoyer[]>(`${this.baseUrl}/baux/${bailId}/echeances`);
  }

  findPaiements(bailId: string): Observable<PaiementLoyer[]> {
    return this.http.get<PaiementLoyer[]>(`${this.baseUrl}/baux/${bailId}/paiements`);
  }

  createPaiement(
    bailId: string,
    payload: CreatePaiementPayload,
  ): Observable<PaiementLoyer> {
    return this.http.post<PaiementLoyer>(`${this.baseUrl}/baux/${bailId}/paiements`, payload);
  }

  /** Contrôle des encaissements : c'est la validation qui met le solde à jour. */
  validerPaiement(bailId: string, paiementId: string): Observable<PaiementLoyer> {
    return this.http.post<PaiementLoyer>(
      `${this.baseUrl}/baux/${bailId}/paiements/${paiementId}/valider`,
      {},
    );
  }

  rejeterPaiement(
    bailId: string,
    paiementId: string,
    payload: RejetPaiementPayload,
  ): Observable<PaiementLoyer> {
    return this.http.post<PaiementLoyer>(
      `${this.baseUrl}/baux/${bailId}/paiements/${paiementId}/rejeter`,
      payload,
    );
  }

  getSolde(bailId: string): Observable<SoldeBail> {
    return this.http.get<SoldeBail>(`${this.baseUrl}/baux/${bailId}/solde`);
  }

  // --- Caution (historique, section 15) ---

  getCaution(bailId: string): Observable<CautionBail> {
    return this.http.get<CautionBail>(`${this.baseUrl}/baux/${bailId}/caution`);
  }

  enregistrerMouvementCaution(
    bailId: string,
    payload: CreateMouvementCautionPayload,
  ): Observable<CautionBail> {
    return this.http.post<CautionBail>(`${this.baseUrl}/baux/${bailId}/caution`, payload);
  }

  /** Calcul de régularisation proposé avant la clôture (section 15). */
  getRegularisation(bailId: string, dateSortie?: string): Observable<Regularisation> {
    let params = new HttpParams();
    if (dateSortie) params = params.set('dateSortie', dateSortie);
    return this.http.get<Regularisation>(`${this.baseUrl}/baux/${bailId}/regularisation`, {
      params,
    });
  }

  // --- Relances (section 15) ---

  findRelances(statut?: string, bienLocatifId?: string): Observable<RelanceLoyer[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    if (bienLocatifId) params = params.set('bienLocatifId', bienLocatifId);
    return this.http.get<RelanceLoyer[]>(`${this.baseUrl}/relances`, { params });
  }

  countRelances(): Observable<{ aEnvoyer: number }> {
    return this.http.get<{ aEnvoyer: number }>(`${this.baseUrl}/relances/compteur`);
  }

  envoyerRelance(id: string, payload: EnvoyerRelancePayload): Observable<RelanceLoyer> {
    return this.http.post<RelanceLoyer>(`${this.baseUrl}/relances/${id}/envoyer`, payload);
  }

  annulerRelance(id: string): Observable<RelanceLoyer> {
    return this.http.post<RelanceLoyer>(`${this.baseUrl}/relances/${id}/annuler`, {});
  }

  findRelancesDuBail(bailId: string): Observable<RelanceLoyer[]> {
    return this.http.get<RelanceLoyer[]>(`${this.baseUrl}/baux/${bailId}/relances`);
  }

  /** Relevé de gestion publié dans l'espace propriétaire. */
  genererReleve(bienId: string, payload: GenererRelevePayload = {}): Observable<DocumentLocatif> {
    return this.http.post<DocumentLocatif>(`${this.baseUrl}/biens/${bienId}/releve`, payload);
  }

  genererQuittance(bailId: string, echeanceId: string): Observable<DocumentLocatif> {
    return this.http.post<DocumentLocatif>(
      `${this.baseUrl}/baux/${bailId}/echeances/${echeanceId}/quittance`,
      {},
    );
  }

  // --- Incidents ---

  findIncidents(bailId: string, nature?: string): Observable<IncidentLocatif[]> {
    let params = new HttpParams();
    if (nature) params = params.set('nature', nature);
    return this.http.get<IncidentLocatif[]>(`${this.baseUrl}/baux/${bailId}/incidents`, {
      params,
    });
  }

  createIncident(
    bailId: string,
    payload: CreateIncidentPayload,
  ): Observable<IncidentLocatif> {
    return this.http.post<IncidentLocatif>(`${this.baseUrl}/baux/${bailId}/incidents`, payload);
  }

  updateIncident(
    bailId: string,
    incidentId: string,
    payload: UpdateIncidentPayload,
  ): Observable<IncidentLocatif> {
    return this.http.patch<IncidentLocatif>(
      `${this.baseUrl}/baux/${bailId}/incidents/${incidentId}`,
      payload,
    );
  }

  // --- Documents ---

  findDocuments(bailId: string): Observable<DocumentLocatif[]> {
    return this.http.get<DocumentLocatif[]>(`${this.baseUrl}/baux/${bailId}/documents`);
  }

  addDocument(
    bailId: string,
    type: string,
    file: File,
    title?: string,
  ): Observable<DocumentLocatif> {
    const formulaire = new FormData();
    formulaire.append('file', file);
    formulaire.append('type', type);
    if (title) formulaire.append('title', title);
    return this.http.post<DocumentLocatif>(`${this.baseUrl}/baux/${bailId}/documents`, formulaire);
  }

  setDocumentVisibility(
    bailId: string,
    documentId: string,
    payload: VisibiliteDocumentPayload,
  ): Observable<DocumentLocatif> {
    return this.http.patch<DocumentLocatif>(
      `${this.baseUrl}/baux/${bailId}/documents/${documentId}/visibilite`,
      payload,
    );
  }

  removeDocument(bailId: string, documentId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/baux/${bailId}/documents/${documentId}`,
    );
  }

  // --- Locataires ---

  findLocataires(search?: string): Observable<Locataire[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<Locataire[]>(`${this.baseUrl}/locataires`, { params });
  }

  findLocataire(id: string): Observable<Locataire> {
    return this.http.get<Locataire>(`${this.baseUrl}/locataires/${id}`);
  }

  findLocataireBaux(id: string): Observable<LocataireBail[]> {
    return this.http.get<LocataireBail[]>(`${this.baseUrl}/locataires/${id}/baux`);
  }

  createLocataire(payload: CreateLocatairePayload): Observable<Locataire> {
    return this.http.post<Locataire>(`${this.baseUrl}/locataires`, payload);
  }

  updateLocataire(id: string, payload: UpdateLocatairePayload): Observable<Locataire> {
    return this.http.patch<Locataire>(`${this.baseUrl}/locataires/${id}`, payload);
  }

  /**
   * Ouvre l'espace client (« Ma location »). L'API envoie l'invitation par
   * e-mail ; si l'envoi échoue, elle renvoie le jeton pour une transmission
   * par un autre canal.
   */
  createLocataireClientAccount(id: string, password: string): Observable<ClientAccountCreated> {
    return this.http.post<ClientAccountCreated>(`${this.baseUrl}/locataires/${id}/compte-client`, { password });
  }
}
