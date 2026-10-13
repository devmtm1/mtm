import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { AEncaisser, PointSerie, TotauxActivite, TotauxFinanciers } from './finances-api.service';

export interface SeriePoint {
  periode: string;
  valeur: number;
}

// ----------------------------------------------------------------- direction

export interface TableauDirection {
  periode: { du: string; auInclus: string };
  finances: {
    totaux: TotauxFinanciers;
    precedent: TotauxFinanciers;
    parActivite: TotauxActivite[];
    aEncaisser: AEncaisser;
  };
  ventes: {
    soldees: number;
    soldeesPrecedent: number;
    variation: number | null;
    chiffreAffaires: number;
    chiffreAffairesPrecedent: number;
    variationCa: number | null;
    enCours: number;
    reservationsActives: number;
    prospectsCrees: number;
    prospectsCreesPrecedent: number;
    tauxConversion: number | null;
    pipeline: Record<string, number>;
  };
  locatif: {
    biens: number;
    loues: number;
    tauxOccupation: number | null;
    loyersAttendus: number;
    loyersEncaisses: number;
    tauxRecouvrement: number | null;
    impayesProlonges: number;
    sejours: { nombre: number; nuits: number; montant: number };
  };
  demarches: {
    ouvertes: number;
    ouvertesPrecedent: number;
    variation: number | null;
    actives: number;
    rapportsRendus: number;
    parDecision: Record<string, number>;
  };
  construction: { actifs: number; enAlerte: number; avancementMoyen: number | null };
  performances: { rang: number; id: string; nom: string; ventes: number; ca: number }[];
  alertes: {
    dossiersBloques: number;
    mandatsExpirant30Jours: number;
    impayesProlonges: number;
    chantiersEnAlerte: number;
    commissionsAValider: number;
    operationsAValider: number;
  };
  tendances: {
    ventes: SeriePoint[];
    chiffreAffaires: SeriePoint[];
    finances: PointSerie[];
  };
}

// ------------------------------------------------------------------- manager

export interface ObjectifCible {
  cibleVentes: number | null;
  cibleChiffreAffaires: number | null;
  cibleCommissions: number | null;
}

export interface LigneEquipe {
  id: string;
  nom: string;
  prospectsActifs: number;
  relancesEnRetard: number;
  visitesEffectuees: number;
  ventesSoldees: number;
  chiffreAffaires: number;
  commissionsEstimees: number;
  tachesEnRetard: number;
  objectif: ObjectifCible | null;
  realise: { ventes: number; chiffreAffaires: number; commissions: number };
  taux: { ventes: number | null; chiffreAffaires: number | null; commissions: number | null };
}

export interface DossierBloque {
  id: string;
  type: string;
  libelle: string;
  detail: string;
  jours: number;
  responsable: string | null;
  lien: string;
}

export interface GroupeBloque {
  type: string;
  titre: string;
  seuilJours: number;
  total: number;
  dossiers: DossierBloque[];
}

export interface DossiersBloques {
  seuils: Record<string, number>;
  total: number;
  groupes: GroupeBloque[];
}

export interface TableauManager {
  periode: { du: string; auInclus: string; objectif: string };
  equipe: LigneEquipe[];
  objectifs: {
    avecObjectif: number;
    cibleVentes: number;
    realiseVentes: number;
    tauxVentes: number | null;
    cibleChiffreAffaires: number;
    realiseChiffreAffaires: number;
    tauxChiffreAffaires: number | null;
  };
  totaux: {
    prospectsActifs: number;
    relancesEnRetard: number;
    visitesEffectuees: number;
    ventesSoldees: number;
    chiffreAffaires: number;
    tachesEnRetard: number;
  };
  bloques: DossiersBloques;
}

// --------------------------------------------------------------- commercial

export interface TableauCommercial {
  commercial: { id: string; nom: string };
  pipeline: Record<string, number>;
  prospectsActifs: number;
  relances: {
    enRetard: number;
    aujourdhui: number;
    prochaines: {
      id: string;
      titre: string;
      type: string;
      echeance: string | null;
      enRetard: boolean;
      prospect: string;
      lien: string;
    }[];
  };
  visites: {
    effectueesCeMois: number;
    aVenir: { id: string; date: string | null; heure: string | null; bien: string; prospect: string; lien: string }[];
  };
  ventes: {
    parStatut: Record<string, number>;
    ouvertes: number;
    soldeesCeMois: number;
    chiffreAffairesCeMois: number;
  };
  objectif: {
    periode: string;
    cibles: ObjectifCible | null;
    realise: { ventes: number; chiffreAffaires: number; commissions: number };
    taux: { ventes: number | null; chiffreAffaires: number | null; commissions: number | null };
  };
  commissions: { estimees: number; aPayer: number; payeesCetteAnnee: number };
  taches: { ouvertes: number; enRetard: number; aujourdhui: number };
  agenda: { id: string; titre: string; type: string; debut: string; lieu: string | null; journeeEntiere: boolean }[];
}

