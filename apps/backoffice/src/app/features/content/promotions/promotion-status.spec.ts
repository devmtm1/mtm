import { TAILLE_MAX_MEDIA, STATUTS_DIFFUSION, periodeDiffusion, problemeMedia } from './promotion-status';

describe('promotion-status', () => {
  it('décrit la période de diffusion', () => {
    expect(periodeDiffusion({ dateDebut: '2026-10-15T00:00:00.000Z', dateFin: '2026-10-31T23:59:59.999Z' })).toBe(
      'Du 15/10/2026 au 31/10/2026',
    );
    expect(periodeDiffusion({ dateDebut: '2026-10-15T00:00:00.000Z', dateFin: null })).toBe('À partir du 15/10/2026');
    expect(periodeDiffusion({ dateDebut: null, dateFin: '2026-10-31T23:59:59.999Z' })).toBe('Jusqu’au 31/10/2026');
    expect(periodeDiffusion({ dateDebut: null, dateFin: null })).toBe('Sans limite de date');
  });

  it('accepte les images et les vidéos MP4 dans la limite de 10 Mo', () => {
    expect(problemeMedia({ type: 'image/png', size: 200_000 })).toBeNull();
    expect(problemeMedia({ type: 'video/mp4', size: TAILLE_MAX_MEDIA })).toBeNull();
  });

  it('refuse un format inconnu et un fichier trop lourd, en le disant', () => {
    expect(problemeMedia({ type: 'application/pdf', size: 1000 })).toMatch(/Format non pris en charge/);
    expect(problemeMedia({ type: 'video/mp4', size: 18 * 1024 * 1024 })).toMatch(/18,0 Mo.*10 Mo/);
  });

  it('a un libellé pour chaque état de diffusion', () => {
    for (const statut of ['en_ligne', 'programmee', 'expiree', 'brouillon', 'sans_media'] as const) {
      expect(STATUTS_DIFFUSION[statut].label).toBeTruthy();
      expect(STATUTS_DIFFUSION[statut].help).toBeTruthy();
    }
  });
});
