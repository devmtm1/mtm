import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PersonneRef } from './taches-api.service';

export type Activite = 'vente' | 'locatif' | 'demarches' | 'construction' | 'general';

export interface TotauxFinanciers {
  encaissements: number;
  revenu: number;
  depenses: number;
  resultat: number;
}

export interface TotauxActivite extends TotauxFinanciers {
  activite: Activite;
  libelle: string;
}

export interface PointSerie {
  periode: string;
  encaissements: number;
  revenu: number;
  depenses: number;
}

export interface LigneDue {
  id: string;
  libelle: string;
  tiers: string | null;
  echeance: string | null;
  reste: number;
  lien: string;
}

export interface BlocDu {
  total: number;
  nombre: number;
  lignes: LigneDue[];
}

export interface AEncaisser {
  loyers: BlocDu;
  ventes: BlocDu;
  missions: BlocDu;
  commissionsAPayer: { total: number; nombre: number };
  avenir30Jours: { ventes: number; loyers: number };
}

export interface TableauFinancier {
  periode: { du: string; auInclus: string };
  totaux: TotauxFinanciers;
  precedent: TotauxFinanciers;
  parActivite: TotauxActivite[];
  serie: PointSerie[];
  margesInconnues: number;
  tauxGestionDefaut: number;
  aEncaisser: AEncaisser;
  operationsEnAttente: number;
}

export interface LigneJournal {
  id: string;
  date: string;
  activite: Activite;
  sens: 'entree' | 'sortie';
  nature: string;
  libelle: string;
  tiers: string | null;
  reference: string | null;
  mode: string | null;
  montant: number;
  revenu: number;
  lien: string | null;
}

export interface JournalPage {
  items: LigneJournal[];
  total: number;
  page: number;
  pageSize: number;
  totaux: TotauxFinanciers;
}

export interface JournalQuery {
  du: string;
  au: string;
  activite?: string;
  sens?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type StatutOperation = 'en_attente' | 'validee' | 'rejetee';

export interface OperationFinanciere {
  id: string;
  sens: 'recette' | 'depense';
  activite: Activite;
  categorie: string;
  libelle: string;
  montant: number;
  date: string;
  modePaiement: string | null;
  reference: string | null;
  tiers: string | null;
  statut: StatutOperation;
  motifRejet: string | null;
  justificatifUrl: string | null;
  createdById: string;
  createdBy: PersonneRef;
  validatedBy: PersonneRef | null;
  validatedAt: string | null;
  createdAt: string;
}

export interface OperationsPage {
  items: OperationFinanciere[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OperationPayload {
  sens: string;
  activite: string;
  categorie: string;
  libelle: string;
  montant: number;
  date: string;
  modePaiement?: string;
  reference?: string;
  tiers?: string;
}

export interface MoisCloture {
  periode: string;
  cloture: boolean;
  clotureLe: string | null;
  par: PersonneRef | null;
  resume: { totaux: TotauxFinanciers; mouvements: number } | null;
  peutEtreCloture: boolean;
}

export interface ExportPayload {
  du: string;
  au: string;
  format: 'csv' | 'xlsx';
  justification: string;
}

@Injectable({ providedIn: 'root' })
export class FinancesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/finances`;

  tableau(du: string, au: string): Observable<TableauFinancier> {
    return this.http.get<TableauFinancier>(`${this.baseUrl}/tableau`, {
      params: new HttpParams().set('du', du).set('au', au),
    });
  }

  journal(query: JournalQuery): Observable<JournalPage> {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(query)) {
      if (valeur !== undefined && valeur !== '') params = params.set(cle, String(valeur));
    }
    return this.http.get<JournalPage>(`${this.baseUrl}/journal`, { params });
  }

  categories(): Observable<{ depenses: string[]; recettes: string[] }> {
    return this.http.get<{ depenses: string[]; recettes: string[] }>(`${this.baseUrl}/categories`);
  }

  operations(query: { statut?: string; activite?: string; sens?: string; page?: number; pageSize?: number }): Observable<OperationsPage> {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(query)) {
      if (valeur !== undefined && valeur !== '') params = params.set(cle, String(valeur));
    }
    return this.http.get<OperationsPage>(`${this.baseUrl}/operations`, { params });
  }

  createOperation(payload: OperationPayload): Observable<OperationFinanciere> {
    return this.http.post<OperationFinanciere>(`${this.baseUrl}/operations`, payload);
  }

  updateOperation(id: string, payload: Partial<OperationPayload>): Observable<OperationFinanciere> {
    return this.http.patch<OperationFinanciere>(`${this.baseUrl}/operations/${id}`, payload);
  }

  validateOperation(id: string): Observable<OperationFinanciere> {
    return this.http.post<OperationFinanciere>(`${this.baseUrl}/operations/${id}/valider`, {});
  }

  rejectOperation(id: string, motif: string): Observable<OperationFinanciere> {
    return this.http.post<OperationFinanciere>(`${this.baseUrl}/operations/${id}/rejeter`, { motif });
  }

  attachProof(id: string, file: File): Observable<OperationFinanciere> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<OperationFinanciere>(`${this.baseUrl}/operations/${id}/justificatif`, body);
  }

  removeOperation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/operations/${id}`);
  }

  clotures(): Observable<MoisCloture[]> {
    return this.http.get<MoisCloture[]>(`${this.baseUrl}/clotures`);
  }

  cloturer(periode: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/clotures`, { periode });
  }

  rouvrir(periode: string, justification: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/clotures/${periode}`, { body: { justification } });
  }

  exporter(payload: ExportPayload): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export`, payload, { responseType: 'blob' });
  }
}
