import {
  estConflitDeReference,
  rangDeReference,
  referenceSuivante,
} from './reference';

describe('matricules automatiques', () => {
  it('commence à 1 quand rien n’existe sous le préfixe', () => {
    expect(referenceSuivante('T-2026-', [])).toBe('T-2026-0001');
  });

  it('prend le plus grand rang plus un, même après des suppressions', () => {
    expect(
      referenceSuivante('T-2026-', [
        'T-2026-0001',
        'T-2026-0014',
        'T-2026-0003',
      ]),
    ).toBe('T-2026-0015');
  });

  it('lit aussi les anciens matricules à trois chiffres saisis à la main', () => {
    expect(referenceSuivante('T-2026-', ['T-2026-014'])).toBe('T-2026-0015');
  });

  it('ignore les matricules d’une autre année ou d’un autre format', () => {
    expect(
      referenceSuivante('T-2026-', [
        'T-2025-0099',
        'TERRAIN-DIAMNIADIO',
        'T-2026-0002',
      ]),
    ).toBe('T-2026-0003');
    expect(rangDeReference('T-2026-', 'T-2026-12A')).toBeNull();
  });

  it('reconnaît le conflit de matricule renvoyé par la base', () => {
    expect(
      estConflitDeReference({
        code: 'P2002',
        meta: { target: ['referenceInterne'] },
      }),
    ).toBe(true);
    expect(
      estConflitDeReference({
        code: 'P2002',
        meta: { target: 'terrains_referenceInterne_key' },
      }),
    ).toBe(true);
    expect(
      estConflitDeReference({ code: 'P2002', meta: { target: ['email'] } }),
    ).toBe(false);
    expect(estConflitDeReference(new Error('autre'))).toBe(false);
  });
});
