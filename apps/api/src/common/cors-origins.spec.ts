import { originesAutorisees } from './cors-origins';

describe('originesAutorisees', () => {
  it('autorise le domaine nu quand seul « www » est déclaré, et inversement', () => {
    expect(originesAutorisees('https://www.mtm-immobilier.com')).toEqual([
      'https://www.mtm-immobilier.com',
      'https://mtm-immobilier.com',
    ]);
    expect(originesAutorisees('https://mtm-immobilier.com')).toEqual([
      'https://mtm-immobilier.com',
      'https://www.mtm-immobilier.com',
    ]);
  });

  it('garde chaque origine de la liste, espaces et barre finale ignorés', () => {
    const origines = originesAutorisees(
      ' https://www.mtm-immobilier.com/ , https://admin.mtm-immobilier.com ',
    );
    expect(origines).toEqual(
      expect.arrayContaining([
        'https://www.mtm-immobilier.com',
        'https://mtm-immobilier.com',
        'https://admin.mtm-immobilier.com',
      ]),
    );
  });

  it('n’invente pas de « www » pour un sous-domaine, localhost ou une adresse IP', () => {
    expect(originesAutorisees('https://admin.mtm-immobilier.com')).toEqual(['https://admin.mtm-immobilier.com']);
    expect(originesAutorisees('http://localhost:4200')).toEqual(['http://localhost:4200']);
  });

  it('conserve le port de la variante', () => {
    expect(originesAutorisees('http://exemple.test:8080')).toEqual([
      'http://exemple.test:8080',
      'http://www.exemple.test:8080',
    ]);
  });

  it('ignore une valeur qui n’est pas une adresse', () => {
    expect(originesAutorisees('pas-une-url, https://admin.mtm-immobilier.com')).toEqual([
      'pas-une-url',
      'https://admin.mtm-immobilier.com',
    ]);
  });
});
