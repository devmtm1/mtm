import { describe, expect, it } from 'vitest';
import { construireFrise, echeanceAMettreEnAvant } from './clientFrise';

const MAINTENANT = new Date('2026-10-06T10:00:00Z');
const e = (numero: number, dateEcheance: string, montantPrevu: number, montantPaye = 0, statut = 'planifiee') => ({
  numero,
  dateEcheance,
  montantPrevu,
  montantPaye,
  statut,
});

describe('construireFrise', () => {
  it('distingue réglée, en retard, prochaine et suivantes', () => {
    const frise = construireFrise(
      [
        e(1, '2026-08-01', 1000, 1000, 'payee'),
        e(2, '2026-09-01', 1000, 0, 'en_retard'),
        e(3, '2026-10-30', 1000),
        e(4, '2026-11-30', 1000),
      ],
      MAINTENANT,
    );
    expect(frise.map((etape) => etape.etat)).toEqual(['reglee', 'retard', 'prochaine', 'plus-tard']);
    expect(frise[1].joursRetard).toBe(35);
  });

  it('une seule échéance est « la prochaine »', () => {
    const frise = construireFrise([e(1, '2026-10-20', 500), e(2, '2026-11-20', 500), e(3, '2026-12-20', 500)], MAINTENANT);
    expect(frise.filter((etape) => etape.etat === 'prochaine')).toHaveLength(1);
    expect(frise[0].etat).toBe('prochaine');
  });

  it('le reste d’une échéance partielle est son montant moins ce qui est payé', () => {
    const [etape] = construireFrise([e(1, '2026-10-20', 1000, 400, 'partielle')], MAINTENANT);
    expect(etape).toMatchObject({ etat: 'prochaine', reste: 600 });
  });

  it('une échéance du jour n’est pas en retard', () => {
    const [etape] = construireFrise([e(1, '2026-10-06', 500)], MAINTENANT);
    expect(etape.etat).toBe('prochaine');
  });

  it('trie par numéro même si l’API les renvoie dans le désordre', () => {
    const frise = construireFrise([e(2, '2026-11-20', 500), e(1, '2026-10-20', 500)], MAINTENANT);
    expect(frise.map((etape) => etape.numero)).toEqual([1, 2]);
  });
});

describe('echeanceAMettreEnAvant', () => {
  it('prend le retard avant la prochaine', () => {
    const frise = construireFrise([e(1, '2026-10-20', 500), e(2, '2026-09-20', 500)], MAINTENANT);
    expect(echeanceAMettreEnAvant(frise)).toMatchObject({ numero: 2, etat: 'retard' });
  });

  it('ne retourne rien quand tout est réglé', () => {
    expect(echeanceAMettreEnAvant(construireFrise([e(1, '2026-08-01', 500, 500, 'payee')], MAINTENANT))).toBeNull();
  });
});
