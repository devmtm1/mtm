import { publicIdDepuisUrl } from './cloudinary-url';

describe('publicIdDepuisUrl', () => {
  it.each([
    [
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm-prod/mtm/pages/bandeau',
      'mtm-prod/mtm/pages/bandeau',
    ],
    [
      'https://res.cloudinary.com/demo/image/upload/v1699999999/mtm-prod/mtm/pages/bandeau.jpg',
      'mtm-prod/mtm/pages/bandeau',
    ],
    [
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm/pages/photo-de-villa_ab12',
      'mtm/pages/photo-de-villa_ab12',
    ],
  ])('lit %s', (url, attendu) => {
    expect(publicIdDepuisUrl(url)).toBe(attendu);
  });

  it.each([
    null,
    undefined,
    '',
    '/hero-poster.jpg',
    'https://exemple.com/image.jpg',
    'Du texte ordinaire',
  ])('renvoie null pour %s', (valeur) => {
    expect(publicIdDepuisUrl(valeur)).toBeNull();
  });
});
