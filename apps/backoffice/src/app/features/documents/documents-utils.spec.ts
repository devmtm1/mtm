import { natureFichier, pagesAffichees } from './documents-utils';

describe('documents-utils', () => {
  it('reconnaît la nature du fichier', () => {
    expect(natureFichier('https://x/y/contrat.PDF?v=2')).toBe('pdf');
    expect(natureFichier('https://x/photo.jpeg')).toBe('image');
    expect(natureFichier('https://x/liste.xlsx')).toBe('tableur');
    expect(natureFichier('https://x/note.docx')).toBe('texte');
    expect(natureFichier('https://x/fichier')).toBe('autre');
    expect(natureFichier(null)).toBe('autre');
  });

  it('affiche toutes les pages quand elles sont peu nombreuses', () => {
    expect(pagesAffichees(1, 1)).toEqual([1]);
    expect(pagesAffichees(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('abrège les longues séries avec des points de suspension', () => {
    expect(pagesAffichees(1, 20)).toEqual([1, 2, 3, 4, null, 20]);
    expect(pagesAffichees(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(pagesAffichees(20, 20)).toEqual([1, null, 17, 18, 19, 20]);
    expect(pagesAffichees(4, 20)).toEqual([1, 2, 3, 4, 5, null, 20]);
  });
});
