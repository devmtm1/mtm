import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Conditions de vente : celles d'un programme, d'une catégorie de lots ou d'un lot. */
export interface ConditionsLot {
  modalitePaiement?: string | null;
  dureeMoratoireMois?: number | null;
  acompteMontant?: number | string | null;
}

export interface ProgrammeResume extends ConditionsLot {
  id: string;
  reference: string;
  nom: string;
  region: string | null;
  commune: string | null;
  localisationDetail: string | null;
  description: string | null;
  proprietaireId: string | null;
  proprietaire: { id: string; firstName: string; lastName: string } | null;
  statutJuridique: string;
  typeDocumentFoncier: string | null;
  niveauVerification: string;
  prixLot: number | string | null;
  nombreLots: number;
  lotsDisponibles: number;
  lotsReserves: number;
  lotsVendus: number;
  lotsBrouillon: number;
  /** Produit détenu en direct par MTM : pas de propriétaire intermédiaire, donc une marge et non une commission. */
  produitDirect: boolean;
  /** Commission ou marge de MTM par lot : données sensibles, vides pour qui n'a pas le droit de les voir. */
  commissionLot: number | string | null;
  margeLot: number | string | null;
  /** Le programme porte-t-il ce que la comptabilité attend de chaque lot vendu ? */
  comptaComplete: boolean;
  /** Annoncé sur le site public tant qu'il reste un lot à vendre. */
  publie: boolean;
}

/** Un visuel du programme pour le site public : une photo (la première est la couverture) ou le plan de masse. */
export interface MediaProgramme {
  id: string;
  type: 'photo' | 'plan' | string;
  title: string | null;
  sortOrder: number;
  secureUrl: string;
}

export interface CategorieLot extends ConditionsLot {
  id: string;
  nom: string;
  prixPublic: number | string | null;
  commission: number | string | null;
  marge: number | string | null;
}

export interface LotProgramme extends ConditionsLot {
  id: string;
  referenceInterne: string;
  numeroLot: string | null;
  nom: string;
  superficie: number | string | null;
  uniteSuperficie: string | null;
  prixPublic: number | string | null;
  statutCommercial: string;
  categorieLotId: string | null;
  /** Le lot a-t-il la commission (bien confié) ou la marge (en propre) que la comptabilité exige ? */
  comptaComplete: boolean;
}

export interface ProgrammeDetail extends ProgrammeResume {
  categories: CategorieLot[];
  lots: LotProgramme[];
  /** Pilotage : valeur (au prix public) des lots libres, réservés et vendus. */
  valeurDisponible: number;
  valeurReservee: number;
  valeurVendue: number;
  /** Lots qui rapporteraient zéro à la comptabilité : ils ne peuvent pas être mis en vente. */
  lotsSansCompta: number;
}

export interface ProgrammePayload extends ConditionsLot {
  nom: string;
  region?: string;
  commune?: string;
  localisationDetail?: string;
  description?: string;
  proprietaireId?: string;
  statutJuridique: string;
  typeDocumentFoncier?: string;
  niveauVerification: string;
  prixLot?: number;
  produitDirect?: boolean;
  commissionLot?: number;
  margeLot?: number;
  /** Obligatoire pour changer la commission, la marge, le mode produit direct ou le propriétaire d'un programme qui a des lots. */
  justification?: string;
  publie?: boolean;
}

export interface CategoriePayload extends ConditionsLot {
  nom: string;
  prixPublic?: number;
  commission?: number;
  marge?: number;
}

export interface GenererLotsPayload {
  nombre: number;
  prefixe?: string;
  debut?: number;
  superficie?: number;
  categorieLotId?: string;
}

// --- Pilotage : tout ce qui tourne autour d'un programme (dates reçues en ISO) -------------

