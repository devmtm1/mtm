import { parseDurationToMs } from './duration.util';

describe('parseDurationToMs', () => {
  it('convertit les secondes', () => {
    expect(parseDurationToMs('30s')).toBe(30_000);
  });

  it('convertit les minutes', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60_000);
  });

  it('convertit les heures', () => {
    expect(parseDurationToMs('2h')).toBe(2 * 60 * 60_000);
  });

  it('convertit les jours', () => {
    expect(parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60_000);
  });

  it('rejette un format invalide', () => {
    expect(() => parseDurationToMs('abc')).toThrow();
  });

  it('rejette une chaîne vide', () => {
    expect(() => parseDurationToMs('')).toThrow();
  });
});
