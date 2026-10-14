export const TYPES_EVENEMENT = [
  'visite',
  'rendez_vous',
  'appel',
  'verification',
  'echeance',
  'reunion',
  'autre',
] as const;
export const STATUTS_EVENEMENT = ['prevu', 'realise', 'annule'] as const;
export const VISIBILITES_EVENEMENT = ['equipe', 'prive'] as const;

export const PERMISSION_ADMIN_AGENDA = 'agenda:administrer';

/** Fenêtre maximale d’une lecture de l’agenda : un trimestre ne tient pas dans une réponse. */
export const FENETRE_MAX_JOURS = 62;
