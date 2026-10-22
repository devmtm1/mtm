import { describe, expect, it } from 'vitest';
import {
  ajouterJours,
  aujourdhui,
  estimerSejour,
  formatPeriode,
  nombreNuits,
  periodeEnConflit,
  verifierDates,
} from './sejour';

const regles = { nuitsMinimum: 2, capaciteVoyageurs: 4 };
const maintenant = new Date('2026-10-12T10:00:00Z');
const prises = [{ debut: '2026-10-20', fin: '2026-10-23' }];

describe('séjour à la nuit — calculs', () => {
  it('compte les nuits et décale les jours sans fuseau horaire', () => {
    expect(nombreNuits('2026-10-15', '2026-10-18')).toBe(3);
    expect(nombreNuits('2026-10-30', '2026-11-02')).toBe(3);
    expect(nombreNuits('', '2026-10-18')).toBe(0);
    expect(ajouterJours('2026-10-30', 3)).toBe('2026-11-02');
    expect(aujourdhui(maintenant)).toBe('2026-10-12');
  });

  it('détecte une période prise, mais accepte un départ et une arrivée le même jour', () => {
    expect(periodeEnConflit(prises, '2026-10-21', '2026-10-25')).toEqual(prises[0]);
    expect(periodeEnConflit(prises, '2026-10-18', '2026-10-21')).toEqual(prises[0]);
    expect(periodeEnConflit(prises, '2026-10-23', '2026-10-26')).toBeNull();
    expect(periodeEnConflit(prises, '2026-10-17', '2026-10-20')).toBeNull();
  });

  it('dit pourquoi des dates ne conviennent pas, et se tait quand elles conviennent', () => {
    const verifier = (arrivee: string, depart: string, voyageurs = 2) =>
      verifierDates(regles, { arrivee, depart, voyageurs }, prises, maintenant);
    expect(verifier('2026-10-15', '2026-10-18')).toBeNull();
    expect(verifier('', '')).toBeNull();
    expect(verifier('2026-10-18', '2026-10-15')).toMatch(/après la date d’arrivée/);
    expect(verifier('2026-10-10', '2026-10-14')).toMatch(/déjà passée/);
    expect(verifier('2026-10-15', '2026-10-16')).toMatch(/2 nuits minimum/);
    expect(verifier('2026-10-15', '2027-03-01')).toMatch(/longue durée/);
    expect(verifier('2026-10-15', '2026-10-18', 6)).toMatch(/4 personnes au plus/);
    expect(verifier('2026-10-19', '2026-10-22')).toMatch(/réservé du 20\/10\/2026 au 23\/10\/2026/);
  });

  it('estime le séjour : nuits × tarif + ménage', () => {
    expect(estimerSejour({ prixNuit: 45000, fraisMenage: 10000 }, 3)).toEqual({
      nuits: 3,
      prixNuit: 45000,
      hebergement: 135000,
      menage: 10000,
      total: 145000,
    });
    expect(estimerSejour({ prixNuit: 45000, fraisMenage: null }, 2)?.total).toBe(90000);
    expect(estimerSejour({ prixNuit: null, fraisMenage: null }, 2)).toBeNull();
    expect(estimerSejour({ prixNuit: 45000, fraisMenage: 0 }, 0)).toBeNull();
  });

  it('écrit une période lisible', () => {
    expect(formatPeriode({ debut: '2026-10-15', fin: '2026-10-18' })).toMatch(/15 oct\.? → 18 oct\.? 2026/);
  });
});
