import type { LucideIcon } from '@lucide/angular';
import {
  LucideBedDouble,
  LucideBell,
  LucideBellRing,
  LucideBookOpen,
  LucideBuilding2,
  LucideCalendarDays,
  LucideChartColumn,
  LucideClipboardCheck,
  LucideContact,
  LucideDoorOpen,
  LucideFileClock,
  LucideFileText,
  LucideFolderOpen,
  LucideHardHat,
  LucideImages,
  LucideInbox,
  LucideKeyRound,
  LucideLandPlot,
  LucideLayoutDashboard,
  LucideListChecks,
  LucideLock,
  LucideMegaphone,
  LucideReceipt,
  LucideScrollText,
  LucideSettings,
  LucideSlidersHorizontal,
  LucideUserCog,
  LucideUserSearch,
  LucideUsers,
  LucideWallet,
  LucideWorkflow,
} from '@lucide/angular';

/**
 * Configuration centralisée de la navigation MTM Immobilier.
 *
 * Le menu est rangé par **ce que fait la personne** (aujourd'hui, ventes,
 * biens, gestion locative, services, pilotage…), et non par module technique.
 * Les entrées sont des liens directs sous une rubrique nommée : un clic de
 * moins qu'avec des groupes à déplier. Une rubrique rarement utilisée
 * (Administration, Site public) se replie.
 *
 * Ajouter une page = ajouter une entrée ici, sans toucher au layout :
 *
 *   {
 *     label: 'Terrains',
 *     route: '/terrains',
 *     icon: LucideLandPlot,
 *     permission: 'terrains:consulter',
 *   },
 *
 * Un groupe dépliable reste possible via `children` (entrées d'un même sujet
 * quand la rubrique n'est pas assez précise).
 */

/** Ce que le serveur sait compter pour la personne connectée (pastilles du menu). */
export type CompteurNavigation =
  | 'demandesWeb'
  | 'paiementsAValider'
  | 'relancesLocatives'
  | 'resiliations'
  | 'saisiesFinancieres'
  | 'tachesEnRetard';

/** Entrée terminale de navigation (lien direct). */
export interface NavLeaf {
  label: string;
  route: string;
  /**
   * Permission requise pour afficher l'entrée (convention `resource:action`,
   * alignée sur PermissionsGuard). Absente = visible par tous les connectés.
   */
  permission?: string;
  /**
   * Actif seulement sur cette route exacte. Nécessaire quand une autre entrée
   * vit sous la même racine (`/ventes` et `/ventes/objectifs`), sinon les deux
   * seraient surlignées ensemble.
   */
  exact?: boolean;
  /**
   * Adresse hors de l'application (le guide d'utilisation, servi tel quel) : le lien
   * s'ouvre dans un nouvel onglet au lieu de passer par le routeur.
   */
  href?: string;
  /** Pastille : le nombre de choses qui attendent la personne sur cette page. */
  compteur?: CompteurNavigation;
}

/** Enfant d'un groupe de navigation (sous-module). */
export type NavChild = NavLeaf;

/** Item de premier niveau : lien simple ou groupe dépliable. */
export interface NavItem extends NavLeaf {
  icon: LucideIcon;
  /** Groupe déplié à l'ouverture de l'application (les autres sont repliés). */
  defaultOpen?: boolean;
  children?: NavChild[];
}

