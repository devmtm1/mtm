/**
 * Catalogue des événements qui déclenchent une notification (section 22 du
 * cahier des charges). La clé est le `type` de la notification : c'est elle qui
 * relie un envoi à sa règle, réglable sans toucher au code (section 25).
 */
export interface EvenementNotification {
  cle: string;
  libelle: string;
  description: string;
  /** Qui est prévenu : les titulaires d'une permission, ou une personne précise (responsable, assigné, participant, client). */
  destinataire: 'permission' | 'personne' | 'client';
  /** Permission des destinataires par défaut (événements « permission »). */
  permission?: string;
  emailParDefaut: boolean;
  /** Famille affichée dans l'écran de réglage. */
  famille: string;
}

export const EVENEMENTS_NOTIFICATION: EvenementNotification[] = [
  {
    cle: 'nouveau_prospect',
    famille: 'Commercial',
    libelle: 'Nouveau prospect',
    description: 'Un prospect est créé ou une demande du site est convertie.',
    destinataire: 'permission',
    permission: 'crm:administrer',
    emailParDefaut: false,
  },
  {
    cle: 'nouveau_contact',
    famille: 'Commercial',
    libelle: 'Nouveau message du site',
    description: 'Un visiteur remplit le formulaire de contact.',
    destinataire: 'permission',
    permission: 'contact:modifier',
    emailParDefaut: false,
  },
  {
    cle: 'nouveau_dossier_vente',
    famille: 'Commercial',
    libelle: 'Nouveau dossier de vente',
    description: 'Un dossier de vente est ouvert.',
    destinataire: 'permission',
    permission: 'ventes:valider',
    emailParDefaut: false,
  },
  {
    cle: 'paiement_a_valider',
    famille: 'Commercial',
    libelle: 'Paiement reçu à valider',
    description: 'Un paiement de vente est enregistré et attend sa validation.',
    destinataire: 'permission',
    permission: 'ventes:valider',
    emailParDefaut: false,
  },
  {
    cle: 'reservation_expiree',
    famille: 'Commercial',
    libelle: 'Réservation expirée',
    description: 'Une réservation arrive au bout de sa durée de blocage.',
    destinataire: 'permission',
    permission: 'ventes:valider',
    emailParDefaut: false,
  },
  {
    cle: 'document_manquant',
    famille: 'Commercial',
    libelle: 'Document manquant',
    description:
      'Un dossier de vente réservé n’a toujours pas de contrat après le délai réglé.',
    destinataire: 'permission',
    permission: 'ventes:valider',
    emailParDefaut: false,
  },
  {
    cle: 'mandat_echeance',
    famille: 'Mandats',
    libelle: 'Mandat proche de l’échéance',
    description: 'Un mandat arrive à échéance dans le délai d’alerte.',
    destinataire: 'permission',
    permission: 'mandats:administrer',
    emailParDefaut: true,
  },
  {
    cle: 'loyer_relances',
    famille: 'Gestion locative',
    libelle: 'Impayés de loyer à relancer',
    description: 'Des loyers impayés atteignent le seuil de relance.',
    destinataire: 'permission',
    permission: 'locatif:valider',
    emailParDefaut: true,
  },
  {
    cle: 'demande_location',
    famille: 'Gestion locative',
    libelle: 'Demande sur une annonce de location',
    description: 'Un visiteur demande une visite ou des informations.',
    destinataire: 'permission',
    permission: 'locatif:modifier',
    emailParDefaut: false,
  },
  {
    cle: 'demande_gestion',
    famille: 'Gestion locative',
    libelle: 'Bien proposé à la gestion',
    description: 'Un propriétaire propose un bien depuis la page Gestion locative du site.',
    destinataire: 'permission',
    permission: 'locatif:modifier',
    emailParDefaut: false,
  },
  {
    cle: 'sejour_demande',
    famille: 'Gestion locative',
    libelle: 'Demande de séjour',
    description: 'Un client demande un séjour de courte durée.',
    destinataire: 'permission',
    permission: 'locatif:modifier',
    emailParDefaut: false,
  },
  {
    cle: 'resiliation_demande',
    famille: 'Gestion locative',
    libelle: 'Demande de résiliation',
    description: 'Un locataire demande la résiliation de son bail.',
    destinataire: 'permission',
    permission: 'locatif:modifier',
    emailParDefaut: false,
  },
  {
    cle: 'nouvelle_mission',
    famille: 'Démarches',
    libelle: 'Nouvelle mission',
    description: 'Une mission de vérification ou de démarche est ouverte.',
    destinataire: 'permission',
    permission: 'demarches:valider',
    emailParDefaut: false,
  },
  {
    cle: 'nouveau_chantier',
    famille: 'Construction',
    libelle: 'Nouveau chantier',
    description: 'Un projet de construction est créé.',
    destinataire: 'permission',
    permission: 'construction:administrer',
    emailParDefaut: false,
  },
  {
    cle: 'chantier_alerte',
    famille: 'Construction',
    libelle: 'Chantier en retard ou hors budget',
    description: 'Un chantier bascule en retard ou en dépassement de budget.',
    destinataire: 'permission',
    permission: 'construction:administrer',
    emailParDefaut: true,
  },
  {
    cle: 'tache_assignee',
    famille: 'Tâches et agenda',
    libelle: 'Tâche assignée',
    description: 'Une tâche vous est confiée.',
    destinataire: 'personne',
    emailParDefaut: false,
  },
  {
    cle: 'tache_en_retard',
    famille: 'Tâches et agenda',
    libelle: 'Tâche en retard',
    description:
      'Une tâche dépasse sa date limite : prévient le responsable et celui qui l’a confiée.',
    destinataire: 'personne',
    emailParDefaut: true,
  },
  {
    cle: 'tache_echeance',
    famille: 'Tâches et agenda',
    libelle: 'Tâche à rendre bientôt',
    description: 'Une tâche arrive à échéance dans les 24 heures.',
    destinataire: 'personne',
    emailParDefaut: false,
  },
  {
    cle: 'rappel_evenement',
    famille: 'Tâches et agenda',
    libelle: 'Rappel de rendez-vous',
    description: 'Un événement de l’agenda commence bientôt.',
    destinataire: 'personne',
    emailParDefaut: false,
  },
  {
    cle: 'evenement_invitation',
    famille: 'Tâches et agenda',
    libelle: 'Invitation à un événement',
    description: 'Vous êtes ajouté comme participant à un événement.',
    destinataire: 'personne',
    emailParDefaut: false,
  },
  {
    cle: 'activite_crm_retard',
    famille: 'Commercial',
    libelle: 'Relance CRM en retard',
    description:
      'Une relance, un appel ou un rendez-vous d’un prospect dépasse sa date.',
    destinataire: 'personne',
    emailParDefaut: false,
  },
  {
    cle: 'operation_a_valider',
    famille: 'Finances',
    libelle: 'Opération financière à valider',
    description: 'Une recette ou une dépense saisie attend sa validation.',
    destinataire: 'permission',
    permission: 'finances:valider',
    emailParDefaut: false,
  },
  {
    cle: 'operation_rejetee',
    famille: 'Finances',
    libelle: 'Opération financière rejetée',
    description:
      'Une opération que vous avez saisie est rejetée, avec le motif.',
    destinataire: 'personne',
    emailParDefaut: false,
  },
  {
    cle: 'message_dossier',
    famille: 'Messages',
    libelle: 'Nouveau message sur un dossier',
    description:
      'Un collègue ou le client écrit dans le fil d’un dossier que vous suivez.',
    destinataire: 'personne',
    emailParDefaut: false,
  },
  {
    cle: 'message_mtm',
    famille: 'Messages',
    libelle: 'Réponse de MTM au client',
    description: 'MTM écrit au client dans le fil de son dossier.',
    destinataire: 'client',
    emailParDefaut: true,
  },
];

export const CLE_REGLES_NOTIFICATION = 'notifications.regles';

/** Réglage d'un événement : tout est facultatif, l'absence signifie « comportement par défaut ». */
export interface RegleNotification {
  actif?: boolean;
  /** Remplace la permission des destinataires par défaut. */
  permission?: string;
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
}

export type ReglesNotification = Record<string, RegleNotification>;

export function evenementDe(cle: string): EvenementNotification | undefined {
  return EVENEMENTS_NOTIFICATION.find((evenement) => evenement.cle === cle);
}
