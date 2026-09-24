import { describe, expect, it } from 'vitest';
import {
  bailStatus,
  cautionStatus,
  demandeType,
  incidentType,
  loyerEcheanceStatus,
  mouvementCautionType,
  paiementStatus,
  signalementType,
  situationPaiement,
} from './labels';

/**
 * Libellés de la gestion locative (J2.1) affichés dans l'espace locataire et
 * l'espace propriétaire : le locataire lit « Impayée », jamais `impayee`.
 */
describe('libellés de la gestion locative', () => {
  it('traduit les statuts d’échéance, y compris ceux annulés à la sortie', () => {
    expect(loyerEcheanceStatus('impayee').label).toBe('Impayée');
    expect(loyerEcheanceStatus('payee').tone).toBe('success');
  });

  it('traduit le cycle de vie du bail', () => {
    expect(bailStatus('preavis').label).toBe('Préavis en cours');
    expect(bailStatus('resilie_sans_preavis').label).toBe('Résilié');
  });

  it('distingue retard simple et impayé prolongé (section 15)', () => {
    expect(situationPaiement('a_jour').tone).toBe('success');
    expect(situationPaiement('retard').label).toBe('Retard');
    expect(situationPaiement('impaye_prolonge').label).toBe('Impayé prolongé');
  });

  it('dit au locataire qu’un règlement reste à valider (section 24)', () => {
    expect(paiementStatus('en_attente').label).toBe('En cours de validation');
    expect(paiementStatus('valide').tone).toBe('success');
  });

  it('traduit les statuts et les mouvements de caution', () => {
    expect(cautionStatus('partiellement_versee').label).toBe('Partiellement versée');
    expect(cautionStatus('remboursee').tone).toBe('success');
    expect(mouvementCautionType('remboursement')).toBe('Remboursement');
  });

  it('sépare les types d’incident de ceux des demandes (sections 4 et 15)', () => {
    expect(signalementType('incident', 'plomberie')).toBe('Plomberie');
    expect(signalementType('demande', 'attestation')).toBe('Attestation');
    expect(demandeType('renouvellement_bail')).toBe('Renouvellement du bail');
    expect(incidentType('electricite')).toBe('Électricité');
  });

  it('reste lisible face à un code inconnu plutôt que d’afficher le code brut', () => {
    expect(situationPaiement('statut_inedit').label).toBe('Statut inedit');
    expect(mouvementCautionType('saisie_conservatoire')).toBe('Saisie conservatoire');
  });
});
