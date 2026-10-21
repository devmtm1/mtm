import { describe, expect, it } from 'vitest';
import {
  TAILLE_MAX_VIDEO,
  TAILLE_MORCEAU,
  decouper,
  enteteContentRange,
  messageErreurEnvoi,
  problemeVideo,
} from './publication-envoi';

describe('découpage d’une vidéo en morceaux', () => {
  it('ne fait qu’un morceau d’un petit fichier', () => {
    expect(decouper(1_000_000)).toEqual([{ debut: 0, fin: 999_999 }]);
  });

  it('découpe en morceaux consécutifs, le dernier plus court, sans trou ni recouvrement', () => {
    const taille = TAILLE_MORCEAU * 2 + 1234;
    const morceaux = decouper(taille);
    expect(morceaux).toHaveLength(3);
    expect(morceaux[0]).toEqual({ debut: 0, fin: TAILLE_MORCEAU - 1 });
    expect(morceaux[1].debut).toBe(morceaux[0].fin + 1);
    expect(morceaux[2].debut).toBe(morceaux[1].fin + 1);
    expect(morceaux[2].fin).toBe(taille - 1);
  });

  it('couvre exactement tous les octets d’un fichier de 100 Mo', () => {
    const morceaux = decouper(TAILLE_MAX_VIDEO);
    const total = morceaux.reduce((somme, m) => somme + (m.fin - m.debut + 1), 0);
    expect(total).toBe(TAILLE_MAX_VIDEO);
    // Cloudinary exige au moins 5 Mo par morceau, sauf le dernier.
    for (const morceau of morceaux.slice(0, -1)) expect(morceau.fin - morceau.debut + 1).toBeGreaterThanOrEqual(5 * 1024 * 1024);
  });

  it('ne produit rien pour un fichier vide', () => {
    expect(decouper(0)).toEqual([]);
  });

  it('écrit l’en-tête Content-Range attendu par Cloudinary', () => {
    expect(enteteContentRange({ debut: 0, fin: 5_999_999 }, 20_000_000)).toBe('bytes 0-5999999/20000000');
  });
});

describe('contrôle d’une vidéo avant l’envoi', () => {
  const video = (type: string, octets: number, nom = 'conseil.mp4') => ({ type, size: octets, name: nom });

  it('accepte une vidéo MP4, MOV ou WebM de taille raisonnable', () => {
    expect(problemeVideo(video('video/mp4', 30_000_000))).toBeNull();
    expect(problemeVideo(video('video/quicktime', 30_000_000, 'tour.mov'))).toBeNull();
    expect(problemeVideo(video('video/webm', 30_000_000, 'tour.webm'))).toBeNull();
  });

  it('reconnaît le format par l’extension quand le navigateur ne donne pas de type', () => {
    expect(problemeVideo(video('', 30_000_000, 'conseil.MP4'))).toBeNull();
  });

  it('refuse un autre format, un fichier vide ou trop lourd, en le disant', () => {
    expect(problemeVideo(video('video/x-msvideo', 1_000_000, 'ancien.avi'))).toMatch(/Format non pris en charge/);
    expect(problemeVideo(video('image/png', 1_000_000, 'affiche.png'))).toMatch(/Format non pris en charge/);
    expect(problemeVideo(video('video/mp4', 0))).toMatch(/vide/);
    expect(problemeVideo(video('video/mp4', TAILLE_MAX_VIDEO + 1))).toMatch(/trop lourde/);
  });
});

describe('message d’erreur d’envoi', () => {
  it('traduit les refus de Cloudinary en phrases claires', () => {
    expect(messageErreurEnvoi(400, { error: { message: 'File size too large. Got 150000000. Maximum is 104857600.' } })).toMatch(/dépasse la taille permise/);
    expect(messageErreurEnvoi(401, { error: { message: 'Invalid Signature' } })).toMatch(/expiré/);
    expect(messageErreurEnvoi(0, null)).toMatch(/Connexion interrompue/);
    expect(messageErreurEnvoi(500, null)).toMatch(/code 500/);
  });
});
