import { describe, expect, it } from 'vitest';
import {
  MISSION_STATUS,
  missionDecision,
  missionDocumentType,
  missionStatus,
  missionType,
} from './labels';

describe('libellés client des vérifications foncières', () => {
  it('traduit chaque étape en langage client', () => {
    // Le client lit « Visite sur place », jamais `verification_physique`.
    expect(missionStatus('verification_physique').label).toBe('Visite sur place');
    expect(missionStatus('rapport').label).toBe('Rapport en cours');
    expect(missionStatus('cloturee').tone).toBe('success');
    expect(Object.keys(MISSION_STATUS)).toHaveLength(7);
  });

  it('donne à la conclusion un ton qui se lit d’un coup d’œil', () => {
    expect(missionDecision('favorable').tone).toBe('success');
    expect(missionDecision('defavorable').tone).toBe('accent');
    expect(missionDecision('a_completer').tone).toBe('warning');
  });

  it('retombe sur une forme lisible pour un code inconnu', () => {
    expect(missionStatus('etape_inconnue').label).toBe('Etape inconnue');
    expect(missionType('mission_speciale')).toBe('Mission speciale');
    expect(missionDocumentType('rapport')).toBe('Rapport de vérification');
  });
});
