import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Les listes exportables : la même clé sert à l'API pour savoir quel droit « exporter » exiger. */
export type ModuleExportable =
  | 'terrains'
  | 'programmes'
  | 'mandats'
  | 'crm'
  | 'proprietaires'
  | 'ventes'
  | 'demarches'
  | 'locatif'
  | 'construction'
  | 'finances'
  | 'contacts'
  | 'users'
  | 'taches'
  | 'documents';

export type TypeColonneExport = 'texte' | 'nombre' | 'montant' | 'date' | 'pourcentage';

export interface ColonneExport {
  cle: string;
  libelle: string;
  type: TypeColonneExport;
}

export type LigneExport = Record<string, string | number | null>;

/** Ce qu'une liste fournit pour être exportée : ses colonnes et ses lignes telles qu'affichées. */
export interface SourceExport {
  module: ModuleExportable;
  titre: string;
  sousTitre?: string;
  colonnes: ColonneExport[];
  lignes: LigneExport[];
}

export type FormatExport = 'xlsx' | 'pdf';

@Injectable({ providedIn: 'root' })
export class ExportsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/exports`;

  /** La justification part dans le corps, jamais dans l'URL ; l'export est consigné dans le journal d'audit. */
  exporterTableau(source: SourceExport, format: FormatExport, justification: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/tableau`, { ...source, format, justification }, { responseType: 'blob' });
  }
}
