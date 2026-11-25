import { describe, expect, it } from 'vitest';
import { urlSitePublic } from './site-public';

describe('urlSitePublic', () => {
  const base = 'https://www.mtm-immobilier.com';

  it('complète un chemin relatif avec l’adresse du site public', () => {
    expect(urlSitePublic('/poles/gestion.jpg', base)).toBe('https://www.mtm-immobilier.com/poles/gestion.jpg');
    expect(urlSitePublic('poles/gestion.jpg', base)).toBe('https://www.mtm-immobilier.com/poles/gestion.jpg');
  });

  it('ne double pas la barre finale de l’adresse du site', () => {
    expect(urlSitePublic('/poles/btp.jpg', 'https://exemple.test/')).toBe('https://exemple.test/poles/btp.jpg');
  });

  it('laisse intactes les adresses déjà complètes (photo envoyée, aperçu local)', () => {
    expect(urlSitePublic('https://res.cloudinary.com/x/image/upload/p.jpg', base)).toBe('https://res.cloudinary.com/x/image/upload/p.jpg');
    expect(urlSitePublic('//cdn.exemple.test/p.jpg', base)).toBe('//cdn.exemple.test/p.jpg');
    expect(urlSitePublic('blob:http://localhost/abc', base)).toBe('blob:http://localhost/abc');
  });

  it('renvoie null sans adresse', () => {
    expect(urlSitePublic(null, base)).toBeNull();
    expect(urlSitePublic('', base)).toBeNull();
  });
});
