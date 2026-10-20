import { peutAutoriserMontant } from '../../core/services/api/tresorerie-api.service';
import { NIVEAUX_VALIDATION, aujourdhuiIso, dateFr, libelleMode, nomPersonne } from './finances-outils';

describe('aides de trésorerie', () => {
  it('nomme les moyens de paiement, Wave et Orange Money distingués', () => {
    expect(libelleMode('wave')).toBe('Wave');
    expect(libelleMode('orange_money')).toBe('Orange Money');
    expect(libelleMode('especes')).toBe('Espèces');
    expect(libelleMode('mode_inconnu')).toBe('mode inconnu');
    expect(libelleMode(null)).toBe('—');
  });

  it('donne le jour local au format AAAA-MM-JJ', () => {
    expect(aujourdhuiIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formate une date sans décalage de fuseau', () => {
    expect(dateFr('2026-10-19')).toBe('19/10/2026');
    expect(dateFr(null)).toBe('—');
  });

  it('compose un nom, et tient bon sans personne', () => {
    expect(nomPersonne({ firstName: 'Awa', lastName: 'Sy' })).toBe('Awa Sy');
    expect(nomPersonne(null)).toBe('—');
  });

  it('dit à quel niveau d’autorisation correspond chaque seuil', () => {
    expect(NIVEAUX_VALIDATION[0].court).toBe('Comptable');
    expect(NIVEAUX_VALIDATION[3].ton).toBe('red');
  });
});

describe('pouvoir d’autorisation', () => {
  it('le droit complet autorise toute somme', () => {
    expect(peutAutoriserMontant({ complet: true, plafondDelegation: 0 }, 900_000)).toBe(true);
  });

  it('une délégation autorise jusqu’à son plafond, pas au-delà', () => {
    const delegue = { complet: false, plafondDelegation: 150_000 };
    expect(peutAutoriserMontant(delegue, 150_000)).toBe(true);
    expect(peutAutoriserMontant(delegue, 150_001)).toBe(false);
  });

  it('sans droit ni délégation, on n’autorise rien', () => {
    expect(peutAutoriserMontant({ complet: false, plafondDelegation: 0 }, 1)).toBe(false);
    expect(peutAutoriserMontant(null, 1)).toBe(false);
  });
});
