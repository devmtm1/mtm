import type { LucideIcon } from '@lucide/angular';
import {
  LucideLayoutDashboard,
  LucideLock,
  LucideUsers,
  LucideShield,
  LucideSettings,
  LucideFileClock,
  LucideFileText,
  LucideLandPlot,
  LucideScrollText,
  LucideUserSearch,
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
        label: 'Prospects',
        route: '/crm/prospects',
        icon: LucideUserSearch,
        permission: 'crm:consulter',
      },
    ],
  },
  {
    title: 'Contenu',
    items: [
      {
        label: 'Demandes web',
        route: '/contacts',
        icon: LucideFileText,
        permission: 'settings:consulter',
      },
      {
        label: 'Contenus du site',
        route: '/content',
        icon: LucideFileText,
        permission: 'settings:consulter',
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