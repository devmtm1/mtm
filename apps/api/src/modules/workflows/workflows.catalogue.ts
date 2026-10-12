import { CONSTRUCTION_DEFAULTS } from '../construction/construction-options.service';
import { CRM_DEFAULTS } from '../crm/crm-options.service';
import { VENTES_DEFAULTS } from '../ventes/ventes-workflow.service';

/**
 * Parcours que la direction peut faire évoluer sans toucher au code
 * (section 21 : « étapes configurables selon le module »).
 *
 * Règle de sécurité : les étapes d'origine ne se retirent jamais — des
 * calculs (solde, réception de chantier, signature de la vente) s'appuient
 * dessus. On peut en ajouter, les ordonner et, pour les ventes, autoriser des
 * passages supplémentaires.
 */
export interface DefinitionWorkflow {
  module: 'ventes' | 'crm' | 'construction';
  libelle: string;
  description: string;
  /** Paramètre qui porte la liste ordonnée des étapes. */
  statutsCle: string;
  statutsDefauts: readonly string[];
  /** Paramètre qui porte les passages autorisés (ventes seulement). */
  transitionsCle?: string;
  transitionsDefauts?: Record<string, string[]>;
  /** Route d'où l'on compte les dossiers par étape. */
  comptage: 'ventes' | 'crm' | 'construction';
}

export const WORKFLOWS: DefinitionWorkflow[] = [
  {
    module: 'ventes',
    libelle: 'Dossiers de vente',
    description:
      'De l’ouverture du dossier à son solde : réservation, paiements, clôture.',
    statutsCle: 'ventes.statuts',
    statutsDefauts: VENTES_DEFAULTS.statuts,
    transitionsCle: 'ventes.transitions',
    transitionsDefauts: VENTES_DEFAULTS.transitions,
    comptage: 'ventes',
  },
  {
    module: 'crm',
    libelle: 'Pipeline commercial',
    description:
      'Du premier contact à la vente : qualification, visite, négociation, réservation.',
    statutsCle: 'crm.pipelineStages',
    statutsDefauts: CRM_DEFAULTS.pipelineStages,
    comptage: 'crm',
  },
  {
    module: 'construction',
    libelle: 'Chantiers',
    description:
      'De la préparation du projet à la clôture : démarrage, suspension, réception.',
    statutsCle: 'construction.statuts',
    statutsDefauts: CONSTRUCTION_DEFAULTS.statuts,
    comptage: 'construction',
  },
];

/** Clés réservées à la page « Workflows » : on ne les modifie pas à la main dans Paramètres. */
export const CLES_WORKFLOW: string[] = WORKFLOWS.flatMap((workflow) => [
  workflow.statutsCle,
  ...(workflow.transitionsCle ? [workflow.transitionsCle] : []),
]);

export function workflowDe(module: string): DefinitionWorkflow | undefined {
  return WORKFLOWS.find((workflow) => workflow.module === module);
}
