import { describe, expect, it } from 'vitest';
import {
  BAIL_STATUTS,
  BAIL_STATUTS_TERMINES,
  ECHEANCE_STATUTS,
  estARelancer,
  label,
  nomPersonne,
  pillClass,
  simpleLabel,
  TYPES_BIEN,
} from './locatif-status';

describe('libellés de la gestion locative', () => {
  it('couvre les statuts de bail de la section 15 (actif, préavis, fins)', () => {
    expect(Object.keys(BAIL_STATUTS)).toEqual([
      'actif',
      'preavis',
      'termine',
      'resilie_sans_preavis',
    ]);
    expect(BAIL_STATUTS_TERMINES).toEqual(['termine', 'resilie_sans_preavis']);
  });

  it('distingue visuellement une échéance payée d’une échéance impayée', () => {
    expect(pillClass(ECHEANCE_STATUTS, 'payee')).toContain('success');
    expect(pillClass(ECHEANCE_STATUTS, 'impayee')).toContain('danger');
    expect(pillClass(ECHEANCE_STATUTS, 'en_retard')).toContain('accent');
  });

  it('ne propose une relance que pour une échéance en retard ou impayée', () => {
    expect(estARelancer('en_retard')).toBe(true);
    expect(estARelancer('impayee')).toBe(true);
    expect(estARelancer('partielle')).toBe(false);
    expect(estARelancer('payee')).toBe(false);
    expect(estARelancer('a_venir')).toBe(false);
  });

  it('affiche la valeur brute quand elle sort du référentiel', () => {
    expect(label(BAIL_STATUTS, 'statut_inconnu')).toBe('statut_inconnu');
    expect(label(BAIL_STATUTS, null)).toBe('—');
    expect(simpleLabel(TYPES_BIEN, 'yacht')).toBe('yacht');
  });

  it('affiche un tiret quand le bien n’a pas de responsable', () => {
    expect(nomPersonne(null)).toBe('—');
    expect(nomPersonne({ firstName: 'Fatou', lastName: 'Sarr' })).toBe('Fatou Sarr');
  });
});
