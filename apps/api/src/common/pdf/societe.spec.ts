import { PdfDocument } from './pdf-document';
import {
  drawEntete,
  drawPied,
  ligneLegale,
  logoDe,
  type Societe,
} from './societe';

const BASE: Societe = {
  name: 'MTM Immobilier',
  tagline: 'Achat · Vente',
  adresse: 'Dakar',
  telephone: '+221 77 000 00 00',
  email: 'contact@mtm.sn',
};

describe('societe', () => {
  it('compose la ligne légale avec dénomination, forme, capital, NINEA et RCCM', () => {
    expect(
      ligneLegale({
        ...BASE,
        raisonSociale: 'MTM Immobilier SARL',
        formeJuridique: 'SARL',
        capital: '1 000 000 FCFA',
        ninea: '0098765',
        rccm: 'SN DKR 2024 B 1',
      }),
    ).toBe(
      'MTM Immobilier SARL · SARL au capital de 1 000 000 FCFA · NINEA 0098765 · RCCM SN DKR 2024 B 1',
    );
  });

  it('n’invente rien quand les mentions ne sont pas renseignées', () => {
    expect(ligneLegale(BASE)).toBeNull();
    expect(ligneLegale({ ...BASE, ninea: '123' })).toContain('NINEA 123');
  });

  it('retombe sur le logo MTM par défaut', () => {
    expect(logoDe(BASE)).not.toBeNull();
    expect(logoDe({ logo: null })).not.toBeNull();
  });

  it('dessine en-tête et pied avec le logo et les mentions, le logo une seule fois dans le fichier', () => {
    const pdf = new PdfDocument('Essai');
    for (let i = 0; i < 3; i += 1) {
      const page = pdf.addPage();
      drawEntete(page, { ...BASE, ninea: '0098765' });
      drawPied(page, { ...BASE, ninea: '0098765' }, 'Document essai');
    }
    const texte = pdf.build().toString('latin1');
    expect(texte.match(/\/Subtype \/Image/g)).toHaveLength(1);
    expect(texte).toContain('NINEA 0098765');
  });
});
