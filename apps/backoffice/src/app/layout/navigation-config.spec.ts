import { describe, expect, it } from 'vitest';
import { routes } from '../app.routes';
import { texteCompteur } from './nav-compteurs.service';
import { NAVIGATION_SECTIONS, type NavLeaf } from './navigation-config';

/** Toutes les entrées du menu, groupes dépliés. */
function entrees(): (NavLeaf & { rubrique: string })[] {
  return NAVIGATION_SECTIONS.flatMap((section) =>
    section.items.flatMap((item) => [
      { ...item, rubrique: section.title },
      ...(item.children ?? []).map((enfant) => ({ ...enfant, rubrique: section.title })),
    ]),
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

  it('range chaque entrée sous une rubrique nommée, sans rubrique en double', () => {
    const titres = NAVIGATION_SECTIONS.map((section) => section.title);
    expect(titres.every((titre) => titre.trim().length > 0)).toBe(true);
    expect(new Set(titres).size).toBe(titres.length);
  });

  it('replie les rubriques rarement utilisées et garde le quotidien toujours visible', () => {
    const rubrique = (titre: string) => NAVIGATION_SECTIONS.find((section) => section.title === titre);
    expect(rubrique('Administration')?.defaultCollapsed).toBe(true);
    expect(rubrique('Site public')?.defaultCollapsed).toBe(true);
    for (const titre of ['Aujourd’hui', 'Ventes', 'Biens', 'Gestion locative']) {
      expect(rubrique(titre)?.collapsible ?? false).toBe(false);
    }
  });

  it('commence par le quotidien : tableau de bord, tâches, agenda, documents', () => {
    expect(NAVIGATION_SECTIONS[0].items.map((item) => item.label)).toEqual(['Tableau de bord', 'Tâches', 'Agenda', 'Documents']);
  });

  it('place les pastilles sur les pages où il y a quelque chose à faire', () => {
    const avecPastille = Object.fromEntries(entrees().filter((e) => e.compteur).map((e) => [e.label, e.compteur]));
    expect(avecPastille).toEqual({
      Tâches: 'tachesEnRetard',
      'Demandes du site': 'demandesWeb',
      'Dossiers de vente': 'paiementsAValider',
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
