import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { TableauFinancier } from './finances-api.service';
import type { PersonneRef } from './taches-api.service';

// ============================================================
// Trésorerie et contrôle financier (cahier des charges du DG)
// ============================================================

export type TypeCompte = 'caisse' | 'banque' | 'wave' | 'orange_money' | 'autre';

export interface CompteSolde {
  id: string;
  code: string;
  nom: string;
  type: TypeCompte;
  modes: string[];
  actif: boolean;
  soldeInitial: number;
  dateSoldeInitial: string;
  entrees: number;
  sorties: number;
  solde: number;
}

export interface Soldes {
  au: string;
  comptes: CompteSolde[];
  consolide: { solde: number; caisse: number; banques: number; mobile: number };
  sansCompte: { entrees: number; sorties: number; solde: number };
}

export interface ComptePayload {
  code: string;
  nom: string;
  type: TypeCompte;
  modes: string[];
  soldeInitial?: number;
  dateSoldeInitial?: string;
}

export type TypeMouvement = 'transfert' | 'remise_fonds' | 'avance' | 'remboursement';

export interface CompteRef {
  id: string;
  code: string;
  nom: string;
  type: string;
}

export interface MouvementFonds {
  id: string;
  numero: string;
  type: TypeMouvement;
  montant: number;
  date: string;
  origine: string | null;
  motif: string;
  remetNom: string | null;
  recoitNom: string | null;
  remet: PersonneRef | null;
  recoit: PersonneRef | null;
  reference: string | null;
  statut: 'en_attente' | 'confirme' | 'rejete';
  motifRejet: string | null;
  compteSource: CompteRef | null;
  compteDestination: CompteRef | null;
  createdById: string;
  createdBy: PersonneRef;
  confirmePar: PersonneRef | null;
  justificatifUrl: string | null;
}

