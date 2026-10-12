import { TAILLE_MAX_FICHIER, problemeFichier, tailleLisible } from './chantier-status';

describe('problemeFichier', () => {
  it('accepte une photo, une vidéo MP4 et un PDF', () => {
    expect(problemeFichier({ name: 'a.jpg', type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(problemeFichier({ name: 'a.mp4', type: 'video/mp4', size: 1000 })).toBeNull();
    expect(problemeFichier({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toBeNull();
  });

  it('refuse un PDF quand seules les photos et vidéos sont permises', () => {
    expect(problemeFichier({ name: 'a.pdf', type: 'application/pdf', size: 1000 }, true)).toMatch(/non accepté/);
  });

  it('refuse un type inconnu et un fichier trop lourd', () => {
    expect(problemeFichier({ name: 'a.exe', type: 'application/x-msdownload', size: 10 })).toMatch(/non accepté/);
    expect(problemeFichier({ name: 'a.jpg', type: 'image/jpeg', size: TAILLE_MAX_FICHIER + 1 })).toMatch(/10 Mo/);
  });
});

describe('tailleLisible', () => {
  it('affiche des Ko puis des Mo', () => {
    expect(tailleLisible(2048)).toBe('2 Ko');
    expect(tailleLisible(3.2 * 1024 * 1024)).toBe('3,2 Mo');
  });
});
