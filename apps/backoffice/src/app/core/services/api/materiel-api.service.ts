import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type EtatMateriel = 'neuf' | 'bon' | 'usage' | 'en_panne';
export type StatutMateriel = 'disponible' | 'affecte' | 'en_maintenance' | 'sorti';
export type TypeSortieMateriel = 'vendu' | 'reforme' | 'perdu' | 'vole' | 'donne';
export type TypeEntretien = 'preventif' | 'reparation' | 'controle';
export type RoleFichierMateriel = 'photo' | 'etiquette' | 'facture' | 'autre';
export type FiltreMateriel = 'entretien_a_prevoir' | 'garantie_proche' | 'sans_lieu';

export interface AffectationMateriel {
  type: 'collaborateur' | 'chantier' | 'libre';
  id: string | null;
  libelle: string;
}

export interface Materiel {
  id: string;
  numero: number;
  /** « MTM 0003 » : ce qui est écrit sur l'autocollant. */
  reference: string;
  designation: string;
  categorie: string;
  marque: string | null;
  modele: string | null;
  numeroSerie: string | null;
  dateAchat: string | null;
  /** Vide pour qui ne peut pas modifier. */
  prixAchat: number | null;
  fournisseur: string | null;
  garantieJusqua: string | null;
  garantieActive: boolean;
  etat: EtatMateriel;
  libelleEtat: string;
  statut: StatutMateriel;
  libelleStatut: string;
  lieu: string | null;
  affectation: AffectationMateriel | null;
  affecteLe: string | null;
  prochainEntretien: string | null;
  entretienEnRetard: boolean;
  notes: string | null;
  sortie: { type: TypeSortieMateriel; libelle: string; motif: string | null; le: string } | null;
  creeLe: string;
  modifieLe: string;
}

export interface EntretienMateriel {
  id: string;
  type: TypeEntretien;
  statut: 'prevu' | 'fait';
  date: string;
  description: string;
  cout: number | null;
  prestataire: string | null;
  enRetard: boolean;
}

export interface FichierMateriel {
  id: string;
  role: RoleFichierMateriel;
  titre: string | null;
  ajouteLe: string;
  url: string;
}

export interface LigneHistoriqueMateriel {
  id: string;
  type: string;
  resume: string;
  note: string | null;
  par: string | null;
  le: string;
}

export interface MaterielDetail extends Materiel {
  historique: LigneHistoriqueMateriel[];
  entretiens: EntretienMateriel[];
  fichiers: FichierMateriel[];
}

export interface PageMateriel {
  total: number;
  page: number;
  pageSize: number;
  items: Materiel[];
}

export interface OptionsMateriel {
  categories: string[];
  lieux: string[];
  etats: { valeur: EtatMateriel; libelle: string }[];
  statuts: { valeur: StatutMateriel; libelle: string }[];
  typesSortie: { valeur: TypeSortieMateriel; libelle: string }[];
  typesEntretien: TypeEntretien[];
  prochainNumero: number;
}

export interface TableauMateriel {
  total: number;
  parStatut: Record<StatutMateriel, number>;
  parEtat: Record<EtatMateriel, number>;
  parCategorie: { categorie: string; nombre: number }[];
  enPanne: number;
  entretiensEnRetard: number;
  garantiesProches: number;
  sansLieu: number;
  /** Vide pour qui ne peut pas modifier. */
  valeurAchat: number | null;
}

export interface RechercheMateriel {
  q?: string;
  categorie?: string;
  statut?: StatutMateriel | '';
  etat?: EtatMateriel | '';
  lieu?: string;
  filtre?: FiltreMateriel | '';
  page?: number;
  pageSize?: number;
}

export interface NouveauMateriel {
  numero?: number;
  designation: string;
  categorie: string;
  marque?: string;
  modele?: string;
  numeroSerie?: string;
  dateAchat?: string;
  prixAchat?: number;
  fournisseur?: string;
  garantieJusqua?: string;
  etat?: EtatMateriel;
  lieu?: string;
  notes?: string;
}

export type ModificationMateriel = Partial<Omit<NouveauMateriel, 'numero'>>;

export interface Destinataires {
  collaborateurs: { id: string; nom: string }[];
  chantiers: { id: string; libelle: string }[];
}

export interface LigneRapportInventaire {
  id: string;
  numero: number;
  reference: string;
  designation: string;
}

export interface RapportInventaire {
  id: string;
  lieu: string;
  statut: 'en_cours' | 'termine';
  commenceLe: string;
  termineLe: string | null;
  aSaisir: number;
  conformes: LigneRapportInventaire[];
  deplaces: (LigneRapportInventaire & { lieuFiche: string | null })[];
  manquants: (LigneRapportInventaire & { statut: StatutMateriel; explique: boolean })[];
  inconnus: { numero: number; reference: string }[];
  sortisRetrouves: LigneRapportInventaire[];
}

