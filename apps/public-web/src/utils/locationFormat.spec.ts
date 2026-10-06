import { describe, expect, it } from 'vitest';
import {
  chambresLabel,
  disponibiliteLabel,
  formatLoyerMontant,
  locationPlace,
  locationTitle,
  sallesEauLabel,
  sortKeyFrom,
  sortParams,
} from './locationFormat';

describe('formatLoyerMontant', () => {
  it('sépare les milliers et indique la devise', () => {
    expect(formatLoyerMontant(350000).replace(/\s/g, ' ')).toBe('350 000 FCFA');
  });

  it('ne promet pas de prix quand il manque', () => {
    expect(formatLoyerMontant(null)).toBe('Loyer sur demande');
  });
});

describe('locationTitle', () => {
  it('garde le titre saisi par MTM', () => {
    expect(locationTitle({ titre: ' Villa vue mer ', type: 'villa', commune: 'Saly' }, 'Villa')).toBe('Villa vue mer');
  });

  it('retombe sur « type à commune », puis sur le seul type', () => {
    expect(locationTitle({ titre: null, type: 'villa', commune: 'Saly' }, 'Villa')).toBe('Villa à Saly');
    expect(locationTitle({ titre: '  ', type: 'studio', commune: null }, 'Studio')).toBe('Studio');
  });
});

describe('locationPlace', () => {
  it('assemble commune et région sans séparateur orphelin', () => {
    expect(locationPlace({ commune: 'Ngor', region: 'Dakar' })).toBe('Ngor, Dakar');
    expect(locationPlace({ commune: null, region: 'Dakar' })).toBe('Dakar');
    expect(locationPlace({ commune: null, region: null })).toBe('');
  });
});

describe('disponibiliteLabel', () => {
  const maintenant = new Date('2026-10-06T10:00:00Z');

  it('dit « immédiatement » sans date ou avec une date passée', () => {
    expect(disponibiliteLabel(null, maintenant)).toBe('Disponible immédiatement');
    expect(disponibiliteLabel('2026-09-01T00:00:00Z', maintenant)).toBe('Disponible immédiatement');
  });

  it('annonce la date quand elle est à venir', () => {
    expect(disponibiliteLabel('2026-11-15T00:00:00Z', maintenant)).toBe('Disponible dès le 15 novembre 2026');
  });

  it('ignore une date illisible plutôt que d’afficher « Invalid Date »', () => {
    expect(disponibiliteLabel('pas-une-date', maintenant)).toBe('Disponible immédiatement');
  });
});

describe('libellés de pièces', () => {
  it('chambres : studio, singulier, pluriel, inconnu', () => {
    expect(chambresLabel(0)).toBe('Studio');
    expect(chambresLabel(1)).toBe('1 chambre');
    expect(chambresLabel(3)).toBe('3 chambres');
    expect(chambresLabel(null)).toBeNull();
  });

  it('salles d’eau : rien à afficher à zéro ou inconnu', () => {
    expect(sallesEauLabel(0)).toBeNull();
    expect(sallesEauLabel(null)).toBeNull();
    expect(sallesEauLabel(1)).toBe('1 salle d’eau');
    expect(sallesEauLabel(2)).toBe('2 salles d’eau');
  });
});

describe('tri', () => {
  it.each(['recent', 'loyer_asc', 'loyer_desc', 'superficie_desc'] as const)(
    'le tri « %s » fait l’aller-retour entre l’adresse et l’API',
    (key) => {
      expect(sortKeyFrom(sortParams(key))).toBe(key);
    },
  );

  it('le tri par défaut est le plus récent', () => {
    expect(sortParams('recent')).toEqual({ sortBy: 'createdAt', sortOrder: 'desc' });
    expect(sortKeyFrom({})).toBe('recent');
  });
});