/** Rubrique regroupant des items (titre affiché au-dessus du groupe). */
export interface NavSection {
  title: string;
  items: NavItem[];
  /** Le titre se clique pour replier la rubrique. */
  collapsible?: boolean;
  /** Repliée à la première visite (l'état choisi ensuite est retenu sur l'appareil). */
  defaultCollapsed?: boolean;
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  // Le tableau de bord ouvre le menu, seul et sans titre.
  {
    title: '',
    items: [{ label: 'Tableau de bord', route: '/dashboard', icon: LucideLayoutDashboard }],
  },
  {
    title: 'Espace de travail',
    collapsible: true,
    items: [
      { label: 'Tâches', route: '/taches', icon: LucideListChecks, permission: 'taches:consulter', compteur: 'tachesEnRetard' },
      { label: 'Agenda', route: '/agenda', icon: LucideCalendarDays, permission: 'agenda:consulter' },
      // GED : visible de tous les collaborateurs ; la recherche ne remonte que
      // les modules que chacun a le droit de consulter.
      { label: 'Documents', route: '/documents', icon: LucideFolderOpen },
    ],
  },
  {
    title: 'Commercial',
    collapsible: true,
    items: [
      // La boîte de réception du site nourrit les prospects : elle vit avec eux.
      { label: 'Demandes du site', route: '/contacts', icon: LucideInbox, permission: 'contact:consulter', compteur: 'demandesWeb' },
      { label: 'Prospects', route: '/crm/prospects', icon: LucideUserSearch, permission: 'crm:consulter' },
      {
        label: 'Dossiers de vente',
        route: '/ventes',
        icon: LucideReceipt,
        children: [
          { label: 'Tous les dossiers', route: '/ventes', permission: 'ventes:consulter', exact: true, compteur: 'paiementsAValider' },
          { label: 'Mes commissions', route: '/ventes/commissions', permission: 'ventes:consulter' },
          { label: 'Objectifs', route: '/ventes/objectifs', permission: 'ventes:consulter' },
        ],
      },
    ],
  },
  {
    title: 'Patrimoine immobilier',
    collapsible: true,
    items: [
      { label: 'Biens à vendre', route: '/terrains', icon: LucideLandPlot, permission: 'terrains:consulter' },
      { label: 'Mandats', route: '/mandats', icon: LucideScrollText, permission: 'mandats:consulter' },
      { label: 'Propriétaires', route: '/proprietaires', icon: LucideContact, permission: 'proprietaires:consulter' },
    ],
  },
  {
    title: 'Gestion locative',
    collapsible: true,
    items: [
      { label: 'Biens en gestion', route: '/locatif/biens', icon: LucideKeyRound, permission: 'locatif:consulter' },
      { label: 'Locataires', route: '/locatif/locataires', icon: LucideUsers, permission: 'locatif:consulter' },
      { label: 'Séjours à la nuit', route: '/locatif/sejours', icon: LucideBedDouble, permission: 'locatif:consulter' },
      { label: 'Résiliations', route: '/locatif/resiliations', icon: LucideDoorOpen, permission: 'locatif:consulter', compteur: 'resiliations' },
      { label: 'Relances d’impayés', route: '/locatif/relances', icon: LucideBellRing, permission: 'locatif:consulter', compteur: 'relancesLocatives' },
    ],
  },
  {
    title: 'Services',
    collapsible: true,
    items: [
      { label: 'Vérifications et démarches', route: '/demarches/missions', icon: LucideClipboardCheck, permission: 'demarches:consulter' },
      { label: 'Chantiers', route: '/construction/chantiers', icon: LucideHardHat, permission: 'construction:consulter' },
    ],
  },
  {
    title: 'Pilotage et finances',
    collapsible: true,
    items: [
      { label: 'Rapports', route: '/rapports', icon: LucideChartColumn, permission: 'rapports:consulter' },
      {
        label: 'Finances',
        route: '/finances',
        icon: LucideWallet,
        children: [
          { label: 'Tableau de bord financier', route: '/finances', permission: 'finances:consulter', exact: true },
          { label: 'Journal financier', route: '/finances/journal', permission: 'finances:consulter' },
          { label: 'Saisies financières', route: '/finances/operations', permission: 'finances:consulter', compteur: 'saisiesFinancieres' },
          { label: 'Trésorerie et caisse', route: '/finances/tresorerie', permission: 'finances:consulter' },
          { label: 'Rapprochement bancaire', route: '/finances/rapprochement', permission: 'finances:consulter' },
          { label: 'Propriétaires et reversements', route: '/finances/reversements', permission: 'finances:consulter' },
          { label: 'Désistements', route: '/finances/remboursements', permission: 'finances:consulter' },
          { label: 'Rentabilité des chantiers', route: '/finances/chantiers', permission: 'finances:consulter' },
          { label: 'États financiers', route: '/finances/etats', permission: 'finances:consulter' },
          { label: 'Rapport du soir', route: '/finances/rapport-quotidien', permission: 'finances:consulter' },
          { label: 'Clôtures mensuelles', route: '/finances/clotures', permission: 'finances:consulter' },
        ],
      },
    ],
  },
  {
    title: 'Site public',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { label: 'Contenus du site', route: '/content', icon: LucideFileText, permission: 'content:consulter', exact: true },
      { label: 'Réalisations & projets', route: '/content/showcase', icon: LucideImages, permission: 'content:consulter' },
      { label: 'Publicités du bandeau', route: '/content/promotions', icon: LucideMegaphone, permission: 'content:consulter' },
      { label: 'Équipe', route: '/content/equipe', icon: LucideUsers, permission: 'content:consulter' },
    ],
  },
  {
    title: 'Administration',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { label: 'Utilisateurs', route: '/users', icon: LucideUserCog, permission: 'users:consulter' },
      { label: 'Rôles & permissions', route: '/roles', icon: LucideLock, permission: 'roles:consulter' },
      { label: 'Paramètres', route: '/settings', icon: LucideSettings, permission: 'settings:consulter' },
      { label: 'Identité de l’entreprise', route: '/entreprise', icon: LucideBuilding2, permission: 'settings:consulter' },
      { label: 'Parcours des dossiers', route: '/workflows', icon: LucideWorkflow, permission: 'settings:consulter' },
      { label: 'Règles de notification', route: '/notifications/regles', icon: LucideBellRing, permission: 'notifications:administrer' },
      { label: 'Pilotage et rapports', route: '/pilotage/reglages', icon: LucideSlidersHorizontal, permission: 'rapports:administrer' },
      { label: 'Journal d’audit', route: '/audit', icon: LucideFileClock, permission: 'audit:consulter' },
    ],
  },
  {
    title: 'Mon compte',
    collapsible: true,
    items: [
      { label: 'Mes notifications', route: '/notifications', icon: LucideBell, exact: true },
      { label: 'Sécurité', route: '/security', icon: LucideLock },
      { label: 'Guide d’utilisation', route: '/manuel/', href: '/manuel/', icon: LucideBookOpen },
    ],
  },
];
