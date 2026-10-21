import { describe, expect, it } from 'vitest';
import { datePublicationDite, formaterDuree, formaterTaille, idYoutube, libelleCategorie } from './publication-status';

describe('durée d’une vidéo', () => {
  it('se lit comme on la dirait', () => {
    expect(formaterDuree(45)).toBe('45 s');
    expect(formaterDuree(95)).toBe('1 min 35 s');
    expect(formaterDuree(600)).toBe('10 min 00 s');
    expect(formaterDuree(3725)).toBe('1 h 02 min');
  });

  it('ne dit rien quand la durée est inconnue', () => {
    expect(formaterDuree(null)).toBe('');
    expect(formaterDuree(undefined)).toBe('');
  });
});

describe('affichage d’une publication', () => {
  it('écrit la taille en mégaoctets, à la française', () => {
    expect(formaterTaille(26_500_000)).toBe('25,3 Mo');
    expect(formaterTaille(null)).toBe('');
  });

  it('dit la date de publication, passée ou à venir', () => {
    expect(datePublicationDite({ datePublication: '2026-10-21T00:00:00.000Z', statut: 'en_ligne' })).toBe('Publication du 21/10/2026');
    expect(datePublicationDite({ datePublication: '2026-11-05T00:00:00.000Z', statut: 'programmee' })).toBe('Sera publiée le 05/11/2026');
    expect(datePublicationDite({ datePublication: null, statut: 'brouillon' })).toBe('Sans date de publication');
  });

  it('traduit les rubriques', () => {
    expect(libelleCategorie('conseil')).toBe('Conseil');
    expect(libelleCategorie('foncier')).toBe('Foncier');
  });
});

describe('lien YouTube', () => {
  it('reconnaît les formes usuelles de lien', () => {
    expect(idYoutube('https://www.youtube.com/watch?v=LSH6GRjVwho')).toBe('LSH6GRjVwho');
    expect(idYoutube('https://youtu.be/LSH6GRjVwho?si=x')).toBe('LSH6GRjVwho');
    expect(idYoutube('https://www.youtube.com/shorts/LSH6GRjVwho')).toBe('LSH6GRjVwho');
    expect(idYoutube('youtube.com/watch?v=LSH6GRjVwho&t=5s')).toBe('LSH6GRjVwho');
  });

  it('refuse ce qui n’est pas une vidéo YouTube', () => {
    expect(idYoutube('')).toBeNull();
    expect(idYoutube('bonjour')).toBeNull();
    expect(idYoutube('https://exemple.com/watch?v=LSH6GRjVwho')).toBeNull();
    expect(idYoutube('https://www.youtube.com/watch?v=court')).toBeNull();
  });
});