export interface LigneClientProgramme {
  dossierId: string;
  reference: string | null;
  statut: string;
  client: { id: string; nom: string; telephone: string | null };
  lot: { id: string; numero: string; nom: string } | null;
  commercial: string | null;
  prixVente: number | null;
  montantPaye: number;
  aValider: number;
  soldeRestant: number | null;
  tauxPaye: number | null;
  prochaineEcheance: { date: string; montant: number } | null;
  retard: { montant: number; jours: number; nombre: number } | null;
}

export interface VersementProgramme {
  id: string;
  dossierId: string;
  dossierReference: string | null;
  client: string;
  lot: string | null;
  montant: number;
  datePaiement: string;
  mode: string;
  statut: string;
  reference: string | null;
}

export interface EcheanceProgramme {
  dossierId: string;
  dossierReference: string | null;
  client: string;
  lot: string | null;
  numero: number;
  dateEcheance: string;
  reste: number;
  joursRetard: number;
}

export interface FinancesProgramme {
  dossiers: number;
  dossiersSoldes: number;
  totalAttendu: number;
  encaisse: number;
  aValider: number;
  resteAEncaisser: number;
  enRetard: number;
  echeancesEnRetard: number;
}

export interface CommissionProgramme {
  id: string;
  dossierId: string;
  client: string;
  lot: string | null;
  commercial: string;
  statut: string;
  montantEstime: number;
  montantValide: number | null;
  montantPaye: number | null;
}

/** La vue comptable du programme : mêmes formules que le journal et la situation des propriétaires. */
export interface ComptaProgramme {
  encaisseJournal: number;
  encaisseSurAnnules: number;
  revenuAcquis: number;
  revenuSurAnnules: number;
  partProprietaires: number;
  reverse: number;
  enCoursReversement: number;
  resteAReverser: number;
  dossiersSansBase: number;
}

export interface VentesProgramme {
  acces: boolean;
  /** Absente pour qui n'a pas accès aux finances. */
  compta: ComptaProgramme | null;
  /** « tous » : la direction voit tous les dossiers ; « les_votres » : un commercial ne voit que les siens. */
  perimetre: 'tous' | 'les_votres' | 'aucun';
  finances: FinancesProgramme | null;
  clients: LigneClientProgramme[];
  versements: VersementProgramme[];
  echeances: EcheanceProgramme[];
  commissions: CommissionProgramme[];
}

export interface VisiteProgramme {
  id: string;
  statut: string;
  dateConfirmee: string | null;
  dateProposee: string | null;
  heure: string | null;
  client: { id: string; nom: string; telephone: string | null };
  lot: { id: string; numero: string };
  accompagnateur: string | null;
  terrainPlait: string | null;
  prixAccepte: string | null;
  objectionPrincipale: string | null;
}

export interface MandatProgramme {
  id: string;
  reference: string;
  typeMandat: string;
  statut: string;
  exclusivite: boolean;
  dateDebut: string;
  dateFin: string;
  proprietaire: string;
  commercial: string | null;
  lotsDuProgramme: number;
}

export interface DocumentsProgramme {
  lots: {
    id: string;
    type: string;
    title: string | null;
    isPublic: boolean;
    createdAt: string;
    lotId: string;
    lot: string;
  }[];
  ventes: {
    id: string;
    type: string;
    title: string | null;
    isGenerated: boolean;
    createdAt: string;
    dossierId: string;
    dossierReference: string | null;
    client: string;
    lot: string | null;
  }[];
}

