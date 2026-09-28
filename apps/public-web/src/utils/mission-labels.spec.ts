import { describe, expect, it } from 'vitest';
import {
  MISSION_STATUS,
  missionDecision,
  missionDocumentType,
  missionStatus,
  missionType,
} from './labels';

describe('libellés client des prestations foncières', () => {
  it('traduit chaque étape en langage client', () => {
    // Le client lit « Visite sur place », jamais `verification_physique`.
    expect(missionStatus('verification_physique').label).toBe('Visite sur place');
    expect(missionStatus('rapport').label).toBe('Rapport en cours');
    expect(missionStatus('cloturee').tone).toBe('success');
  });

  it('couvre les étapes des trois parcours servis par l’API', () => {
    // Une étape sans libellé s'afficherait telle quelle dans l'espace client :
    // « suivi_administration » au lieu de « Suivi en cours ». On vérifie donc
    // la couverture réelle plutôt qu'un simple décompte, qui ne dirait pas
    // laquelle manque.
    const etapes = [
      // Vérification foncière
      'demande',
      'faisabilite',
      'verification_physique',
      'verification_administrative',
      'rapport',
      // Démarche déposée pour le compte du client
      'constitution_dossier',
      'depot',
      'suivi_administration',
      'retrait',
      // Prestation technique (plans)
      'devis',
      'production',
      'livraison',
      // Fins de parcours
      'cloturee',
      'abandonnee',
    ];

    expect(Object.keys(MISSION_STATUS).sort()).toEqual([...etapes].sort());
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
