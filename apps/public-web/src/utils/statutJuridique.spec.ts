import { describe, expect, it } from 'vitest';
import { niveauStatutJuridique } from './statutJuridique';

describe('niveauStatutJuridique', () => {
  it('le titre foncier est le plus solide, quelle que soit la casse', () => {
    expect(niveauStatutJuridique('Titre foncier')).toBe('solide');
    expect(niveauStatutJuridique('  titre foncier ')).toBe('solide');
  });

  it('les autres titres reconnus restent standard', () => {
    for (const statut of ['Bail', 'Délibération', 'Notification de bail', 'Attribution']) {
      expect(niveauStatutJuridique(statut)).toBe('standard');
    }
  });

  it('une situation en cours de régularisation ou de morcellement demande attention', () => {
    expect(niveauStatutJuridique('Régularisation en cours')).toBe('attention');
    expect(niveauStatutJuridique('Morcellement')).toBe('attention');
  });

  it('un statut absent n’est ni mis en valeur ni alarmant', () => {
    expect(niveauStatutJuridique(null)).toBe('standard');
    expect(niveauStatutJuridique('')).toBe('standard');
  });
});
