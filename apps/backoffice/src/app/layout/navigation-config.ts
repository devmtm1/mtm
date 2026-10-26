import type { LucideIcon } from '@lucide/angular';
import {
  LucideCalendarDays,
  LucideChartColumn,
  LucideChartLine,
  LucideClipboardCheck,
  LucideContact,
  LucideFolderOpen,
  LucideGlobe,
  LucideHardHat,
  LucideInbox,
  LucideKeyRound,
  LucideLandmark,
  LucideLandPlot,
  LucideLayoutDashboard,
  LucideListChecks,
  LucideReceipt,
  LucideScrollText,
  LucideSettings,
  LucideUserCog,
  LucideUserSearch,
  LucideWallet,
} from '@lucide/angular';

/**
 * Configuration centralisée de la navigation MTM Immobilier.
 *
 * Le menu est rangé par **ce que fait la personne** (mon travail, commercial,
 * biens, location, finances…), et non par module technique. Il tient en
 * une vingtaine de lignes : un sujet qui compte plusieurs pages (les dossiers
 * de vente, la gestion locative, la comptabilité, les réglages…) n'occupe
 * qu'**une seule ligne** du menu ; ses pages s'affichent en **onglets** en haut
 * de l'écran, sous l'en-tête (voir `layout/sous-navigation`).
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
 * Un sujet à plusieurs pages se déclare avec `children` : une ligne dans le
 * menu (qui ouvre la première page autorisée), des onglets dans la page.
 */

/** Ce que le serveur sait compter pour la personne connectée (pastilles du menu). */
export type CompteurNavigation =
  | 'demandesWeb'
  | 'paiementsAValider'
  | 'relancesLocatives'
  | 'resiliations'
  | 'saisiesFinancieres'
  | 'tachesEnRetard';

/** Entrée terminale de navigation (lien direct, ou onglet d'un sujet). */
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

/** Page d'un sujet, affichée en onglet. */
export type NavChild = NavLeaf;

/** Item de premier niveau : lien simple, ou sujet à plusieurs pages (`children`). */
export interface NavItem extends NavLeaf {
  icon: LucideIcon;
  /** Pages du sujet : une ligne dans le menu, des onglets dans l'écran. */
  children?: NavChild[];
  /**
   * Adresses qui appartiennent au sujet sans être un onglet (la fiche d'un
   * dossier sous `/ventes/:id`) : le sujet reste surligné dans le menu.
   */
  racines?: string[];
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
    title: 'Mon travail',
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
    items: [
      // La boîte de réception du site nourrit les prospects : elle vit avec eux.
      { label: 'Demandes du site', route: '/contacts', icon: LucideInbox, permission: 'contact:consulter', compteur: 'demandesWeb' },
      { label: 'Prospects', route: '/crm/prospects', icon: LucideUserSearch, permission: 'crm:consulter' },
      {
        label: 'Dossiers de vente',
        route: '/ventes',
        icon: LucideReceipt,
        racines: ['/ventes'],
        children: [
          { label: 'Tous les dossiers', route: '/ventes', permission: 'ventes:consulter', exact: true, compteur: 'paiementsAValider' },
          { label: 'Mes commissions', route: '/ventes/commissions', permission: 'ventes:consulter' },
          { label: 'Objectifs commerciaux', route: '/ventes/objectifs', permission: 'ventes:consulter' },
        ],
      },
    ],
  },
  {
    title: 'Biens',
    items: [
      { label: 'Biens à vendre', route: '/terrains', icon: LucideLandPlot, permission: 'terrains:consulter' },
      { label: 'Mandats', route: '/mandats', icon: LucideScrollText, permission: 'mandats:consulter' },
      { label: 'Propriétaires', route: '/proprietaires', icon: LucideContact, permission: 'proprietaires:consulter' },
    ],
  },
  {
    title: 'Location et services',
    items: [
      {
        label: 'Gestion locative',
        route: '/locatif/biens',
        icon: LucideKeyRound,
        racines: ['/locatif'],
        children: [
          { label: 'Biens en gestion', route: '/locatif/biens', permission: 'locatif:consulter' },
          { label: 'Propriétés', route: '/locatif/immeubles', permission: 'locatif:consulter' },
          { label: 'Locataires', route: '/locatif/locataires', permission: 'locatif:consulter' },
          { label: 'Séjours à la nuit', route: '/locatif/sejours', permission: 'locatif:consulter' },
          { label: 'Résiliations', route: '/locatif/resiliations', permission: 'locatif:consulter', compteur: 'resiliations' },
          { label: 'Relances d’impayés', route: '/locatif/relances', permission: 'locatif:consulter', compteur: 'relancesLocatives' },
        ],
      },
      { label: 'Vérifications et démarches', route: '/demarches/missions', icon: LucideClipboardCheck, permission: 'demarches:consulter' },
      { label: 'Chantiers', route: '/construction/chantiers', icon: LucideHardHat, permission: 'construction:consulter' },
    ],
  },
  {
    title: 'Pilotage et finances',
    items: [
      { label: 'Rapports', route: '/rapports', icon: LucideChartColumn, permission: 'rapports:consulter' },
      // Qui visite le site et quels biens intéressent le public : sert à relancer ou repositionner un bien.
      { label: 'Fréquentation du site', route: '/statistiques', icon: LucideChartLine, permission: 'statistiques:consulter' },
      // L'argent du quotidien : ce qui entre, ce qui sort, ce qu'il y a en caisse.
      {
        label: 'Finances',
        route: '/finances',
        icon: LucideWallet,
        children: [
          { label: 'Tableau de bord financier', route: '/finances', permission: 'finances:consulter', exact: true },
          { label: 'Saisies financières', route: '/finances/operations', permission: 'finances:consulter', compteur: 'saisiesFinancieres' },
          { label: 'Trésorerie et caisse', route: '/finances/tresorerie', permission: 'finances:consulter' },
          { label: 'Reversements aux propriétaires', route: '/finances/reversements', permission: 'finances:consulter' },
          { label: 'Désistements et remboursements', route: '/finances/remboursements', permission: 'finances:consulter' },
          { label: 'Rapport du soir', route: '/finances/rapport-quotidien', permission: 'finances:consulter' },
        ],
      },
      // Le travail du comptable : écritures, contrôle, états et clôtures.
      {
        label: 'Comptabilité',
        route: '/finances/journal',
        icon: LucideLandmark,
        children: [
          { label: 'Journal financier', route: '/finances/journal', permission: 'finances:consulter' },
          { label: 'Rapprochement bancaire', route: '/finances/rapprochement', permission: 'finances:consulter' },
          { label: 'États financiers', route: '/finances/etats', permission: 'finances:consulter' },
          { label: 'Rentabilité des chantiers', route: '/finances/chantiers', permission: 'finances:consulter' },
          { label: 'Clôtures mensuelles', route: '/finances/clotures', permission: 'finances:consulter' },
        ],
      },
    ],
  },
  {
    title: 'Administration',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      {
        label: 'Site web',
        route: '/content',
        icon: LucideGlobe,
        children: [
          { label: 'Contenus du site', route: '/content', permission: 'content:consulter', exact: true },
          { label: 'Réalisations & projets', route: '/content/showcase', permission: 'content:consulter' },
          { label: 'Actualités et conseils', route: '/content/actualites', permission: 'content:consulter' },
          { label: 'Publicités du bandeau', route: '/content/promotions', permission: 'content:consulter' },
          { label: 'Équipe du site', route: '/content/equipe', permission: 'content:consulter' },
        ],
      },
      {
        label: 'Utilisateurs et accès',
        route: '/users',
        icon: LucideUserCog,
        children: [
          { label: 'Utilisateurs', route: '/users', permission: 'users:consulter' },
          { label: 'Rôles et droits d’accès', route: '/roles', permission: 'roles:consulter' },
          { label: 'Historique des actions', route: '/audit', permission: 'audit:consulter' },
        ],
      },
      {
        label: 'Réglages',
        route: '/settings',
        icon: LucideSettings,
        children: [
          { label: 'Paramètres', route: '/settings', permission: 'settings:consulter' },
          { label: 'Identité de l’entreprise', route: '/entreprise', permission: 'settings:consulter' },
          { label: 'Étapes des dossiers', route: '/workflows', permission: 'settings:consulter' },
          { label: 'Règles de notification', route: '/notifications/regles', permission: 'notifications:administrer' },
          { label: 'Alertes et rapports automatiques', route: '/pilotage/reglages', permission: 'rapports:administrer' },
        ],
      },
    ],
  },
];

