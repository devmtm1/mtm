import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

/**
 * Référentiels du CRM (étapes du pipeline, types et statuts d'activité,
 * priorités, types de document), paramétrables en back-office (section 25
 * CDC) avec repli sur ces valeurs par défaut.
 */
export const CRM_DEFAULTS = {
  pipelineStages: [
    'nouveau_contact',
    'qualification',
    'proposition',
    'visite',
    'negociation',
    'reservation',
    'vente',
    'perdu',
  ],
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

@Injectable()
export class CrmOptionsService {
  constructor(private readonly settings: SettingsService) {}

  async getOptions() {
    const [pipelineStages, activiteTypes, activiteStats, priorites] =
      await Promise.all([
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
      ]);
    return { pipelineStages, activiteTypes, activiteStats, priorites };
  }

  assertPipelineStage(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'crm.pipelineStages',
      CRM_DEFAULTS.pipelineStages,
      statut,
      'Statut de pipeline invalide',
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
