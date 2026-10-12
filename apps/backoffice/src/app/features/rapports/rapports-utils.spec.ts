import { alignement, formaterCellule, nomFichierRapport } from './rapports-utils';

describe('cellules de rapport', () => {
  it('formate selon le type de colonne', () => {
    expect(formaterCellule(1250000, 'montant')).toMatch(/^1\s250\s000$/);
    expect(formaterCellule(42, 'nombre')).toBe('42');
    expect(formaterCellule(12.5, 'pourcentage')).toMatch(/^12,5\s%$/);
    expect(formaterCellule('2026-10-05T10:00:00Z', 'date')).toBe('05/10/2026');
    expect(formaterCellule('Libellé', 'texte')).toBe('Libellé');
  });

  it('laisse vide ce qui est absent', () => {
    expect(formaterCellule(null, 'montant')).toBe('');
    expect(formaterCellule(undefined, 'texte')).toBe('');
    expect(formaterCellule('', 'nombre')).toBe('');
  });

  it('garde un texte de date illisible tel quel', () => {
    expect(formaterCellule('bientôt', 'date')).toBe('bientôt');
  });

  it('aligne les chiffres à droite et le reste à gauche', () => {
    expect(alignement('montant')).toBe('droite');
    expect(alignement('pourcentage')).toBe('droite');
    expect(alignement('texte')).toBe('gauche');
    expect(alignement('date')).toBe('gauche');
  });

  it('nomme le fichier comme le serveur', () => {
    expect(nomFichierRapport('Ventes par période', '2026-10-01', '2026-10-31', 'pdf')).toBe('ventes-par-periode_2026-10-01_2026-10-31.pdf');
    expect(nomFichierRapport('Terrains : état', null, null, 'xlsx')).toBe('terrains-etat.xlsx');
  });
});
