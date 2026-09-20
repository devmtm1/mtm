/**
 * Libellés métier de l'administration : rôles, modules, actions du journal
 * d'audit. Le back-office affiche « Responsable commercial », jamais
 * `responsable_commercial`, et « Création d'un dossier de vente », jamais
 * `vente.created`.
 */

export interface RoleInfo {
  label: string;
  help: string;
}

/** Rôles initiaux (section 24 du CDC). Un rôle inconnu garde son nom technique. */
export const ROLE_INFO: Record<string, RoleInfo> = {
  administrateur: { label: 'Administrateur', help: 'Accès complet : comptes, rôles, paramètres et journal. Double authentification obligatoire.' },
  direction: { label: 'Direction', help: 'Vue complète sur l’activité et les montants ; valide, publie et arbitre. Double authentification obligatoire.' },
  manager: { label: 'Manager', help: 'Second niveau d’encadrement : objectifs, validation des commissions estimées par le responsable, dossiers bloqués, vue de toute l’équipe.' },
  responsable_commercial: { label: 'Responsable commercial', help: 'Chef d’équipe terrain : vérifie et publie les fiches, active les mandats, affecte les prospects, valide les paiements, estime les commissions.' },
  commercial: { label: 'Commercial', help: 'Gère ses prospects, ses dossiers de vente, les fiches terrains et mandats qu’il prépare (en brouillon).' },
  comptable: { label: 'Comptable', help: 'Contrôle des encaissements : valide les paiements, paie les commissions validées, exporte. Double authentification obligatoire.' },
  responsable_gestion_locative: { label: 'Responsable gestion locative', help: 'Service gestion locative (module Phase 2) ; consulte les terrains.' },
  responsable_demarches: { label: 'Responsable démarches', help: 'Service démarches administratives (module Phase 2) ; consulte les terrains.' },
  responsable_construction: { label: 'Responsable construction', help: 'Service construction (module Phase 2) ; consulte les terrains.' },
  rh: { label: 'Ressources humaines', help: 'Gestion du personnel (module Phase 2). Double authentification obligatoire.' },
  client: { label: 'Client', help: 'Compte de l’espace client du site : suit ses dossiers, paiements et documents. Pas d’accès au back-office.' },
};

/**
 * Rôles dont le module n'existe pas encore (phase 2) : un compte créé avec
 * l'un d'eux n'aurait qu'un écran presque vide. On ne les attribue pas.
 */
export const PHASE2_ROLES = new Set(['responsable_gestion_locative', 'responsable_demarches', 'responsable_construction', 'rh']);

/** Rôles pour lesquels la double authentification est imposée (voir two-factor.guard). */
export const SENSITIVE_ROLES = new Set(['administrateur', 'direction', 'comptable', 'rh']);

export function roleLabel(name: string): string {
  return ROLE_INFO[name]?.label ?? name.replace(/_/g, ' ');
}

export function roleHelp(name: string): string {
  return ROLE_INFO[name]?.help ?? '';
}

export function requiresTwoFactor(roles: string[]): boolean {
  return roles.some((role) => SENSITIVE_ROLES.has(role));
}

/** Modules (ressource technique → nom affiché). */
export const RESOURCE_LABELS: Record<string, string> = {
  users: 'Utilisateurs',
  roles: 'Rôles & permissions',
  settings: 'Paramètres',
  audit: 'Journal d’audit',
  terrains: 'Terrains',
  proprietaires: 'Propriétaires',
  mandats: 'Mandats',
  crm: 'Prospects (CRM)',
  ventes: 'Ventes, réservations, paiements',
  clients: 'Espace client',
  contact: 'Demandes web',
  content: 'Contenus du site',
};

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

