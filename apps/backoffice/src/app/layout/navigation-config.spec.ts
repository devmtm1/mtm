import { describe, expect, it } from 'vitest';
import { routes } from '../app.routes';
import { texteCompteur } from './nav-compteurs.service';
import {
  NAVIGATION_SECTIONS,
  PAGES_COMPTE,
  entreeCorrespond,
  pagesNavigables,
  sujetCorrespond,
  type NavItem,
  type NavLeaf,
} from './navigation-config';

const items = (): NavItem[] => NAVIGATION_SECTIONS.flatMap((section) => section.items);

/** Les pages du menu : les liens directs et les pages des sujets (qui s'affichent en onglets). */
function entrees(): (NavLeaf & { rubrique: string })[] {
  return NAVIGATION_SECTIONS.flatMap((section) =>
    section.items.flatMap((item) =>
      (item.children ?? [item]).map((entree) => ({ ...entree, rubrique: section.title })),
    ),
  );
}

/** Chemins de l'application connectée (les routes enfants de la coquille). */
function cheminsConnectes(): string[] {
  const coquille = routes.find((route) => route.children?.some((enfant) => enfant.path === 'dashboard'));
  return (coquille?.children ?? []).map((enfant) => enfant.path ?? '');
}

const sujet = (label: string): NavItem => {
  const trouve = items().find((item) => item.label === label);
  if (!trouve) throw new Error(`sujet introuvable : ${label}`);
  return trouve;
};

describe('navigation du back-office', () => {
  it('n’a jamais deux entrées de même nom : le menu doit se lire sans ambiguïté', () => {
    const noms = [...entrees().map((entree) => entree.label), ...PAGES_COMPTE.map((page) => page.label)];
    const doublons = noms.filter((nom, i) => noms.indexOf(nom) !== i);
    expect(doublons).toEqual([]);
  });

  it('n’a jamais deux entrées vers la même page', () => {
    const adresses = [...entrees().map((entree) => entree.route), ...PAGES_COMPTE.map((page) => page.route)];
    const doublons = adresses.filter((route, i) => adresses.indexOf(route) !== i);
    expect(doublons).toEqual([]);
  });

  it('ne propose que des pages qui existent (hors le guide, servi à part)', () => {
    const chemins = cheminsConnectes();
    const manquantes = [...entrees(), ...PAGES_COMPTE]
      .filter((entree) => !entree.href)
      .map((entree) => entree.route.replace(/^\//, ''))
      .filter((route) => !chemins.includes(route));
    expect(manquantes).toEqual([]);
  });

  it('range chaque entrée sous une rubrique nommée (sauf le tableau de bord, seul en tête), sans rubrique en double', () => {
    const titres = NAVIGATION_SECTIONS.map((section) => section.title);
    expect(titres[0]).toBe('');
    expect(titres.slice(1).every((titre) => titre.trim().length > 0)).toBe(true);
    expect(new Set(titres).size).toBe(titres.length);
  });

  it('reste court : sept rubriques au plus, vingt lignes au plus', () => {
    expect(NAVIGATION_SECTIONS.length).toBeLessThanOrEqual(7);
    expect(items().length).toBeLessThanOrEqual(20);
  });

  it('ne replie que l’administration, rarement utilisée', () => {
    const repliables = NAVIGATION_SECTIONS.filter((section) => section.collapsible).map((section) => section.title);
    expect(repliables).toEqual(['Administration']);
    expect(NAVIGATION_SECTIONS.find((section) => section.title === 'Administration')?.defaultCollapsed).toBe(true);
  });

  it('ne donne jamais la même icône à deux lignes du menu', () => {
    const icones = items().map((item) => item.icon);
    expect(new Set(icones).size).toBe(icones.length);
  });

  it('range en onglets les sujets à plusieurs pages, une seule ligne chacun', () => {
    const sujets = items().filter((item) => item.children);
    expect(sujets.map((item) => item.label)).toEqual([
      'Dossiers de vente',
      'Gestion locative',
      'Finances',
      'Comptabilité',
      'Site web',
      'Utilisateurs et accès',
      'Réglages',
    ]);
    for (const item of sujets) {
      expect(item.children?.length ?? 0, item.label).toBeGreaterThanOrEqual(2);
      // La ligne du menu ouvre l'une des pages du sujet.
      expect(item.children?.map((enfant) => enfant.route), item.label).toContain(item.route);
    }
  });

  it('commence par le quotidien : tableau de bord, puis tâches, agenda, documents', () => {
    expect(NAVIGATION_SECTIONS[0].items.map((item) => item.label)).toEqual(['Tableau de bord']);
    expect(NAVIGATION_SECTIONS[1].items.map((item) => item.label)).toEqual(['Tâches', 'Agenda', 'Documents']);
  });

  it('place les pastilles sur les pages où il y a quelque chose à faire', () => {
    const avecPastille = Object.fromEntries(entrees().filter((e) => e.compteur).map((e) => [e.label, e.compteur]));
    expect(avecPastille).toEqual({
      Tâches: 'tachesEnRetard',
      'Demandes du site': 'demandesWeb',
      'Tous les dossiers': 'paiementsAValider',
      Résiliations: 'resiliations',
      'Relances d’impayés': 'relancesLocatives',
      'Saisies financières': 'saisiesFinancieres',
    });
  });
});

describe('repérage de la page dans le menu', () => {
  it('reconnaît une page, en tenant compte des pages « exactes »', () => {
    const contenus = sujet('Site web').children?.[0] as NavLeaf;
    expect(entreeCorrespond(contenus, '/content')).toBe(true);
    expect(entreeCorrespond(contenus, '/content/showcase')).toBe(false);
    const locataires = sujet('Gestion locative').children?.[1] as NavLeaf;
    expect(entreeCorrespond(locataires, '/locatif/locataires/42')).toBe(true);
  });

  it('garde le sujet surligné sur une fiche qui n’est pas un onglet (dossier de vente)', () => {
    expect(sujetCorrespond(sujet('Dossiers de vente'), '/ventes/abc-123')).toBe(true);
    expect(sujetCorrespond(sujet('Gestion locative'), '/locatif/biens/nouveau')).toBe(true);
  });

  it('distingue les finances du quotidien de la comptabilité, qui partagent la racine /finances', () => {
    expect(sujetCorrespond(sujet('Finances'), '/finances')).toBe(true);
    expect(sujetCorrespond(sujet('Comptabilité'), '/finances')).toBe(false);
    expect(sujetCorrespond(sujet('Finances'), '/finances/tresorerie')).toBe(true);
    expect(sujetCorrespond(sujet('Comptabilité'), '/finances/chantiers/7')).toBe(true);
    expect(sujetCorrespond(sujet('Finances'), '/finances/chantiers/7')).toBe(false);
  });

  it('retrouve les pages personnelles (menu du profil) pour le fil d’Ariane et la recherche', () => {
    const pages = pagesNavigables();
    expect(pages.find((page) => page.route === '/security')?.section).toBe('Mon compte');
    expect(pages.find((page) => page.route === '/finances/etats')?.section).toBe('Pilotage et finances · Comptabilité');
  });
});

describe('pastille du menu', () => {
  it('ne montre rien quand il n’y a rien à faire', () => {
    expect(texteCompteur(0)).toBeNull();
    expect(texteCompteur(undefined)).toBeNull();
    expect(texteCompteur(-1)).toBeNull();
  });

  it('montre le nombre, puis « 99+ » au-delà', () => {
    expect(texteCompteur(3)).toBe('3');
    expect(texteCompteur(99)).toBe('99');
    expect(texteCompteur(100)).toBe('99+');
  });
});
