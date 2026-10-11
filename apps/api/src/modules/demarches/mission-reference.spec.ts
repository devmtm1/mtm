import {
  FORMAT_FACTURE_DEFAUT,
  FORMAT_MISSION_DEFAUT,
  construireReference,
  formatReferenceValide,
  rangDeReference,
} from './mission-reference';

const vf2026 = { code: 'VF', annee: 2026 };

describe('mission-reference', () => {
  it('construit la référence du DG : MTM-VF-001/2026', () => {
    expect(construireReference(FORMAT_MISSION_DEFAUT, vf2026, 1)).toBe(
      'MTM-VF-001/2026',
    );
    expect(construireReference(FORMAT_FACTURE_DEFAUT, vf2026, 1)).toBe(
      'MTM-FAC-VF-001/2026',
    );
  });

  it('respecte la largeur du rang et ne tronque jamais un grand rang', () => {
    expect(construireReference('M-{seq:5}', vf2026, 42)).toBe('M-00042');
    expect(construireReference('M-{seq:2}', vf2026, 1234)).toBe('M-1234');
    expect(construireReference('{code}/{annee}/{seq}', vf2026, 7)).toBe(
      'VF/2026/007',
    );
  });

  it('retrouve le rang des références déjà émises, et ignore les autres', () => {
    const lire = (r: string) =>
      rangDeReference(FORMAT_MISSION_DEFAUT, vf2026, r);
    expect(lire('MTM-VF-012/2026')).toBe(12);
    // Autre famille, autre année, ancien format : ne comptent pas.
    expect(lire('MTM-DA-012/2026')).toBeNull();
    expect(lire('MTM-VF-012/2025')).toBeNull();
    expect(lire('V-2026-0007')).toBeNull();
    expect(lire('MTM-VF-abc/2026')).toBeNull();
  });

  it('n’accepte qu’un format avec un seul rang et des jetons connus', () => {
    expect(formatReferenceValide(FORMAT_MISSION_DEFAUT)).toBe(true);
    expect(formatReferenceValide('FAC-{seq}')).toBe(true);
    expect(formatReferenceValide('MTM-{code}/{annee}')).toBe(false);
    expect(formatReferenceValide('{seq}-{seq}')).toBe(false);
    expect(formatReferenceValide('MTM-{inconnu}-{seq}')).toBe(false);
    expect(formatReferenceValide('')).toBe(false);
    expect(formatReferenceValide(42)).toBe(false);
  });
});
