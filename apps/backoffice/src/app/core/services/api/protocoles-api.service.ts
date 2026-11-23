import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type StatutProtocole =
  | 'a_preparer'
  | 'prepare_a_verifier'
  | 'envoye'
  | 'en_attente_signature'
  | 'signe_client'
  | 'signe_mtm'
  | 'a_valider_direction'
  | 'valide'
  | 'a_corriger'
  | 'annule';

export interface ProtocoleDocument {
  id: string;
  titre: string | null;
  type: string;
  version: number;
  ajouteLe: string;
  url: string;
}

export interface ProtocoleDossierResume {
  id: string;
  reference: string | null;
  statut: string;
  client: string | null;
  telephone: string | null;
  bien: string | null;
  responsable: string | null;
  montantConvenu: number | null;
  montantEncaisse: number;
  soldeRestant: number | null;
  paiementsEnregistres: number;
}

export interface Protocole {
  id: string;
  type: string;
  titre: string | null;
  statut: StatutProtocole;
  libelleStatut: string;
  dateEnvoi: string | null;
  moyenEnvoi: string | null;
  dateReceptionSignee: string | null;
  dateSignatureMtm: string | null;
  motif: string | null;
  enRetard: boolean;
  creeLe: string;
  modifieLe: string;
  documentPrepare: ProtocoleDocument | null;
  documentSigne: ProtocoleDocument | null;
  dossier: ProtocoleDossierResume;
}

export interface LigneHistorique {
  id: string;
  de: string | null;
  vers: string;
  libelle: string;
  note: string | null;
  par: string | null;
  le: string;
}

export interface ProtocoleDetail extends Protocole {
  historique: LigneHistorique[];
}

export interface PageProtocoles {
  total: number;
  page: number;
  pageSize: number;
  items: Protocole[];
}

export interface AlerteSignature extends ProtocoleDossierResume {
  protocoleActuel: string;
  dernierPaiement: string | null;
}

export interface TableauProtocoles {
  delaiRappelJours: number;
  /** Date (AAAA-MM-JJ) avant laquelle les dossiers ne déclenchent pas d'alerte ; `null` : tous les dossiers sont suivis. */
  suiviDepuis: string | null;
  dossiers: { crees: number; enCours: number; incomplets: number };
  protocoles: {
    parStatut: Record<string, number>;
    aPreparer: number;
    prepares: number;
    envoyes: number;
    enAttenteSignature: number;
    signesClient: number;
    aValider: number;
    enRetard: number;
  };
  paiements: { avecSignature: number; sansSignature: number };
}

export interface OptionsProtocoles {
  statuts: { valeur: StatutProtocole; libelle: string }[];
  types: string[];
  moyensEnvoi: string[];
  transitions: Record<StatutProtocole, StatutProtocole[]>;
}

export type FiltreProtocoles = 'sans_signature' | 'en_retard' | 'incomplets' | 'a_valider' | 'en_attente';

/** Statuts où la copie signée est bien reçue (« envoyé » n'en fait jamais partie). */
export const STATUTS_SIGNES: readonly string[] = ['signe_client', 'signe_mtm', 'a_valider_direction', 'valide'];

/**
 * « PAIEMENT REÇU – SIGNATURE MANQUANTE » : de l'argent est encaissé sur un dossier non annulé alors qu'aucun de ses protocoles
 * n'est signé. `null` tant que les protocoles ne sont pas chargés (ou sans droit de les voir) : on n'alerte pas dans le doute.
 */
export function signatureManquante(
  protocoles: readonly { statut: string }[] | null,
  dossier: { statut: string; montantPaye: number | string | null } | null,
): boolean {
  if (protocoles === null || !dossier || dossier.statut === 'annule') return false;
  if (!(Number(dossier.montantPaye) > 0)) return false;
  return !protocoles.some((protocole) => STATUTS_SIGNES.includes(protocole.statut));
}

export interface ResponsableProtocoles {
  id: string;
  nom: string;
}

/** Les filtres communs à la liste, au tableau de bord et à l'alerte. */
export interface FiltresProtocoles {
  q?: string;
  responsableId?: string;
  depuis?: string;
  jusqua?: string;
}

export interface RechercheProtocoles extends FiltresProtocoles {
  dossierVenteId?: string;
  statut?: string;
  filtre?: FiltreProtocoles | '';
  page?: number;
  pageSize?: number;
}

export interface ChangementStatut {
  statut: StatutProtocole;
  motif?: string;
  note?: string;
  dateEnvoi?: string;
  moyenEnvoi?: string;
  dateReceptionSignee?: string;
}

/** Suivi des protocoles et des signatures des dossiers de vente. */
@Injectable({ providedIn: 'root' })
export class ProtocolesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/protocoles`;

  options(): Observable<OptionsProtocoles> {
    return this.http.get<OptionsProtocoles>(`${this.baseUrl}/options`);
  }

  responsables(): Observable<ResponsableProtocoles[]> {
    return this.http.get<ResponsableProtocoles[]>(`${this.baseUrl}/responsables`);
  }

  tableau(filtres: FiltresProtocoles = {}): Observable<TableauProtocoles> {
    return this.http.get<TableauProtocoles>(`${this.baseUrl}/tableau`, { params: this.parametres(filtres) });
  }

  alertes(filtres: FiltresProtocoles = {}): Observable<AlerteSignature[]> {
    return this.http.get<AlerteSignature[]>(`${this.baseUrl}/alertes`, { params: this.parametres(filtres) });
  }

  lister(recherche: RechercheProtocoles): Observable<PageProtocoles> {
    return this.http.get<PageProtocoles>(this.baseUrl, { params: this.parametres(recherche) });
  }

  private parametres(valeurs: object): HttpParams {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(valeurs)) {
      if (valeur !== undefined && valeur !== '' && valeur !== null) params = params.set(cle, String(valeur));
    }
    return params;
  }

  detail(id: string): Observable<ProtocoleDetail> {
    return this.http.get<ProtocoleDetail>(`${this.baseUrl}/${id}`);
  }

  creer(payload: { dossierVenteId: string; type?: string; titre?: string }): Observable<ProtocoleDetail> {
    return this.http.post<ProtocoleDetail>(this.baseUrl, payload);
  }

  changerStatut(id: string, changement: ChangementStatut): Observable<ProtocoleDetail> {
    return this.http.patch<ProtocoleDetail>(`${this.baseUrl}/${id}/statut`, changement);
  }

  deposerDocument(id: string, role: 'prepare' | 'signe', fichier: File, titre?: string): Observable<ProtocoleDetail> {
    const corps = new FormData();
    corps.append('role', role);
    if (titre) corps.append('title', titre);
    corps.append('file', fichier);
    return this.http.post<ProtocoleDetail>(`${this.baseUrl}/${id}/documents`, corps);
  }
}
