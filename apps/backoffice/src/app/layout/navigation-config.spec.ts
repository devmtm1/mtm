import { describe, expect, it } from 'vitest';
import { routes } from '../app.routes';
import { texteCompteur } from './nav-compteurs.service';
import { NAVIGATION_SECTIONS, type NavLeaf } from './navigation-config';

/** Les pages du menu : les liens directs et les enfants des groupes (un groupe n'est qu'un titre qui se déplie). */
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

describe('navigation du back-office', () => {
  it('n’a jamais deux entrées de même nom : le menu doit se lire sans ambiguïté', () => {
    const noms = entrees().map((entree) => entree.label);
    const doublons = noms.filter((nom, i) => noms.indexOf(nom) !== i);
    expect(doublons).toEqual([]);
  });

  it('n’a jamais deux entrées vers la même page', () => {
    const adresses = entrees().map((entree) => entree.route);
    const doublons = adresses.filter((route, i) => adresses.indexOf(route) !== i);
    expect(doublons).toEqual([]);
  });

  it('ne propose que des pages qui existent (hors le guide, servi à part)', () => {
    const chemins = cheminsConnectes();
    const manquantes = entrees()
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

  it('permet de plier chaque rubrique, et replie d’origine les rarement utilisées', () => {
    const rubrique = (titre: string) => NAVIGATION_SECTIONS.find((section) => section.title === titre);
    expect(rubrique('Administration')?.defaultCollapsed).toBe(true);
    expect(rubrique('Site public')?.defaultCollapsed).toBe(true);
    for (const section of NAVIGATION_SECTIONS.filter((s) => s.title)) {
      expect(section.collapsible, section.title).toBe(true);
    }
    for (const titre of ['Espace de travail', 'Commercial', 'Patrimoine immobilier', 'Gestion locative']) {
      expect(rubrique(titre)?.defaultCollapsed ?? false).toBe(false);
    }
  });

  it('regroupe en menu déroulant les pages d’un même sujet (dossiers de vente, finances)', () => {
    const groupes = NAVIGATION_SECTIONS.flatMap((s) => s.items).filter((i) => i.children);
    expect(groupes.map((g) => g.label)).toEqual(['Dossiers de vente', 'Finances']);
    expect(groupes.every((g) => (g.children?.length ?? 0) >= 2)).toBe(true);
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
