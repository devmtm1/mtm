import { natureFichier } from './documents-utils';

describe('documents-utils', () => {
  it('reconnaît la nature du fichier', () => {
    expect(natureFichier('https://x/y/contrat.PDF?v=2')).toBe('pdf');
    expect(natureFichier('https://x/photo.jpeg')).toBe('image');
    expect(natureFichier('https://x/liste.xlsx')).toBe('tableur');
    expect(natureFichier('https://x/note.docx')).toBe('texte');
    expect(natureFichier('https://x/fichier')).toBe('autre');
    expect(natureFichier(null)).toBe('autre');
  });
});
