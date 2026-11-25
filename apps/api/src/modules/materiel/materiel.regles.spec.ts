import {
  aujourdhui,
  formaterNumero,
  garantieActive,
  lireNumero,
} from './materiel.regles';

describe('numéro d’autocollant', () => {
  it('s’écrit « MTM » suivi de quatre chiffres', () => {
    expect(formaterNumero(3)).toBe('MTM 0003');
    expect(formaterNumero(12)).toBe('MTM 0012');
    expect(formaterNumero(12345)).toBe('MTM 12345');
  });

  it.each(['3', '0003', 'MTM 0003', 'mtm-3', ' MTM_0003 ', 'MTM0003'])(
    'lit « %s » comme le numéro 3',
    (saisie) => {
      expect(lireNumero(saisie)).toBe(3);
    },
  );

  it.each(['', 'abc', '0', 'MTM', '3 chaises', '-4', '1.5'])(
    'ne prend pas « %s » pour un numéro',
    (saisie) => {
      expect(lireNumero(saisie)).toBeNull();
    },
  );
});

describe('garantie', () => {
  const maintenant = new Date('2026-11-24T10:00:00Z');
  it('court jusqu’à la fin du dernier jour inclus', () => {
    expect(garantieActive(new Date('2026-11-24'), maintenant)).toBe(true);
    expect(garantieActive(new Date('2026-11-23'), maintenant)).toBe(false);
    expect(garantieActive(null, maintenant)).toBe(false);
  });
  it('compare des jours, pas des heures', () => {
    expect(aujourdhui(maintenant).toISOString()).toBe(
      '2026-11-24T00:00:00.000Z',
    );
  });
});
