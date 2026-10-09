import type { LucideIcon } from '@lucide/angular';
import {
  LucideLayoutDashboard,
  LucideLock,
  LucideUsers,
  LucideSettings,
  LucideFileClock,
  LucideFileText,
  LucideFolderOpen,
  LucideHardHat,
  LucideInbox,
  LucideImages,
  LucideLandPlot,
  LucideUserSearch,
  LucideClipboardCheck,
  LucideBuilding2,
} from '@lucide/angular';

/**
 * Configuration centralisée de la navigation MTM Immobilier.
 *
 * Ajouter un futur module (Terrains, Mandats, CRM, Gestion locative...)
 * = ajouter une entrée ici, sans toucher au layout :
 *
 *   {
 *     label: 'Terrains',
 *     route: '/terrains',
 *     icon: LucideLandPlot,
 *     permission: 'terrains:consulter',
 *   },
 *
 * Les sous-modules (Liste / Création / Détails / Paramètres) se déclarent
 * via `children` : le parent devient alors un groupe dépliable.
 */

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

/** Section regroupant des items (titre affiché au-dessus du groupe). */
export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Principal',
    items: [
      {
        label: 'Tableau de bord',
        route: '/dashboard',
        icon: LucideLayoutDashboard,
      },
      // Un groupe n'a pas de permission propre : il s'affiche dès qu'un de ses
      // enfants est autorisé, et `route` pointe vers le premier enfant.
      {
        label: 'Immobilier',
        route: '/terrains',
        icon: LucideLandPlot,
        defaultOpen: true,
        children: [
          { label: 'Biens', route: '/terrains', permission: 'terrains:consulter' },
          { label: 'Mandats', route: '/mandats', permission: 'mandats:consulter' },
          { label: 'Propriétaires', route: '/proprietaires', permission: 'proprietaires:consulter' },
        ],
      },
      {
        label: 'Commercial',
        route: '/crm/prospects',
        icon: LucideUserSearch,
        children: [
          { label: 'Prospects', route: '/crm/prospects', permission: 'crm:consulter' },
          { label: 'Ventes', route: '/ventes', permission: 'ventes:consulter', exact: true },
          { label: 'Objectifs', route: '/ventes/objectifs', permission: 'ventes:consulter' },
        ],
      },
      {
        label: 'Vérifications',
        route: '/demarches/missions',
        icon: LucideClipboardCheck,
        permission: 'demarches:consulter',
      },
      {
        label: 'Gestion locative',
        route: '/locatif/biens',
        icon: LucideBuilding2,
        permission: 'locatif:consulter',
        children: [
          { label: 'Biens', route: '/locatif/biens', permission: 'locatif:consulter' },
          { label: 'Locataires', route: '/locatif/locataires', permission: 'locatif:consulter' },
          { label: 'Relances', route: '/locatif/relances', permission: 'locatif:consulter' },
        ],
      },
      {
        label: 'Chantiers',
        route: '/construction/chantiers',
        icon: LucideHardHat,
        permission: 'construction:consulter',
      },
      // GED : visible de tous les collaborateurs ; la recherche ne remonte que
      // les modules que chacun a le droit de consulter.
      {
        label: 'Documents',
        route: '/documents',
        icon: LucideFolderOpen,
      },
    ],
  },
  {
    title: 'Contenu',
    items: [
      {
        label: 'Demandes web',
        route: '/contacts',
        icon: LucideInbox,
        permission: 'contact:consulter',
      },
      {
        label: 'Contenus du site',
        route: '/content',
        icon: LucideFileText,
        permission: 'content:consulter',
        exact: true,
      },
      {
        label: 'Réalisations & projets',
        route: '/content/showcase',
        icon: LucideImages,
        permission: 'content:consulter',
      },
      {
        label: 'Équipe',
        route: '/content/equipe',
        icon: LucideUsers,
        permission: 'content:consulter',
      },
    ],
  },
  
  {
    title: 'Administration',
    items: [
      {
        label: 'Sécurité',
        route: '/security',
        icon: LucideLock,
      },
      {
        label: 'Accès',
        route: '/users',
        icon: LucideUsers,
        children: [
          { label: 'Utilisateurs', route: '/users', permission: 'users:consulter' },
          { label: 'Rôles & permissions', route: '/roles', permission: 'roles:consulter' },
        ],
      },
      {
        label: 'Paramètres',
        route: '/settings',
        icon: LucideSettings,
        permission: 'settings:consulter',
      },
      {
        label: "Journal d'audit",
        route: '/audit',
        icon: LucideFileClock,
        permission: 'audit:consulter',
      },
    ],
  },
];