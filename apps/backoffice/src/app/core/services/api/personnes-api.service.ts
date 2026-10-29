import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type RolePersonne = 'prospect' | 'proprietaire' | 'locataire';

export interface FichePersonne {
  role: RolePersonne;
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  reference: string | null;
  parcours?: string | null;
}

export interface Personne {
  cle: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  fiches: FichePersonne[];
  /** Plusieurs fiches de même rôle pour la même personne : un doublon à fusionner. */
  doublon: boolean;
}

/** Ce que l'on peut isoler dans le répertoire : un rôle, ou les personnes à vérifier (doublons). */
export type FiltrePersonnes = 'tous' | RolePersonne | 'doublon';

export interface RequetePersonnes {
  search: string;
  filtre: FiltrePersonnes;
  page: number;
  pageSize: number;
}

export interface CompteursPersonnes {
  total: number;
  prospect: number;
  proprietaire: number;
  locataire: number;
  doublon: number;
}

export interface RepertoirePersonnes {
  items: Personne[];
  page: number;
  pageSize: number;
  /** Nombre de personnes correspondant à la recherche et au filtre (toutes pages confondues). */
  total: number;
  pages: number;
  /** Les chiffres de toute la recherche, quelle que soit la page ou le filtre. */
  compteurs: CompteursPersonnes;
  /** Les sources que l'utilisateur a le droit de consulter (prospect, propriétaire, locataire). */
  sourcesAccessibles: RolePersonne[];
  /** Une source a atteint le plafond de lecture : la recherche est incomplète. */
  tronque: boolean;
}

@Injectable({ providedIn: 'root' })
export class PersonnesApiService {
  private readonly http = inject(HttpClient);

  rechercher(requete: RequetePersonnes): Observable<RepertoirePersonnes> {
    let params = new HttpParams()
      .set('filtre', requete.filtre)
      .set('page', requete.page)
      .set('pageSize', requete.pageSize);
    if (requete.search) params = params.set('search', requete.search);
    return this.http.get<RepertoirePersonnes>(`${environment.apiUrl}/personnes`, { params });
  }
}