/** Signification de chaque action de permission (section 24 CDC). */
export const ACTION_INFO: Record<string, { label: string; help: string }> = {
  consulter: { label: 'Consulter', help: 'Voir les fiches et les listes du module.' },
  consulter_financier: { label: 'Voir le financier', help: 'Voir les montants sensibles (prix d’acquisition, marges, commissions).' },
  creer: { label: 'Créer', help: 'Ajouter de nouveaux éléments.' },
  modifier: { label: 'Modifier', help: 'Mettre à jour les éléments existants.' },
  valider: { label: 'Valider', help: 'Approuver une étape (paiement reçu, statut de dossier).' },
  supprimer: { label: 'Supprimer', help: 'Retirer un élément — action tracée dans le journal.' },
  exporter: { label: 'Exporter', help: 'Télécharger des données (CSV, journaux) avec justification.' },
  payer: { label: 'Payer', help: 'Marquer une commission validée comme payée au commercial (comptabilité).' },
  publier: { label: 'Publier', help: 'Rendre visible sur le site public ou dans l’espace client.' },
  administrer: { label: 'Administrer', help: 'Vue complète du module (tous les dossiers, tous les commerciaux) et actes de management : objectifs, estimation des commissions. Leur validation reste au manager ou à la direction.' },
};

export function permissionActionLabel(action: string): string {
  return ACTION_INFO[action]?.label ?? action.replace(/_/g, ' ');
}

export function permissionActionHelp(action: string): string {
  return ACTION_INFO[action]?.help ?? '';
}

/** Entités journalisées par l'API. */
export const ENTITY_LABELS: Record<string, string> = {
  User: 'Utilisateur',
  Role: 'Rôle',
  SystemSetting: 'Paramètre',
  AuditLog: 'Journal d’audit',
  Terrain: 'Terrain',
  TerrainMedia: 'Photo / vidéo de terrain',
  TerrainDocument: 'Document de terrain',
  Proprietaire: 'Propriétaire',
  Mandat: 'Mandat',
  MandatLot: 'Lot de mandat',
  MandatDocument: 'Document de mandat',
  Prospect: 'Prospect',
  ActiviteCrm: 'Action CRM',
  DocumentCrm: 'Document CRM',
  DossierVente: 'Dossier de vente',
  Reservation: 'Réservation',
  ReservationRequest: 'Demande de réservation web',
  Paiement: 'Paiement',
  CommissionVente: 'Commission',
  DocumentVente: 'Document de vente',
  ObjectifCommercial: 'Objectif commercial',
  Contact: 'Demande web',
  ContentBlock: 'Contenu du site',
  ShowcaseItem: 'Réalisation / projet',
};

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