export interface MouvementPayload {
  type: TypeMouvement;
  compteSourceId?: string;
  compteDestinationId?: string;
  montant: number;
  date: string;
  motif: string;
  origine?: string;
  remetNom?: string;
  recoitNom?: string;
  reference?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClotureCaisse {
  id: string;
  date: string;
  compte: CompteRef;
  soldeInitial: number;
  encaissements: number;
  decaissements: number;
  soldeTheorique: number;
  montantCompte: number;
  ecart: number;
  explication: string | null;
  decision: 'aucune' | 'en_attente' | 'acceptee' | 'a_corriger';
  decisionMotif: string | null;
  decisionPar: PersonneRef | null;
  parUser: PersonneRef;
  justificatifUrl: string | null;
}

export interface JourNonCloture {
  compteId: string;
  compte: string;
  date: string;
}

export interface SituationDossier {
  dossierVenteId: string;
  reference: string | null;
  statutDossier: string;
  client: string | null;
  terrain: { id: string; nom: string; referenceInterne: string } | null;
  proprietaire: { id: string; nom: string };
  mode: string;
  prixVente: number;
  commission: number;
  du: number;
  encaisse: number;
  commissionAcquise: number;
  partProprietaire: number;
  exigible: number;
  reverse: number;
  enCours: number;
  soldeRestant: number;
  disponibleSansAvance: number;
  disponibleAvecAvance: number;
  solde: boolean;
}

export interface SituationProprietaires {
  dossiers: SituationDossier[];
  parProprietaire: {
    proprietaireId: string;
    proprietaire: string;
    dossiers: number;
    encaisse: number;
    commissionAcquise: number;
    du: number;
    reverse: number;
    aReverserMaintenant: number;
    soldeRestant: number;
    enCours: number;
  }[];
  totaux: {
    encaisse: number;
    commissionAcquise: number;
    du: number;
    reverse: number;
    aReverserMaintenant: number;
    soldeRestant: number;
    enCours: number;
  };
}

export type StatutReversement = 'en_attente' | 'autorise' | 'paye' | 'rejete';

export interface Reversement {
  id: string;
  numero: string;
  montant: number;
  type: 'normal' | 'avance';
  motif: string;
  statut: StatutReversement;
  modePaiement: string | null;
  reference: string | null;
  datePaiement: string | null;
  motifRejet: string | null;
  motifAutorisation: string | null;
  proprietaire: PersonneRef;
  dossierVente: { id: string; referenceInterne: string | null; terrain: { id: string; nom: string } | null };
  createdById: string;
  createdBy: PersonneRef;
  autorisePar: PersonneRef | null;
  payePar: PersonneRef | null;
  justificatifUrl: string | null;
  createdAt: string;
}

export type StatutRemboursement = 'demandee' | 'acceptee' | 'refusee' | 'payee';

export interface Remboursement {
  id: string;
  numero: string;
  dateDemande: string;
  montantVerse: number;
  retenuePct: number;
  montantRetenu: number;
  montantRembourse: number;
  delaiMois: number;
  dateLimite: string;
  regleValidee: boolean;
  versionProtocole: string | null;
  motif: string | null;
  statut: StatutRemboursement;
  decisionMotif: string | null;
  decisionPar: PersonneRef | null;
  modePaiement: string | null;
  reference: string | null;
  datePaiement: string | null;
  enRetard: boolean;
  justificatifUrl: string | null;
  dossierVente: {
    id: string;
    referenceInterne: string | null;
    prospect: { nom: string | null; prenom: string | null } | null;
    terrain: { id: string; nom: string } | null;
  };
  createdBy: PersonneRef;
}

export interface SimulationRemboursement {
  dossierVenteId: string;
  reference: string | null;
  montantVerse: number;
  avance: number;
  retenuePct: number;
  montantRetenu: number;
  montantRembourse: number;
  delaiMois: number;
  dateLimite: string;
  regleValidee: boolean;
  versionProtocole: string | null;
}

export interface EcheanceChantier {
  id: string;
  ordre: number;
  libelle: string;
  dateEcheance: string | null;
  montantPrevu: number;
  montantPaye: number;
  reste: number;
  statut: 'payee' | 'partielle' | 'a_payer';
}

export interface PaiementChantier {
  id: string;
  numero: string;
  montant: number;
  date: string;
  mode: string;
  reference: string | null;
  notes: string | null;
  statut: 'en_attente' | 'valide' | 'rejete';
  motifRejet: string | null;
  recordedById: string;
  recordedBy: PersonneRef;
  validatedBy: PersonneRef | null;
  echeance: { id: string; ordre: number; libelle: string } | null;
  projet: { id: string; referenceInterne: string; intitule: string };
  justificatifUrl: string | null;
}

export interface CalculChantier {
  prixTotal: number;
  budgetPrevu: number;
  recettesConfirmees: number;
  coutReel: number;
  achatsClient: number;
  margePrevisionnelle: number;
  margeReelle: number;
  resteAEngager: number;
  coutFinalEstime: number;
  resultatEstime: number;
  resteACollecter: number;
  depassementBudget: boolean;
}

export interface FicheChantier extends CalculChantier {
  projet: {
    id: string;
    referenceInterne: string;
    intitule: string;
    statut: string;
    avancement: number;
    client: string | null;
  };
  recettesEnAttente: number;
  depensesEnAttente: number;
  depensesParPoste: { poste: string; montant: number }[];
  echeances: EcheanceChantier[];
  paiements: PaiementChantier[];
}

export interface RentabiliteChantier extends CalculChantier {
  id: string;
  referenceInterne: string;
  intitule: string;
  statut: string;
  avancement: number;
  client: string | null;
}

export interface TableauDirection extends TableauFinancier {
  tresorerie: Soldes;
  proprietaires: SituationProprietaires['totaux'] & {
    parProprietaire: SituationProprietaires['parProprietaire'];
  };
  reversements: {
    enAttente: { nombre: number; montant: number };
    aPayer: { nombre: number; montant: number };
  };
  chantiers: {
    nombre: number;
    recettes: number;
    cout: number;
    marge: number;
    enDepassement: number;
    liste: RentabiliteChantier[];
  };
  depensesSansJustificatif: { nombre: number; montant: number };
  aAutoriser: number;
  mouvementsEnAttente: number;
  paiementsChantierEnAttente: number;
  ecartsCaisse: {
    nombre: number;
    montant: number;
    liste: { id: string; date: string; compte: string; ecart: number; decision: string; par: string | null }[];
  };
  joursNonClotures: JourNonCloture[];
  remboursements: { enCours: number; enRetard: number; montant: number };
  anomaliesAudit: {
    nombre: number;
    liste: { id: string; action: string; date: string; par: string | null; justification: string | null }[];
  };
  rapportDuJour: string | null;
  rapprochement: { lignesNonRapprochees: number; plusAncienne: string | null };
}

export interface LigneReleve {
  id: string;
  date: string;
  libelle: string;
  reference: string | null;
  /** Positif : entrée sur le compte ; négatif : sortie. */
  montant: number;
  statut: 'non_rapproche' | 'rapproche' | 'ignore';
  mouvementId: string | null;
  mouvementLibelle: string | null;
  motifIgnore: string | null;
  rapprochePar: PersonneRef | null;
  rapprocheLe: string | null;
  suggestions: {
    id: string;
    numero: string;
    libelle: string;
    date: string;
    referenceCommune: boolean;
    ecartJours: number;
  }[];
}

export interface MouvementNonRapproche {
  id: string;
  date: string;
  numero: string;
  libelle: string;
  tiers: string | null;
  reference: string | null;
  montant: number;
}

export interface EtatRapprochement {
  compte: { id: string; nom: string; type: string; code: string };
  periode: { du: string; au: string };
  lignes: LigneReleve[];
  mouvementsNonRapproches: MouvementNonRapproche[];
  resume: {
    lignes: number;
    rapprochees: number;
    ignorees: number;
    nonRapprochees: number;
    montantNonRapproche: number;
    mouvementsNonRapproches: number;
    montantMouvementsNonRapproches: number;
  };
}

export interface ResultatImportReleve {
  compte: string;
  lues: number;
  importees: number;
  dejaImportees: number;
  erreurs: { ligne: number; message: string }[];
}

export interface EtatCatalogue {
  code: string;
  titre: string;
  description: string;
  parPeriode: boolean;
}

export interface EtatColonne {
  cle: string;
  libelle: string;
  type: 'texte' | 'montant' | 'date' | 'nombre';
}

export interface Etat {
  code: string;
  titre: string;
  description: string;
  colonnes: EtatColonne[];
  lignes: Record<string, string | number | null>[];
  totaux: Record<string, string | number | null> | null;
}

export interface ContenuRapportQuotidien {
  date: string;
  aucuneOperation: boolean;
  caisses: {
    compte: string;
    type: string;
    soldeInitial: number;
    encaissements: number;
    decaissements: number;
    soldeTheorique: number;
    cloture: boolean;
    montantCompte: number | null;
    ecart: number | null;
    explication: string | null;
    decision: string | null;
  }[];
  encaissementsParMode: { mode: string; montant: number; nombre: number }[];
  depenses: {
    numero: string | null;
    libelle: string;
    tiers: string | null;
    montant: number;
    mode: string | null;
    autorisation: string;
    justifie: boolean;
  }[];
  ventes: { libelle: string; tiers: string | null; montant: number; mode: string | null; reference: string | null }[];
  reversements: {
    payes: { libelle: string; tiers: string | null; montant: number; mode: string | null; reference: string | null }[];
    soldeDu: number;
    aPayer: number;
    enAttenteAutorisation: number;
  };
  chantiers: {
    recettes: { libelle: string; tiers: string | null; montant: number }[];
    depenses: { libelle: string; tiers: string | null; montant: number }[];
  };
  creances: { loyers: number; ventes: number; missions: number; echeancesEnRetard: number };
  justificatifsManquants: { numero: string | null; libelle: string; montant: number }[];
  enAttente: {
    operations: number;
    paiementsVente: number;
    mouvementsFonds: number;
    reversements: number;
    paiementsChantier: number;
  };
  anomalies: string[];
}

export interface RapportQuotidien {
  id: string | null;
  date: string;
  statut: 'apercu' | 'brouillon' | 'verifie' | 'transmis';
  enregistre: boolean;
  preparePar: string | null;
  verifiePar: string | null;
  verifieLe: string | null;
  transmisLe: string | null;
  contenu: ContenuRapportQuotidien;
}

export interface RapportQuotidienResume {
  id: string;
  date: string;
  statut: string;
  preparePar: string;
  transmisLe: string | null;
  aucuneOperation: boolean;
}

export interface RegleDesistement {
  retenuePct: number;
  delaiMois: number;
  validee: boolean;
  version: string | null;
}

export interface PouvoirAutorisation {
  /** Le droit « autoriser » : aucun plafond. */
  complet: boolean;
  /** Plafond (FCFA) donné par délégation, 0 sans délégation. */
  plafondDelegation: number;
}

/** L'utilisateur peut-il autoriser cette somme ? Le serveur contrôle toujours : ceci ne sert qu'à l'affichage. */
export function peutAutoriserMontant(pouvoir: PouvoirAutorisation | null, montant: number): boolean {
  if (!pouvoir) return false;
  return pouvoir.complet || (pouvoir.plafondDelegation > 0 && pouvoir.plafondDelegation >= montant);
}

type Requete = Record<string, string | number | boolean | undefined>;

@Injectable({ providedIn: 'root' })
export class TresorerieApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/finances`;

  private params(query: Requete): HttpParams {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(query)) {
      if (valeur !== undefined && valeur !== '') params = params.set(cle, String(valeur));
    }
    return params;
  }

  private televerser<T>(chemin: string, file: File): Observable<T> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<T>(`${this.baseUrl}/${chemin}`, body);
  }

  monPouvoir(): Observable<PouvoirAutorisation> {
    return this.http.get<PouvoirAutorisation>(`${this.baseUrl}/mon-pouvoir`);
  }

  // --- tableau de bord de la Direction ---
  direction(query: { du: string; au: string; activite?: string; mode?: string }): Observable<TableauDirection> {
    return this.http.get<TableauDirection>(`${this.baseUrl}/direction`, { params: this.params(query) });
  }

  // --- comptes et soldes ---
  soldes(au?: string): Observable<Soldes> {
    return this.http.get<Soldes>(`${this.baseUrl}/soldes`, { params: this.params({ au }) });
  }
  creerCompte(payload: ComptePayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/comptes`, payload);
  }
  modifierCompte(id: string, payload: { nom?: string; modes?: string[]; actif?: boolean }): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/comptes/${id}`, payload);
  }

  // --- remises de fonds, avances, remboursements, transferts ---
  mouvements(query: { type?: string; statut?: string; compteId?: string; page?: number; pageSize?: number }): Observable<Page<MouvementFonds>> {
    return this.http.get<Page<MouvementFonds>>(`${this.baseUrl}/mouvements-fonds`, { params: this.params(query) });
  }
  creerMouvement(payload: MouvementPayload): Observable<MouvementFonds> {
    return this.http.post<MouvementFonds>(`${this.baseUrl}/mouvements-fonds`, payload);
  }
  confirmerMouvement(id: string): Observable<MouvementFonds> {
    return this.http.post<MouvementFonds>(`${this.baseUrl}/mouvements-fonds/${id}/confirmer`, {});
  }
  rejeterMouvement(id: string, motif: string): Observable<MouvementFonds> {
    return this.http.post<MouvementFonds>(`${this.baseUrl}/mouvements-fonds/${id}/rejeter`, { motif });
  }
  joindreMouvement(id: string, file: File): Observable<MouvementFonds> {
    return this.televerser(`mouvements-fonds/${id}/justificatif`, file);
  }
  supprimerMouvement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/mouvements-fonds/${id}`);
  }

  // --- clôture quotidienne de la caisse ---
  cloturesCaisse(query: { compteId?: string; decision?: string; page?: number; pageSize?: number }): Observable<Page<ClotureCaisse>> {
    return this.http.get<Page<ClotureCaisse>>(`${this.baseUrl}/clotures-caisse`, { params: this.params(query) });
  }
  joursNonClotures(): Observable<JourNonCloture[]> {
    return this.http.get<JourNonCloture[]>(`${this.baseUrl}/clotures-caisse/manquantes`);
  }
  cloturerCaisse(payload: { compteId: string; date: string; montantCompte: number; explication?: string }): Observable<ClotureCaisse> {
    return this.http.post<ClotureCaisse>(`${this.baseUrl}/clotures-caisse`, payload);
  }
  deciderEcart(id: string, decision: 'acceptee' | 'a_corriger', motif: string): Observable<ClotureCaisse> {
    return this.http.post<ClotureCaisse>(`${this.baseUrl}/clotures-caisse/${id}/decision`, { decision, motif });
  }
  joindreCloture(id: string, file: File): Observable<ClotureCaisse> {
    return this.televerser(`clotures-caisse/${id}/justificatif`, file);
  }

  // --- reversements aux propriétaires ---
  situations(query: { proprietaireId?: string; dossierVenteId?: string } = {}): Observable<SituationProprietaires> {
    return this.http.get<SituationProprietaires>(`${this.baseUrl}/proprietaires/situation`, { params: this.params(query) });
  }
  reversements(query: { statut?: string; proprietaireId?: string; page?: number; pageSize?: number }): Observable<Page<Reversement>> {
    return this.http.get<Page<Reversement>>(`${this.baseUrl}/reversements`, { params: this.params(query) });
  }
  creerReversement(payload: { dossierVenteId: string; montant: number; type?: 'normal' | 'avance'; motif: string }): Observable<Reversement> {
    return this.http.post<Reversement>(`${this.baseUrl}/reversements`, payload);
  }
  autoriserReversement(id: string, motif?: string): Observable<Reversement> {
    return this.http.post<Reversement>(`${this.baseUrl}/reversements/${id}/autoriser`, { motif });
  }
  rejeterReversement(id: string, motif: string): Observable<Reversement> {
    return this.http.post<Reversement>(`${this.baseUrl}/reversements/${id}/rejeter`, { motif });
  }
  payerReversement(id: string, payload: { modePaiement: string; reference: string; datePaiement: string }): Observable<Reversement> {
    return this.http.post<Reversement>(`${this.baseUrl}/reversements/${id}/payer`, payload);
  }
  joindreReversement(id: string, file: File): Observable<Reversement> {
    return this.televerser(`reversements/${id}/justificatif`, file);
  }

  // --- désistements ---
  remboursements(query: { statut?: string; page?: number; pageSize?: number }): Observable<Page<Remboursement>> {
    return this.http.get<Page<Remboursement>>(`${this.baseUrl}/remboursements`, { params: this.params(query) });
  }
  reglesDesistement(): Observable<RegleDesistement> {
    return this.http.get<RegleDesistement>(`${this.baseUrl}/remboursements/regles`);
  }
  simulerRemboursement(dossierVenteId: string, avance?: number): Observable<SimulationRemboursement> {
    return this.http.get<SimulationRemboursement>(`${this.baseUrl}/remboursements/simulation/${dossierVenteId}`, {
      params: this.params({ avance }),
    });
  }
  creerRemboursement(payload: {
    dossierVenteId: string;
    dateDemande: string;
    avance?: number;
    motif?: string;
    versionProtocole?: string;
  }): Observable<Remboursement> {
    return this.http.post<Remboursement>(`${this.baseUrl}/remboursements`, payload);
  }
  deciderRemboursement(id: string, decision: 'acceptee' | 'refusee', motif: string): Observable<Remboursement> {
    return this.http.post<Remboursement>(`${this.baseUrl}/remboursements/${id}/decision`, { decision, motif });
  }
  payerRemboursement(id: string, payload: { modePaiement: string; reference: string; datePaiement: string }): Observable<Remboursement> {
    return this.http.post<Remboursement>(`${this.baseUrl}/remboursements/${id}/payer`, payload);
  }
  joindreRemboursement(id: string, file: File): Observable<Remboursement> {
    return this.televerser(`remboursements/${id}/justificatif`, file);
  }

  // --- chantiers ---
  rentabilite(): Observable<RentabiliteChantier[]> {
    return this.http.get<RentabiliteChantier[]>(`${this.baseUrl}/chantiers/rentabilite`);
  }
  fiche(projetId: string): Observable<FicheChantier> {
    return this.http.get<FicheChantier>(`${this.baseUrl}/chantiers/${projetId}`);
  }
  paiementsChantier(query: { statut?: string; page?: number; pageSize?: number }): Observable<Page<PaiementChantier>> {
    return this.http.get<Page<PaiementChantier>>(`${this.baseUrl}/chantiers/paiements`, { params: this.params(query) });
  }
  definirEcheances(
    projetId: string,
    echeances: { libelle: string; dateEcheance?: string; montantPrevu: number }[],
  ): Observable<FicheChantier> {
    return this.http.put<FicheChantier>(`${this.baseUrl}/chantiers/${projetId}/echeances`, { echeances });
  }
  enregistrerPaiementChantier(
    projetId: string,
    payload: { echeanceId?: string; montant: number; date: string; mode: string; reference?: string; notes?: string },
  ): Observable<PaiementChantier> {
    return this.http.post<PaiementChantier>(`${this.baseUrl}/chantiers/${projetId}/paiements`, payload);
  }
  validerPaiementChantier(id: string): Observable<PaiementChantier> {
    return this.http.post<PaiementChantier>(`${this.baseUrl}/chantiers/paiements/${id}/valider`, {});
  }
  rejeterPaiementChantier(id: string, motif: string): Observable<PaiementChantier> {
    return this.http.post<PaiementChantier>(`${this.baseUrl}/chantiers/paiements/${id}/rejeter`, { motif });
  }
  joindrePaiementChantier(id: string, file: File): Observable<PaiementChantier> {
    return this.televerser(`chantiers/paiements/${id}/justificatif`, file);
  }

  // --- états à la demande ---
  etats(): Observable<EtatCatalogue[]> {
    return this.http.get<EtatCatalogue[]>(`${this.baseUrl}/etats`);
  }
  etat(code: string, query: { du?: string; au?: string; compteId?: string }): Observable<Etat> {
    return this.http.get<Etat>(`${this.baseUrl}/etats/${code}`, { params: this.params(query) });
  }
  etatCsv(code: string, query: { du?: string; au?: string; compteId?: string }): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/etats/${code}`, {
      params: this.params({ ...query, csv: true }),
      responseType: 'blob',
    });
  }

  // --- rapprochement bancaire ---
  etatRapprochement(compteId: string, du?: string, au?: string): Observable<EtatRapprochement> {
    return this.http.get<EtatRapprochement>(`${this.baseUrl}/rapprochement/${compteId}`, {
      params: this.params({ du, au }),
    });
  }
  importerReleve(compteId: string, file: File): Observable<ResultatImportReleve> {
    return this.televerser(`rapprochement/${compteId}/import`, file);
  }
  rapprocherAutomatiquement(compteId: string, du?: string, au?: string): Observable<{ rapprochees: number; restantes: number }> {
    return this.http.post<{ rapprochees: number; restantes: number }>(`${this.baseUrl}/rapprochement/${compteId}/auto`, { du, au });
  }
  rapprocherLigne(ligneId: string, mouvementId: string): Observable<LigneReleve> {
    return this.http.post<LigneReleve>(`${this.baseUrl}/rapprochement/lignes/${ligneId}/rapprocher`, { mouvementId });
  }
  ignorerLigne(ligneId: string, motif: string): Observable<LigneReleve> {
    return this.http.post<LigneReleve>(`${this.baseUrl}/rapprochement/lignes/${ligneId}/ignorer`, { motif });
  }
  annulerLigne(ligneId: string): Observable<LigneReleve> {
    return this.http.post<LigneReleve>(`${this.baseUrl}/rapprochement/lignes/${ligneId}/annuler`, {});
  }

  // --- rapport financier quotidien ---
  rapportQuotidien(date: string): Observable<RapportQuotidien> {
    return this.http.get<RapportQuotidien>(`${this.baseUrl}/rapport-quotidien`, { params: this.params({ date }) });
  }
  historiqueRapports(): Observable<RapportQuotidienResume[]> {
    return this.http.get<RapportQuotidienResume[]>(`${this.baseUrl}/rapport-quotidien/historique`);
  }
  preparerRapport(date: string): Observable<RapportQuotidien> {
    return this.http.post<RapportQuotidien>(`${this.baseUrl}/rapport-quotidien/preparer`, { date });
  }
  verifierRapport(date: string): Observable<RapportQuotidien> {
    return this.http.post<RapportQuotidien>(`${this.baseUrl}/rapport-quotidien/verifier`, { date });
  }
  transmettreRapport(date: string): Observable<RapportQuotidien> {
    return this.http.post<RapportQuotidien>(`${this.baseUrl}/rapport-quotidien/transmettre`, { date });
  }
  rapportPdf(date: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/rapport-quotidien/pdf`, {
      params: this.params({ date }),
      responseType: 'blob',
    });
  }
}
