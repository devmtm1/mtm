import { describe, expect, it } from 'vitest';
import type { Publication } from '../types/publication';
import { formaterDureeLecteur, rubriquesPresentes, separerALaUne } from './publications';

function video(id: string, categorie: Publication['categorie'], misEnAvant = false): Publication {
  return {
    id,
    titre: id,
    categorie,
    resume: null,
    videoUrl: `https://exemple.test/${id}.mp4`,
    posterUrl: null,
    dureeSecondes: null,
    largeur: null,
    hauteur: null,
    datePublication: '2026-10-01T00:00:00.000Z',
    misEnAvant,
  };
}

describe('publications', () => {
  it('formate la durée comme un lecteur vidéo', () => {
    expect(formaterDureeLecteur(45)).toBe('0:45');
    expect(formaterDureeLecteur(95)).toBe('1:35');
    expect(formaterDureeLecteur(3725)).toBe('1:02:05');
    expect(formaterDureeLecteur(null)).toBe('');
  });

  it('met à la une la vidéo choisie, sinon la première', () => {
    const liste = [video('a', 'conseil'), video('b', 'foncier', true)];
    expect(separerALaUne(liste).aLaUne?.id).toBe('b');
    expect(separerALaUne(liste).autres.map((v) => v.id)).toEqual(['a']);
    expect(separerALaUne([video('a', 'conseil')]).aLaUne?.id).toBe('a');
    expect(separerALaUne([]).aLaUne).toBeNull();
  });

  it('ne propose que les rubriques qui ont des vidéos', () => {
    const codes = rubriquesPresentes([video('a', 'foncier'), video('b', 'conseil')]).map((r) => r.code);
    expect(codes).toEqual(['conseil', 'foncier']);
  });
});
