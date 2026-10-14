import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Workflow {
  module: 'ventes' | 'crm' | 'construction';
  libelle: string;
  description: string;
  statuts: string[];
  /** Étapes d’origine : protégées, on ne les retire pas. */
  obligatoires: string[];
  /** Passages autorisés (parcours des ventes seulement). */
  transitions?: Record<string, string[]>;
  transitionsObligatoires?: Record<string, string[]>;
  /** Nombre de dossiers par étape. */
  compte: Record<string, number>;
}

export interface WorkflowPayload {
  statuts: string[];
  transitions?: Record<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class WorkflowsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/workflows`;

  list(): Observable<Workflow[]> {
    return this.http.get<Workflow[]>(this.baseUrl);
  }

  save(module: string, payload: WorkflowPayload): Observable<Workflow> {
    return this.http.put<Workflow>(`${this.baseUrl}/${module}`, payload);
  }
}
