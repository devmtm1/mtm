import { describe, expect, it } from 'vitest';
import { extraireIdYoutube } from './youtube';

describe('extraireIdYoutube', () => {
  const ID = 'dQw4w9WgXcQ';

  it('lit les formes d’adresse que l’on copie depuis YouTube', () => {
    expect(extraireIdYoutube(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extraireIdYoutube(`https://www.youtube.com/watch?v=${ID}&t=42s`)).toBe(ID);
    expect(extraireIdYoutube(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extraireIdYoutube(`https://youtu.be/${ID}?si=abc`)).toBe(ID);
    expect(extraireIdYoutube(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(extraireIdYoutube(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(extraireIdYoutube(`youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it('accepte l’identifiant seul, avec des espaces autour', () => {
    expect(extraireIdYoutube(`  ${ID}  `)).toBe(ID);
  });

  it('refuse tout ce qui n’est pas une vidéo YouTube : rien ne s’affiche plutôt qu’un lecteur cassé', () => {
    expect(extraireIdYoutube('')).toBeNull();
    expect(extraireIdYoutube(null)).toBeNull();
    expect(extraireIdYoutube(undefined)).toBeNull();
    expect(extraireIdYoutube('https://vimeo.com/123456789')).toBeNull();
    expect(extraireIdYoutube('https://www.youtube.com/watch?v=trop-court')).toBeNull();
    expect(extraireIdYoutube('https://exemple.com/watch?v=' + ID)).toBeNull();
    expect(extraireIdYoutube('pas une adresse')).toBeNull();
  });
});
