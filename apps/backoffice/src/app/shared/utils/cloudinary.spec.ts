import { estImageCloudinary, vignetteCloudinary } from './cloudinary';

describe('vignettes Cloudinary', () => {
  const AVEC_TRANSFORMATION =
    'https://res.cloudinary.com/mtm/image/upload/f_auto,q_auto/v1/demarches/m1/photo.jpg';
  const SANS_TRANSFORMATION =
    'https://res.cloudinary.com/mtm/image/upload/v1/demarches/m1/photo.jpg';

  it('ajoute la largeur sans perdre le format automatique posé par l’API', () => {
    expect(vignetteCloudinary(AVEC_TRANSFORMATION)).toBe(
      'https://res.cloudinary.com/mtm/image/upload/f_auto,q_auto,w_320,c_fill,ar_4:3/v1/demarches/m1/photo.jpg',
    );
  });

  it('pose une transformation quand l’URL n’en a pas', () => {
    expect(vignetteCloudinary(SANS_TRANSFORMATION, 160)).toBe(
      'https://res.cloudinary.com/mtm/image/upload/w_160,c_fill,ar_4:3/v1/demarches/m1/photo.jpg',
    );
  });

  it('laisse intacte une pièce qui n’est pas une image', () => {
    // Un PDF est servi en `raw` : le redimensionner casserait le lien.
    const rapport =
      'https://res.cloudinary.com/mtm/raw/upload/v1/demarches/m1/rapport.pdf';
    expect(estImageCloudinary(rapport)).toBe(false);
    expect(vignetteCloudinary(rapport)).toBe(rapport);
  });

  it('laisse intact un lien hors Cloudinary', () => {
    expect(vignetteCloudinary('https://exemple.test/photo.jpg')).toBe(
      'https://exemple.test/photo.jpg',
    );
  });
});