/** Actions tracées par l'API (module.objet.verbe → phrase). */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.login.success': 'Connexion réussie',
  'auth.login.failed': 'Connexion refusée (mot de passe incorrect)',
  'auth.login.rejected_inactive': 'Connexion refusée (compte désactivé)',
  'auth.login.rejected_locked': 'Connexion refusée (compte verrouillé)',
  'auth.login.rejected_invalid_2fa': 'Connexion refusée (code 2FA invalide)',
  'auth.login.used_recovery_code': 'Connexion avec un code de secours',
  'auth.account.locked': 'Compte verrouillé après plusieurs échecs',
  'auth.2fa.enabled': 'Double authentification activée',
  'auth.2fa.disabled': 'Double authentification désactivée',
  'auth.password.changed': 'Mot de passe changé',
  'auth.password_reset.requested': 'Réinitialisation de mot de passe demandée',
  'auth.password_reset.completed': 'Mot de passe réinitialisé',
  'user.created': 'Création d’un utilisateur',
  'user.updated': 'Modification d’un utilisateur',
  'user.deleted': 'Suppression d’un utilisateur',
  'user.activated': 'Activation d’un compte',
  'user.deactivated': 'Désactivation d’un compte',
  'user.role_assigned': 'Attribution d’un rôle',
  'user.role_removed': 'Retrait d’un rôle',
  'user.2fa_reset': 'Réinitialisation du 2FA d’un compte',
  'role.created': 'Création d’un rôle',
  'role.updated': 'Modification d’un rôle',
  'role.deleted': 'Suppression d’un rôle',
  'role.permissions_assigned': 'Permissions ajoutées à un rôle',
  'role.permission_removed': 'Permission retirée d’un rôle',
  'setting.created': 'Création d’un paramètre',
  'setting.updated': 'Modification d’un paramètre',
  'setting.deleted': 'Suppression d’un paramètre',
  'audit.exported': 'Export du journal d’audit',
  'terrain.created': 'Création d’une fiche terrain',
  'terrain.updated': 'Modification d’une fiche terrain',
  'terrain.statutJuridique.updated': 'Changement du statut juridique d’un terrain',
  'terrain.niveauVerification.updated': 'Changement du niveau de vérification d’un terrain',
  'terrain.statutCommercial.updated': 'Changement de la commercialisation d’un terrain',
  'terrain.media.created': 'Ajout d’une photo ou vidéo de terrain',
  'terrain.media.deleted': 'Suppression d’une photo ou vidéo de terrain',
  'terrain.document.created': 'Ajout d’un document de terrain',
  'terrain.document.deleted': 'Suppression d’un document de terrain',
  'proprietaire.created': 'Création d’un propriétaire',
  'proprietaire.updated': 'Modification d’un propriétaire',
  'proprietaire.deleted': 'Suppression d’un propriétaire',
  'mandat.created': 'Création d’un mandat',
  'mandat.updated': 'Modification d’un mandat',
  'mandat.deleted': 'Suppression d’un mandat',
  'mandat.echeance_imminente': 'Alerte : mandat proche de l’échéance',
  'mandat.lot.created': 'Terrain ajouté à un mandat',
  'mandat.lot.updated': 'Lot de mandat modifié',
  'mandat.lot.deleted': 'Terrain retiré d’un mandat',
  'mandat.document.created': 'Ajout d’un document de mandat',
  'mandat.document.deleted': 'Suppression d’un document de mandat',
  'prospect.created': 'Création d’un prospect',
  'prospect.updated': 'Modification d’un prospect',
  'prospect.deleted': 'Suppression d’un prospect',
  'prospect.pipeline.transition': 'Changement d’étape d’un prospect',
  'prospect.commercial.assigned': 'Affectation d’un prospect à un commercial',
  'prospect.activite.created': 'Action CRM planifiée',
  'prospect.activite.updated': 'Action CRM modifiée',
  'prospect.activite.deleted': 'Action CRM supprimée',
  'prospect.document.created': 'Ajout d’un document CRM',
  'prospect.document.deleted': 'Suppression d’un document CRM',
  'contact.created': 'Demande reçue depuis le site',
  'contact.read': 'Demande web marquée comme lue',
  'contact.converted': 'Demande web convertie en prospect',
  'contact.converted_to_prospect': 'Demande web convertie en prospect',
  'vente.created': 'Création d’un dossier de vente',
  'vente.updated': 'Modification d’un dossier de vente',
  'vente.status.updated': 'Changement de statut d’un dossier de vente',
  'vente.exported': 'Export des ventes',
  'vente.reservation.created': 'Réservation d’un terrain',
  'vente.reservation.expired': 'Réservation expirée',
  'vente.reservation.expiry_skipped': 'Expiration de réservation ignorée',
  'vente.reservation_request.converted': 'Demande de réservation web convertie',
  'vente.paiement.created': 'Paiement enregistré',
  'vente.paiement.validated': 'Paiement validé',
  'vente.commission.created': 'Commission calculée',
  'vente.commission.validated': 'Commission validée',
  'vente.commission.paid': 'Commission payée',
  'vente.document.created': 'Ajout d’un document de vente',
  'vente.document.generated': 'Document de vente généré',
  'vente.document.deleted': 'Suppression d’un document de vente',
  'vente.objectif.created': 'Objectif commercial fixé',
  'vente.objectif.deleted': 'Objectif commercial supprimé',
  'content.created': 'Contenu du site créé',
  'content.updated': 'Contenu du site modifié',
  'content.deleted': 'Contenu du site supprimé',
  'showcase.created': 'Réalisation / projet créé',
  'showcase.updated': 'Réalisation / projet modifié',
  'showcase.image.updated': 'Photo de réalisation / projet changée',
  'showcase.deleted': 'Réalisation / projet supprimé',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

