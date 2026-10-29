import { describe, expect, it } from 'vitest';
import { TYPES_PIECE, erreurFichierPiece, libellePiece } from './piece-identite';

const fichier = (nom: string, type: string, taille = 1000) =>
  new File([new Uint8Array(taille)], nom, { type });

describe('pièce d’identité', () => {
  it('utilise le même vocabulaire que les fiches prospects et l’API', () => {
    expect(TYPES_PIECE.map((type) => type.valeur)).toEqual([
      'cni_cedeao',
      'passeport',
      'titre_sejour',
      'permis',
      'autre',
    ]);
  });

  it('donne le libellé d’un type, et rien pour un type inconnu ou absent', () => {
    expect(libellePiece('cni_cedeao')).toBe('Carte d’identité CEDEAO');
    expect(libellePiece('badge')).toBe('');
    expect(libellePiece(null)).toBe('');
  });

  it('accepte un PDF raisonnable', () => {
    expect(erreurFichierPiece(fichier('cni.pdf', 'application/pdf'))).toBeNull();
  });

  it('refuse une image ou un document Word', () => {
    expect(erreurFichierPiece(fichier('cni.png', 'image/png'))).toMatch(/PDF/);
    expect(erreurFichierPiece(fichier('cni.docx', 'application/msword'))).toMatch(/PDF/);
  });

  it('refuse un PDF de plus de 10 Mo', () => {
    expect(erreurFichierPiece(fichier('gros.pdf', 'application/pdf', 11 * 1024 * 1024))).toMatch(
      /10 Mo/,
    );
  });
});