/**
 * Pages personnelles : elles ne sont plus dans le menu mais dans le menu du
 * profil (en-tête), où l'on cherche naturellement « mon compte » et l'aide.
 * Elles restent connues ici pour le fil d'Ariane et la recherche de pages.
 */
export const PAGES_COMPTE: (NavLeaf & { section: string })[] = [
  { label: 'Mes notifications', route: '/notifications', exact: true, section: 'Mon compte' },
  { label: 'Sécurité', route: '/security', section: 'Mon compte' },
  { label: 'Guide d’utilisation', route: '/manuel/', href: '/manuel/', section: 'Aide' },
];

function dansRoute(url: string, route: string, exact?: boolean): boolean {
  return exact ? url === route : url === route || url.startsWith(`${route}/`);
}

/** L'adresse (sans paramètres) tombe sur cette entrée. */
export function entreeCorrespond(entree: NavLeaf, url: string): boolean {
  return !entree.href && dansRoute(url, entree.route, entree.exact);
}

/** L'adresse tombe sur l'une des pages du sujet, ou sur l'une de ses racines (fiche d'un dossier…). */
export function sujetCorrespond(item: NavItem, url: string): boolean {
  return (
    (item.children ?? []).some((enfant) => entreeCorrespond(enfant, url)) ||
    (item.racines ?? []).some((racine) => dansRoute(url, racine))
  );
}

/** Une page que la personne peut atteindre : le menu, ses onglets et le menu du profil. */
export interface PageNavigable {
  label: string;
  route: string;
  /** Où la page se range : la rubrique du menu et, le cas échéant, le sujet. */
  section: string;
  permission?: string;
  href?: string;
}

/** Toutes les pages de l'application, à plat : de quoi chercher une page par son nom. */
export function pagesNavigables(): PageNavigable[] {
  const pages: PageNavigable[] = [];
  for (const section of NAVIGATION_SECTIONS) {
    const rubrique = section.title || 'Accueil';
    for (const item of section.items) {
      if (item.children?.length) {
        const ou = rubrique === item.label ? rubrique : `${rubrique} · ${item.label}`;
        for (const enfant of item.children) pages.push({ ...enfant, section: ou });
      } else {
        pages.push({ label: item.label, route: item.route, section: rubrique, permission: item.permission, href: item.href });
      }
    }
  }
  return [...pages, ...PAGES_COMPTE];
}