@Injectable({ providedIn: 'root' })
export class ProgrammesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/programmes`;

  findAll(archives = false): Observable<ProgrammeResume[]> {
    return this.http.get<ProgrammeResume[]>(this.baseUrl, archives ? { params: { archives: 'true' } } : {});
  }

  ventes(id: string): Observable<VentesProgramme> {
    return this.http.get<VentesProgramme>(`${this.baseUrl}/${id}/ventes`);
  }

  visites(id: string): Observable<{ acces: boolean; visites: VisiteProgramme[] }> {
    return this.http.get<{ acces: boolean; visites: VisiteProgramme[] }>(`${this.baseUrl}/${id}/visites`);
  }

  mandats(id: string): Observable<{ acces: boolean; mandats: MandatProgramme[] }> {
    return this.http.get<{ acces: boolean; mandats: MandatProgramme[] }>(`${this.baseUrl}/${id}/mandats`);
  }

  documents(id: string): Observable<DocumentsProgramme> {
    return this.http.get<DocumentsProgramme>(`${this.baseUrl}/${id}/documents`);
  }

  // --- Visuels du site public ---

  medias(id: string): Observable<MediaProgramme[]> {
    return this.http.get<MediaProgramme[]>(`${this.baseUrl}/${id}/medias`);
  }

  ajouterMedia(id: string, fichier: File, type: 'photo' | 'plan', titre?: string): Observable<unknown> {
    const form = new FormData();
    form.append('file', fichier);
    form.append('type', type);
    if (titre) form.append('title', titre);
    return this.http.post<unknown>(`${this.baseUrl}/${id}/medias`, form);
  }

  definirCouverture(id: string, mediaId: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/${id}/medias/${mediaId}/couverture`, {});
  }

  supprimerMedia(id: string, mediaId: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.baseUrl}/${id}/medias/${mediaId}`);
  }

  /** Recopie les conditions du programme (prix, paiement, propriétaire, commission ou marge) sur ses lots libres. */
  appliquerAuxLots(id: string): Observable<{ lotsMisAJour: number }> {
    return this.http.post<{ lotsMisAJour: number }>(`${this.baseUrl}/${id}/lots/appliquer`, {});
  }

  restaurer(id: string): Observable<ProgrammeResume> {
    return this.http.post<ProgrammeResume>(`${this.baseUrl}/${id}/restaurer`, {});
  }

  findOne(id: string): Observable<ProgrammeDetail> {
    return this.http.get<ProgrammeDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: ProgrammePayload): Observable<ProgrammeResume> {
    return this.http.post<ProgrammeResume>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<ProgrammePayload>): Observable<ProgrammeResume> {
    return this.http.patch<ProgrammeResume>(`${this.baseUrl}/${id}`, payload);
  }

  archiver(id: string): Observable<ProgrammeResume> {
    return this.http.post<ProgrammeResume>(`${this.baseUrl}/${id}/archiver`, {});
  }

  genererLots(
    id: string,
    payload: GenererLotsPayload,
  ): Observable<{ crees: number; premier: string; dernier: string }> {
    return this.http.post<{ crees: number; premier: string; dernier: string }>(
      `${this.baseUrl}/${id}/lots/generer`,
      payload,
    );
  }

  affecterLots(
    id: string,
    lotIds: string[],
    categorieLotId: string | null,
  ): Observable<{ lotsMisAJour: number; ignores: number }> {
    return this.http.post<{ lotsMisAJour: number; ignores: number }>(
      `${this.baseUrl}/${id}/lots/affecter`,
      { lotIds, categorieLotId },
    );
  }

  changerStatut(
    id: string,
    lotIds: string[],
    statut: 'Brouillon' | 'Disponible' | 'Suspendu',
  ): Observable<{ lotsMisAJour: number; ignores: number }> {
    return this.http.post<{ lotsMisAJour: number; ignores: number }>(
      `${this.baseUrl}/${id}/lots/statut`,
      { lotIds, statut },
    );
  }

  creerCategorie(id: string, payload: CategoriePayload): Observable<CategorieLot> {
    return this.http.post<CategorieLot>(`${this.baseUrl}/${id}/categories`, payload);
  }

  modifierCategorie(
    categorieId: string,
    payload: Partial<CategoriePayload>,
  ): Observable<CategorieLot> {
    return this.http.patch<CategorieLot>(`${this.baseUrl}/categories/${categorieId}`, payload);
  }

  appliquerCategorie(categorieId: string): Observable<{ lotsMisAJour: number }> {
    return this.http.post<{ lotsMisAJour: number }>(
      `${this.baseUrl}/categories/${categorieId}/appliquer`,
      {},
    );
  }

  supprimerCategorie(categorieId: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/categories/${categorieId}`);
  }
}
