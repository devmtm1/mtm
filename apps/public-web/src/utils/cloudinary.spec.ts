import { describe, expect, it } from 'vitest';
import { cloudinarySrcSet, cloudinaryWidth, isCloudinaryImage } from './cloudinary';

const BASE = 'https://res.cloudinary.com/demo/image/upload';
const AVEC_TRANSFORMATION = `${BASE}/f_auto,q_auto/v1/mtm/terrains/t1/media/photo`;
const SANS_TRANSFORMATION = `${BASE}/v1/mtm/terrains/t1/media/photo`;

describe('variantes d’images Cloudinary', () => {
  it('ajoute la largeur à la transformation existante, sans écraser le format', () => {
    const url = cloudinaryWidth(AVEC_TRANSFORMATION, 800);

    expect(url).toContain('f_auto,q_auto,w_800');
    expect(url).toContain('/v1/mtm/terrains/t1/media/photo');
  });

  it('insère une transformation quand l’URL n’en a pas', () => {
    expect(cloudinaryWidth(SANS_TRANSFORMATION, 400)).toBe(
      `${BASE}/w_400/v1/mtm/terrains/t1/media/photo`,
    );
  });

  it('laisse intacte une image qui ne vient pas de Cloudinary', () => {
    const locale = '/hero-poster.jpg';

    expect(isCloudinaryImage(locale)).toBe(false);
    expect(cloudinaryWidth(locale, 800)).toBe(locale);
    expect(cloudinarySrcSet(locale)).toBe('');
  });

  it('ne propose pas de variantes pour une vidéo', () => {
    const video = 'https://res.cloudinary.com/demo/video/upload/v1/mtm/visite.mp4';

    expect(cloudinarySrcSet(video)).toBe('');
  });

  it('décrit chaque variante par sa largeur réelle', () => {
    const srcSet = cloudinarySrcSet(AVEC_TRANSFORMATION);

    expect(srcSet.split(', ')).toHaveLength(4);
    expect(srcSet).toContain('f_auto,q_auto,w_400/');
    expect(srcSet).toContain('photo 400w');
    expect(srcSet).toContain('photo 1600w');
  });
});
