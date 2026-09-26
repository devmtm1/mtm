import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import type {
  BudgetDetaille,
  ChantierDetail,
  ChantierOptions,
  ChantierPage,
  ChantierQuery,
  ChantierStats,
  CreateChantierPayload,
  DepenseChantier,
  DepensePayload,
  DocumentChantier,
  EntreeJournal,
  EntreeJournalPayload,
  IntervenantChantier,
  IntervenantPayload,
  JalonChantier,
  JalonPayload,
  JournalPage,
  JournalQuery,
  LigneBudget,
  LigneBudgetPayload,
  UpdateChantierPayload,
} from '../../models/chantier.model';

/** Construction et suivi de chantier (J2.3, section 16 du cahier des charges). */
@Injectable({ providedIn: 'root' })
export class ConstructionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/construction/chantiers`;

  /** Référentiels et seuils : ils changent rarement, on les garde en session. */
  private options$?: Observable<ChantierOptions>;

  // --- Chantiers ---

  findAll(query: ChantierQuery = {}): Observable<ChantierPage> {
    return this.http.get<ChantierPage>(this.baseUrl, {
      params: this.params(query),
    });
  }

  findOne(id: string): Observable<ChantierDetail> {
    return this.http.get<ChantierDetail>(`${this.baseUrl}/${id}`);
  }

  getOptions(): Observable<ChantierOptions> {
    this.options$ ??= this.http
      .get<ChantierOptions>(`${this.baseUrl}/options`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.options$;
  }

  getStats(): Observable<ChantierStats> {
    return this.http.get<ChantierStats>(`${this.baseUrl}/stats`);
  }

  create(payload: CreateChantierPayload): Observable<ChantierDetail> {
    return this.http.post<ChantierDetail>(this.baseUrl, payload);
  }

  update(
    id: string,
    payload: UpdateChantierPayload,
  ): Observable<ChantierDetail> {
    return this.http.patch<ChantierDetail>(`${this.baseUrl}/${id}`, payload);
  }

  /** Changement de statut : démarrage, suspension, réception, clôture. */
  transition(
    id: string,
    statut: string,
    motif?: string,
  ): Observable<ChantierDetail> {
    return this.http.post<ChantierDetail>(`${this.baseUrl}/${id}/transition`, {
      statut,
      ...(motif ? { motif } : {}),
    });
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  // --- Planning ---

  getJalons(id: string): Observable<JalonChantier[]> {
    return this.http.get<JalonChantier[]>(`${this.baseUrl}/${id}/jalons`);
  }

  createJalon(id: string, payload: JalonPayload): Observable<JalonChantier> {
    return this.http.post<JalonChantier>(
      `${this.baseUrl}/${id}/jalons`,
      payload,
    );
  }

  updateJalon(
    id: string,
    jalonId: string,
    payload: JalonPayload,
  ): Observable<JalonChantier> {
    return this.http.patch<JalonChantier>(
      `${this.baseUrl}/${id}/jalons/${jalonId}`,
      payload,
    );
  }

  /** Réordonnancement complet après glisser-déposer. */
  reordonnerJalons(id: string, ordre: string[]): Observable<JalonChantier[]> {
    return this.http.patch<JalonChantier[]>(
      `${this.baseUrl}/${id}/jalons/reordonner`,
      { ordre },
    );
  }

  removeJalon(id: string, jalonId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${id}/jalons/${jalonId}`,
    );
  }

  // --- Journal de chantier ---

  getJournal(id: string, query: JournalQuery = {}): Observable<JournalPage> {
    return this.http.get<JournalPage>(`${this.baseUrl}/${id}/journal`, {
      params: this.params(query),
    });
  }

  createEntree(
    id: string,
    payload: EntreeJournalPayload,
  ): Observable<EntreeJournal> {
    return this.http.post<EntreeJournal>(
      `${this.baseUrl}/${id}/journal`,
      payload,
    );
  }

  updateEntree(
    id: string,
    entreeId: string,
    payload: EntreeJournalPayload,
  ): Observable<EntreeJournal> {
    return this.http.patch<EntreeJournal>(
      `${this.baseUrl}/${id}/journal/${entreeId}`,
      payload,
    );
  }

  removeEntree(
    id: string,
    entreeId: string,
  ): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${id}/journal/${entreeId}`,
    );
  }

  // --- Prestataires ---

  getIntervenants(id: string): Observable<IntervenantChantier[]> {
    return this.http.get<IntervenantChantier[]>(
      `${this.baseUrl}/${id}/intervenants`,
    );
  }

  createIntervenant(
    id: string,
    payload: IntervenantPayload,
  ): Observable<IntervenantChantier> {
    return this.http.post<IntervenantChantier>(
      `${this.baseUrl}/${id}/intervenants`,
      payload,
    );
  }

  updateIntervenant(
    id: string,
    intervenantId: string,
    payload: IntervenantPayload,
  ): Observable<IntervenantChantier> {
    return this.http.patch<IntervenantChantier>(
      `${this.baseUrl}/${id}/intervenants/${intervenantId}`,
      payload,
    );
  }

  removeIntervenant(
    id: string,
    intervenantId: string,
  ): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${id}/intervenants/${intervenantId}`,
    );
  }

  // --- Budget et dépenses ---

  getBudget(id: string): Observable<BudgetDetaille> {
    return this.http.get<BudgetDetaille>(`${this.baseUrl}/${id}/budget`);
  }

  createLigne(
    id: string,
    payload: LigneBudgetPayload,
  ): Observable<LigneBudget> {
    return this.http.post<LigneBudget>(
      `${this.baseUrl}/${id}/budget/lignes`,
      payload,
    );
  }

  updateLigne(
    id: string,
    ligneId: string,
    payload: LigneBudgetPayload,
  ): Observable<LigneBudget> {
    return this.http.patch<LigneBudget>(
      `${this.baseUrl}/${id}/budget/lignes/${ligneId}`,
      payload,
    );
  }

  removeLigne(id: string, ligneId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${id}/budget/lignes/${ligneId}`,
    );
  }

  createDepense(
    id: string,
    payload: DepensePayload,
  ): Observable<DepenseChantier> {
    return this.http.post<DepenseChantier>(
      `${this.baseUrl}/${id}/depenses`,
      payload,
    );
  }

  /** Contrôle comptable : distinct de la saisie (section 24). */
  validerDepense(id: string, depenseId: string): Observable<DepenseChantier> {
    return this.http.post<DepenseChantier>(
      `${this.baseUrl}/${id}/depenses/${depenseId}/valider`,
      {},
    );
  }

  rejeterDepense(
    id: string,
    depenseId: string,
    motif: string,
  ): Observable<DepenseChantier> {
    return this.http.post<DepenseChantier>(
      `${this.baseUrl}/${id}/depenses/${depenseId}/rejeter`,
      { motif },
    );
  }

  removeDepense(
    id: string,
    depenseId: string,
  ): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${id}/depenses/${depenseId}`,
    );
  }

  // --- Pièces et rapport ---

  uploadDocument(
    id: string,
    file: File,
    type: string,
    title?: string,
    entreeJournalId?: string,
  ): Observable<DocumentChantier> {
    const data = new FormData();
    data.append('file', file);
    data.append('type', type);
    if (title) data.append('title', title);
    if (entreeJournalId) data.append('entreeJournalId', entreeJournalId);
    return this.http.post<DocumentChantier>(
      `${this.baseUrl}/${id}/documents`,
      data,
    );
  }

  /** Rapport d'avancement remis au client : publié d'office. */
  genererRapport(id: string): Observable<DocumentChantier> {
    return this.http.post<DocumentChantier>(`${this.baseUrl}/${id}/rapport`, {});
  }

  setVisibiliteDocument(
    id: string,
    documentId: string,
    visibleClient: boolean,
  ): Observable<DocumentChantier> {
    return this.http.patch<DocumentChantier>(
      `${this.baseUrl}/${id}/documents/${documentId}/visibilite`,
      { visibleClient },
    );
  }

  removeDocument(
    id: string,
    documentId: string,
  ): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${id}/documents/${documentId}`,
    );
  }

  /**
   * `object` et non `Record<string, unknown>` : une interface déclarée sans
   * signature d'index n'est pas assignable au second, et déclarer cette
   * signature sur les requêtes leur ferait accepter n'importe quelle clé.
   */
  private params(query: object): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([cle, valeur]) => {
      if (valeur !== undefined && valeur !== '') {
        params = params.set(cle, String(valeur));
      }
    });
    return params;
  }
}
