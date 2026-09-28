import { describe, expect, it } from 'vitest';
import {
  DECISIONS,
  ETAPES_TERMINALES,
  MISSION_ETAPES,
  estEnRetard,
  label,
  nomPersonne,
  pillClass,
} from './mission-status';

describe('libellés des missions de vérification', () => {
  it('couvre les étapes des trois parcours et les deux fins communes', () => {
    const attendues = [
      // Vérification : les cinq étapes de la section 14 du cahier des charges.
      'demande',
      'faisabilite',
      'verification_physique',
      'verification_administrative',
      'rapport',
      // Démarche déposée pour le compte du client.
      'constitution_dossier',
      'depot',
      'suivi_administration',
      'retrait',
      // Prestation technique (plans).
      'devis',
      'production',
      'livraison',
      // Fins de parcours, communes aux trois.
      'cloturee',
      'abandonnee',
    ];

    // Chaque étape servie par l'API doit avoir son libellé : sans cela, un
    // dépôt de bail afficherait « suivi_administration » au collaborateur.
    expect(Object.keys(MISSION_ETAPES)).toEqual(attendues);
    expect(ETAPES_TERMINALES).toEqual(['cloturee', 'abandonnee']);
  });

  it('distingue visuellement une décision favorable d’un refus', () => {
    expect(pillClass(DECISIONS, 'favorable')).toContain('success');
    expect(pillClass(DECISIONS, 'defavorable')).toContain('danger');
    expect(pillClass(DECISIONS, 'a_completer')).toContain('warning');
  });

  it('affiche la valeur brute quand elle sort du référentiel', () => {
    expect(label(MISSION_ETAPES, 'etape_inconnue')).toBe('etape_inconnue');
    expect(label(MISSION_ETAPES, null)).toBe('—');
  });

  it('ne signale en retard qu’une mission encore en cours', () => {
    const hier = new Date(Date.now() - 86_400_000).toISOString();
    const demain = new Date(Date.now() + 86_400_000).toISOString();

    expect(estEnRetard({ dateEcheance: hier, statut: 'rapport' })).toBe(true);
    expect(estEnRetard({ dateEcheance: demain, statut: 'rapport' })).toBe(false);
    // Une mission terminée n'est jamais « en retard », même hors délai.
    expect(estEnRetard({ dateEcheance: hier, statut: 'cloturee' })).toBe(false);
    expect(estEnRetard({ dateEcheance: null, statut: 'rapport' })).toBe(false);
  });

  it('affiche un tiret quand la mission n’a pas de responsable', () => {
    expect(nomPersonne(null)).toBe('—');
    expect(nomPersonne({ firstName: 'Moussa', lastName: 'Fall' })).toBe('Moussa Fall');
  });
});
