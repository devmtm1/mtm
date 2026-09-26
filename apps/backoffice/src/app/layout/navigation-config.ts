import type { LucideIcon } from '@lucide/angular';
import {
  LucideLayoutDashboard,
  LucideLock,
  LucideUsers,
  LucideShield,
  LucideSettings,
  LucideFileClock,
  LucideFileText,
  LucideHardHat,
  LucideInbox,
  LucideImages,
  LucideLandPlot,
  LucideScrollText,
  LucideUserSearch,
  LucideClipboardCheck,
  LucideReceipt,
  LucideIdCard,
  LucideTarget,
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
}

/** Enfant d'un groupe de navigation (sous-module). */
export type NavChild = NavLeaf;

/** Item de premier niveau : lien simple ou groupe dépliable. */
export interface NavItem extends NavLeaf {
  icon: LucideIcon;
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
      {
        label: 'Terrains',
        route: '/terrains',
        icon: LucideLandPlot,
        permission: 'terrains:consulter',
      },
      {
        label: 'Mandats',
        route: '/mandats',
        icon: LucideScrollText,
        permission: 'mandats:consulter',
      },
      {
        label: 'Propriétaires',
        route: '/proprietaires',
        icon: LucideIdCard,
        permission: 'proprietaires:consulter',
      },
      {
        label: 'Prospects',
        route: '/crm/prospects',
        icon: LucideUserSearch,
        permission: 'crm:consulter',
      },
      {
        label: 'Ventes',
        route: '/ventes',
        icon: LucideReceipt,
        permission: 'ventes:consulter',
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
      {
        label: 'Objectifs',
        route: '/ventes/objectifs',
        icon: LucideTarget,
        permission: 'ventes:consulter',
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
      },
      {
        label: 'Réalisations & projets',
        route: '/content/showcase',
        icon: LucideImages,
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
        label: 'Utilisateurs',
        route: '/users',
        icon: LucideUsers,
        permission: 'users:consulter',
      },
      {
        label: 'Rôles & permissions',
        route: '/roles',
        icon: LucideShield,
        permission: 'roles:consulter',
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