export interface InventaireResume {
  id: string;
  lieu: string;
  statut: 'en_cours' | 'termine';
  commenceLe: string;
  termineLe: string | null;
  par: string | null;
  numerosSaisis: number;
}

/** Patrimoine matériel de MTM : fiches (autocollant « MTM 0003 »), affectations, entretiens, inventaire. */
@Injectable({ providedIn: 'root' })
export class MaterielApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/materiel`;

  options(): Observable<OptionsMateriel> {
    return this.http.get<OptionsMateriel>(`${this.baseUrl}/options`);
  }

  tableau(): Observable<TableauMateriel> {
    return this.http.get<TableauMateriel>(`${this.baseUrl}/tableau`);
  }

  lister(recherche: RechercheMateriel): Observable<PageMateriel> {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(recherche)) {
      if (valeur !== undefined && valeur !== '' && valeur !== null)
        params = params.set(cle, String(valeur));
    }
    return this.http.get<PageMateriel>(this.baseUrl, { params });
  }

  detail(id: string): Observable<MaterielDetail> {
    return this.http.get<MaterielDetail>(`${this.baseUrl}/${id}`);
  }

  creer(payload: NouveauMateriel): Observable<MaterielDetail> {
    return this.http.post<MaterielDetail>(this.baseUrl, payload);
  }

  modifier(id: string, payload: ModificationMateriel): Observable<MaterielDetail> {
    return this.http.patch<MaterielDetail>(`${this.baseUrl}/${id}`, payload);
  }

  destinataires(q = ''): Observable<Destinataires> {
    return this.http.get<Destinataires>(`${this.baseUrl}/destinataires`, {
      params: q ? { q } : {},
    });
  }

  affecter(
    id: string,
    cible: { userId?: string; projetId?: string; nom?: string; note?: string },
  ): Observable<MaterielDetail> {
    return this.http.post<MaterielDetail>(`${this.baseUrl}/${id}/affecter`, cible);
  }

  retourner(
    id: string,
    payload: { etat?: EtatMateriel; lieu?: string; note?: string },
  ): Observable<MaterielDetail> {
    return this.http.post<MaterielDetail>(`${this.baseUrl}/${id}/retour`, payload);
  }

  sortir(
    id: string,
    payload: { type: TypeSortieMateriel; motif: string },
  ): Observable<MaterielDetail> {
    return this.http.post<MaterielDetail>(`${this.baseUrl}/${id}/sortie`, payload);
  }

  ajouterEntretien(
    id: string,
    payload: {
      type: TypeEntretien;
      description: string;
      date: string;
      fait?: boolean;
      immobilise?: boolean;
      cout?: number;
      prestataire?: string;
    },
  ): Observable<MaterielDetail> {
    return this.http.post<MaterielDetail>(`${this.baseUrl}/${id}/entretiens`, payload);
  }

  terminerEntretien(
    id: string,
    entretienId: string,
    payload: { date?: string; cout?: number; prestataire?: string; etat?: EtatMateriel },
  ): Observable<MaterielDetail> {
    return this.http.post<MaterielDetail>(
      `${this.baseUrl}/${id}/entretiens/${entretienId}/terminer`,
      payload,
    );
  }

  deposerFichier(id: string, role: RoleFichierMateriel, fichier: File): Observable<MaterielDetail> {
    const corps = new FormData();
    corps.append('role', role);
    corps.append('file', fichier);
    return this.http.post<MaterielDetail>(`${this.baseUrl}/${id}/fichiers`, corps);
  }

  // --- Inventaire ---

  inventaires(): Observable<InventaireResume[]> {
    return this.http.get<InventaireResume[]>(`${this.baseUrl}/inventaires`);
  }

  ouvrirInventaire(lieu: string): Observable<RapportInventaire> {
    return this.http.post<RapportInventaire>(`${this.baseUrl}/inventaires`, { lieu });
  }

  rapportInventaire(id: string): Observable<RapportInventaire> {
    return this.http.get<RapportInventaire>(`${this.baseUrl}/inventaires/${id}`);
  }

  saisirNumero(
    id: string,
    numero: string,
  ): Observable<{ numero: number; reference: string; connu: boolean; designation: string | null }> {
    return this.http.post<{
      numero: number;
      reference: string;
      connu: boolean;
      designation: string | null;
    }>(`${this.baseUrl}/inventaires/${id}/numeros`, { numero });
  }

  terminerInventaire(id: string, mettreAJourLieux: boolean): Observable<RapportInventaire> {
    return this.http.post<RapportInventaire>(`${this.baseUrl}/inventaires/${id}/terminer`, {
      mettreAJourLieux,
    });
  }
}
