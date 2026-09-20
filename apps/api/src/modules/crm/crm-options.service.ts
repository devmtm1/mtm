import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

/**
 * Référentiels du CRM commercial, alignés sur la fiche de suivi « client
 * potentiel » de MTM. Les listes qui évoluent avec le métier (étapes,
 * sources, niveaux d'intérêt, objections) sont paramétrables en back-office
 * (section 25 CDC) ; les autres sont figées car elles structurent des écrans.
 */
export const CRM_DEFAULTS = {
  /**
   * Parcours commercial : nouveau → contacté → qualifié → visite programmée →
   * visite effectuée → en réflexion → à relancer → négociation → réservation
   * → vente. Trois sorties distinctes en fin de liste.
   */
  pipelineStages: [
    'nouveau',
    'contacte',
    'qualifie',
    'visite_programmee',
    'visite_effectuee',
    'en_reflexion',
    'a_relancer',
    'negociation',
    'reservation',
    'vente',
    'refuse',
    'abandonne',
    'injoignable',
  ],
  sourcesAcquisition: [
    'facebook',
    'tiktok',
    'instagram',
    'whatsapp',
    'site',
    'recommandation',
    'autre',
  ],
  niveauxInteret: ['faible', 'moyen', 'fort', 'tres_interesse'],
  objections: [
    'prix',
    'emplacement',
    'distance',
    'environnement',
    'documents',
    'surface',
    'delais',
    'autre',
  ],
  moyensContact: ['appel', 'whatsapp', 'message', 'visite_agence', 'autre'],
  objectifsAchat: ['habitation', 'investissement', 'autre'],
  /** Mêmes libellés que le statut juridique d'un terrain, pour rapprocher les deux. */
  typesDocumentSouhaite: ['Titre foncier', 'Bail', 'Autre'],
  statutsVisite: ['proposee', 'programmee', 'effectuee', 'annulee'],
  motifsNonVisite: [
    'indisponible',
    'reportee',
    'annulee',
    'injoignable',
    'autre',
  ],
  appreciationsTerrain: [
    'oui_beaucoup',
    'oui_hesitation',
    'moyennement',
    'non',
  ],
  prixAccepte: ['oui', 'non', 'negociation_demandee'],
  activiteTypes: ['appel', 'rendez-vous', 'tache', 'relance', 'email', 'note'],
  activiteStats: ['a_faire', 'realise', 'reporte', 'annule'],
  priorites: ['basse', 'moyenne', 'haute'],
  documentTypes: [
    'contrat',
    'avenant',
    'preuve_signature',
    'correspondance',
    'justificatif',
    'autre',
  ],
} as const;

/** Étapes de fin de parcours : plus de relance attendue. */
export const PIPELINE_CLOSED_STAGES = [
  'vente',
  'refuse',
  'abandonne',
  'injoignable',
] as const;

/** Sorties négatives : un motif est exigé (règle de gestion § 17). */
export const PIPELINE_EXIT_STAGES = [
  'refuse',
  'abandonne',
  'injoignable',
] as const;

/** Étapes actives : un prospect qui s'y trouve doit avoir une prochaine action. */
export function isActiveStage(stage: string): boolean {
  return !PIPELINE_CLOSED_STAGES.includes(
    stage as (typeof PIPELINE_CLOSED_STAGES)[number],
  );
}

@Injectable()
export class CrmOptionsService {
  constructor(private readonly settings: SettingsService) {}

  async getOptions() {
    const [
      pipelineStages,
      activiteTypes,
      activiteStats,
      priorites,
      sourcesAcquisition,
      niveauxInteret,
      objections,
    ] = await Promise.all([
      this.settings.getStringList(
        'crm.pipelineStages',
        CRM_DEFAULTS.pipelineStages,
      ),
      this.settings.getStringList(
        'crm.activiteTypes',
        CRM_DEFAULTS.activiteTypes,
      ),
      this.settings.getStringList(
        'crm.activiteStats',
        CRM_DEFAULTS.activiteStats,
      ),
      this.settings.getStringList('crm.priorites', CRM_DEFAULTS.priorites),
      this.settings.getStringList(
        'crm.sourcesAcquisition',
        CRM_DEFAULTS.sourcesAcquisition,
      ),
      this.settings.getStringList(
        'crm.niveauxInteret',
        CRM_DEFAULTS.niveauxInteret,
      ),
      this.settings.getStringList('crm.objections', CRM_DEFAULTS.objections),
    ]);
    return {
      pipelineStages,
      activiteTypes,
      activiteStats,
      priorites,
      sourcesAcquisition,
      niveauxInteret,
      objections,
      closedStages: [...PIPELINE_CLOSED_STAGES],
      exitStages: [...PIPELINE_EXIT_STAGES],
      moyensContact: [...CRM_DEFAULTS.moyensContact],
      objectifsAchat: [...CRM_DEFAULTS.objectifsAchat],
      typesDocumentSouhaite: [...CRM_DEFAULTS.typesDocumentSouhaite],
      statutsVisite: [...CRM_DEFAULTS.statutsVisite],
      motifsNonVisite: [...CRM_DEFAULTS.motifsNonVisite],
      appreciationsTerrain: [...CRM_DEFAULTS.appreciationsTerrain],
      prixAccepte: [...CRM_DEFAULTS.prixAccepte],
    };
  }

  assertPipelineStage(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'crm.pipelineStages',
      CRM_DEFAULTS.pipelineStages,
      statut,
      'Statut de pipeline invalide',
    );
  }

  assertSource(source?: string): Promise<void> {
    return this.settings.assertInList(
      'crm.sourcesAcquisition',
      CRM_DEFAULTS.sourcesAcquisition,
      source,
      'Source de prospect invalide',
    );
  }

  assertNiveauInteret(niveau?: string): Promise<void> {
    return this.settings.assertInList(
      'crm.niveauxInteret',
      CRM_DEFAULTS.niveauxInteret,
      niveau,
      "Niveau d'intérêt invalide",
    );
  }

  assertObjection(objection?: string): Promise<void> {
    return this.settings.assertInList(
      'crm.objections',
      CRM_DEFAULTS.objections,
      objection,
      'Objection invalide',
    );
  }

  assertActiviteType(type: string): Promise<void> {
    return this.settings.assertInList(
      'crm.activiteTypes',
      CRM_DEFAULTS.activiteTypes,
      type,
      "Type d'activité invalide",
    );
  }

  assertActiviteStatut(statut: string): Promise<void> {
    return this.settings.assertInList(
      'crm.activiteStats',
      CRM_DEFAULTS.activiteStats,
      statut,
      "Statut d'activité invalide",
    );
  }

  assertPriorite(priorite: string): Promise<void> {
    return this.settings.assertInList(
      'crm.priorites',
      CRM_DEFAULTS.priorites,
      priorite,
      'Priorité invalide',
    );
  }

  assertDocumentType(type: string): Promise<void> {
    return this.settings.assertInList(
      'crm.documentTypes',
      CRM_DEFAULTS.documentTypes,
      type,
      'Type de document invalide',
    );
  }
}
