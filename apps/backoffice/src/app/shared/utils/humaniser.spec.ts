import { codeDepuisNom, humaniserCode } from './humaniser';

describe('humaniserCode', () => {
  it('lit un code comme du texte', () => {
    expect(humaniserCode('attente_notaire')).toBe('Attente notaire');
    expect(humaniserCode('solde')).toBe('Solde');
  });
});

describe('codeDepuisNom', () => {
  it('fabrique un code valide pour l’API', () => {
    expect(codeDepuisNom('Attente du notaire')).toBe('attente_du_notaire');
    expect(codeDepuisNom('  Étape n°2 — Révision ! ')).toBe('etape_n_2_revision');
    expect(codeDepuisNom('x'.repeat(60))).toHaveLength(40);
  });

  it('respecte le format attendu par le serveur', () => {
    for (const nom of ['Attente du notaire', 'Révision finale', 'Dossier à compléter']) {
      expect(codeDepuisNom(nom)).toMatch(/^[a-z][a-z0-9_]{1,39}$/);
    }
  });
});