/** Famille d'une action (préfixe) pour filtrer le journal. */
export const AUDIT_FAMILIES: { value: string; label: string }[] = [
  { value: 'auth.', label: 'Connexions & sécurité' },
  { value: 'user.', label: 'Utilisateurs' },
  { value: 'role.', label: 'Rôles & permissions' },
  { value: 'setting.', label: 'Paramètres' },
  { value: 'terrain.', label: 'Terrains' },
  { value: 'proprietaire.', label: 'Propriétaires' },
  { value: 'mandat.', label: 'Mandats' },
  { value: 'prospect.', label: 'Prospects (CRM)' },
  { value: 'contact.', label: 'Demandes web' },
  { value: 'vente.', label: 'Ventes & paiements' },
  { value: 'content.', label: 'Contenus du site' },
  { value: 'showcase.', label: 'Réalisations & projets' },
  { value: 'audit.', label: 'Exports du journal' },
];

/** Date relative courte : « il y a 3 j », « à l’instant ». */
export function relativeDate(value: string | null | undefined): string {
  if (!value) return 'Jamais';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `Il y a ${days} j`;
  return new Date(value).toLocaleDateString('fr-FR');
}

/** Champs les plus fréquents dans les anciennes / nouvelles valeurs du journal. */
export const FIELD_LABELS: Record<string, string> = {
  email: 'E-mail',
  firstName: 'Prénom',
  lastName: 'Nom',
  isActive: 'Actif',
  roleId: 'Rôle',
  roles: 'Rôles',
  statut: 'Statut',
  statutJuridique: 'Statut juridique',
  statutCommercial: 'Commercialisation',
  niveauVerification: 'Vérification',
  statutLot: 'Statut du lot',
  statutPipeline: 'Étape du pipeline',
  statutPaiement: 'Statut du paiement',
  modePaiement: 'Mode de paiement',
  montant: 'Montant',
  prixPublic: 'Prix public',
  prixAcquisition: 'Prix d’acquisition',
  prixVente: 'Prix de vente',
  commission: 'Commission',
  tauxCommission: 'Taux de commission',
  dateDebut: 'Date de début',
  dateFin: 'Date de fin',
  dateEcheance: 'Échéance',
  datePaiement: 'Date du paiement',
  commercialResponsableId: 'Commercial responsable',
  commercialId: 'Commercial',
  terrainId: 'Terrain',
  prospectId: 'Prospect',
  proprietaireId: 'Propriétaire',
  mandatId: 'Mandat',
  dossierVenteId: 'Dossier de vente',
  terrain: 'Terrain',
  prospect: 'Prospect',
  client: 'Client',
  commercial: 'Commercial',
  mandat: 'Mandat',
  proprietaire: 'Propriétaire',
  dossier: 'Dossier',
  key: 'Clé',
  value: 'Valeur',
  description: 'Description',
  content: 'Contenu',
  title: 'Titre',
  titre: 'Titre',
  nom: 'Nom',
  telephone: 'Téléphone',
  notes: 'Notes',
  justification: 'Justification',
  isSensitive: 'Sensible',
  misEnAvant: 'Mis en avant',
  isPublic: 'Public',
  ordre: 'Ordre',
  type: 'Type',
  typeMandat: 'Type de mandat',
  referenceInterne: 'Référence',
  superficie: 'Superficie',
  region: 'Région',
  commune: 'Commune',
  priorite: 'Priorité',
  score: 'Score',
  sourceAcquisition: 'Source',
  budgetMin: 'Budget minimum',
  budgetMax: 'Budget maximum',
};

export function fieldLabel(path: string): string {
  const parts = path.split('.');
  return parts.map((part) => FIELD_LABELS[part] ?? part).join(' › ');
}