// ------------------------------------------------------------------ rapports

export interface DefinitionRapport {
  code: string;
  titre: string;
  description: string;
  filtres: 'region'[];
  parPeriode: boolean;
}

export type TypeColonne = 'texte' | 'nombre' | 'montant' | 'pourcentage' | 'date';

export interface ColonneRapport {
  cle: string;
  libelle: string;
  type: TypeColonne;
}

export type Cellule = string | number | null;

export interface SectionRapport {
  titre: string;
  colonnes: ColonneRapport[];
  lignes: Record<string, Cellule>[];
  total?: Record<string, Cellule>;
  note?: string;
}

export interface RapportDonnees {
  code: string;
  titre: string;
  sousTitre: string;
  periode: { du: string; au: string } | null;
  resume: { libelle: string; valeur: string }[];
  sections: SectionRapport[];
}

export interface RapportQuery {
  du: string;
  au: string;
  region?: string;
}

export interface ExportRapportPayload extends RapportQuery {
  format: 'pdf' | 'xlsx';
  justification: string;
}

// ------------------------------------------------------------------ réglages

export type SeuilsBlocage = Record<'vente' | 'mission' | 'chantier' | 'prospect' | 'tache', number>;

export interface EnvoiAutomatique {
  actif: boolean;
  frequence: 'hebdomadaire' | 'mensuelle';
  rapports: string[];
  formats: ('pdf' | 'xlsx')[];
  destinataires: string[];
}

export interface ReglagesPilotage {
  seuils: SeuilsBlocage;
  envoi: EnvoiAutomatique;
  messagerieConfiguree: boolean;
  rapports: { code: string; titre: string }[];
  derniersEnvois: { date: string; du: string | null; au: string | null; rapports: string[]; destinataires: number }[];
}

export interface ResultatEssai {
  envoye: boolean;
  raison?: 'aucun_rapport' | 'mail_indisponible';
}

@Injectable({ providedIn: 'root' })
export class PilotageApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pilotage`;

  direction(du: string, au: string): Observable<TableauDirection> {
    return this.http.get<TableauDirection>(`${this.baseUrl}/direction`, {
      params: new HttpParams().set('du', du).set('au', au),
    });
  }

  manager(du: string, au: string): Observable<TableauManager> {
    return this.http.get<TableauManager>(`${this.baseUrl}/manager`, {
      params: new HttpParams().set('du', du).set('au', au),
    });
  }

  commercial(commercialId?: string): Observable<TableauCommercial> {
    let params = new HttpParams();
    if (commercialId) params = params.set('commercialId', commercialId);
    return this.http.get<TableauCommercial>(`${this.baseUrl}/commercial`, { params });
  }

  catalogue(): Observable<DefinitionRapport[]> {
    return this.http.get<DefinitionRapport[]>(`${this.baseUrl}/rapports`);
  }

  apercu(code: string, query: RapportQuery): Observable<RapportDonnees> {
    let params = new HttpParams().set('du', query.du).set('au', query.au);
    if (query.region) params = params.set('region', query.region);
    return this.http.get<RapportDonnees>(`${this.baseUrl}/rapports/${code}`, { params });
  }

  reglages(): Observable<ReglagesPilotage> {
    return this.http.get<ReglagesPilotage>(`${this.baseUrl}/reglages`);
  }

  enregistrerSeuils(seuils: SeuilsBlocage): Observable<ReglagesPilotage> {
    return this.http.put<ReglagesPilotage>(`${this.baseUrl}/reglages/seuils`, seuils);
  }

  enregistrerEnvoi(envoi: EnvoiAutomatique): Observable<ReglagesPilotage> {
    return this.http.put<ReglagesPilotage>(`${this.baseUrl}/reglages/envoi`, envoi);
  }

  essaiEnvoi(): Observable<ResultatEssai> {
    return this.http.post<ResultatEssai>(`${this.baseUrl}/reglages/envoi/test`, {});
  }

  exporter(code: string, payload: ExportRapportPayload): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/rapports/${code}/export`, payload, { responseType: 'blob' });
  }
}
