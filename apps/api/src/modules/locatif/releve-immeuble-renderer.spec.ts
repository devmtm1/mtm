import { calculerReleveImmeuble } from './releve-immeuble.helper';
import { renderReleveImmeuble } from './releve-immeuble-renderer';

const societe = {
  name: 'MTM Immobilier',
  tagline: 'Construire vos projets',
  adresse: 'Dakar, Sénégal',
  telephone: '+221 78 366 26 51',
  email: 'contact@mtm-immobilier.sn',
};

const calcul = (nbCharges: number, nbLogements = 3) =>
  calculerReleveImmeuble(
    Array.from({ length: nbLogements }, (_, i) => ({
      id: `l${i}`,
      libelle: `Logement A${i + 1}`,
      locataire: i === 1 ? null : `Locataire ${i}`,
      loyerMensuel: 150000 + i * 30000,
      superficie: 40 + i * 10,
      du: 450000,
      encaisse: i === 0 ? 450000 : 150000,
    })),
    Array.from({ length: nbCharges }, (_, i) => ({
      id: `c${i}`,
      libelle: `Charge commune numéro ${i + 1}`,
      montant: 20000 + i * 1000,
      dateCharge: new Date('2026-10-01T00:00:00Z'),
      repartition: (['egale', 'surface', 'loyer', 'globale'] as const)[i % 4],
    })),
  );

const donnees = (nbCharges: number, nbLogements?: number) => ({
  ...calcul(nbCharges, nbLogements),
  reference: 'R-IM-2026-0001-202610-1',
  issuedAt: new Date('2026-10-28T10:00:00Z'),
  company: societe,
  proprietaire: { nom: 'Cheikh Mbaye', email: 'cheikh.mbaye@exemple.test' },
  immeuble: {
    nom: 'Villa Fall',
    typeLibelle: 'Villa',
    adresse: 'Sacré-Cœur 3',
    commune: 'Dakar',
    referenceInterne: 'IM-2026-0001',
  },
  periodeDebut: new Date('2026-01-01T00:00:00Z'),
  periodeFin: new Date('2026-10-01T00:00:00Z'),
});

const pages = (buffer: Buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

describe('renderReleveImmeuble', () => {
  it('produit un PDF valide', () => {
    const pdf = renderReleveImmeuble(donnees(3));

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1500);
  });

  it('tient sur une page pour une villa courante', () => {
    expect(pages(renderReleveImmeuble(donnees(3)))).toBe(1);
  });

  it('passe à une page suivante quand les charges sont nombreuses, sans planter', () => {
    expect(pages(renderReleveImmeuble(donnees(40, 6)))).toBeGreaterThan(1);
  });

  it('accepte une propriété sans aucune charge', () => {
    expect(renderReleveImmeuble(donnees(0)).length).toBeGreaterThan(1000);
  });
});
