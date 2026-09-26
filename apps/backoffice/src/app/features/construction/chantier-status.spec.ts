import { describe, expect, it } from 'vitest';
import {
  POSTES_BUDGET,
  SITUATIONS_ALERTE,
  STATUTS_CHANTIER,
  STATUTS_DEPENSE,
  STATUTS_JALON,
  STATUTS_TERMINES,
  estEnRetard,
  label,
  montant,
  nomPersonne,
  pillClass,
  tonAvancement,
} from './chantier-status';

describe('libellés du suivi de chantier', () => {
  it('couvre le cycle de vie complet d’un chantier', () => {
    expect(Object.keys(STATUTS_CHANTIER)).toEqual([
      'prepare',
      'en_cours',
      'suspendu',
      'receptionne',
      'cloture',
      'abandonne',
    ]);
    expect(STATUTS_TERMINES).toEqual(['receptionne', 'cloture', 'abandonne']);
  });

  it('couvre les cinq états d’un jalon de planning', () => {
    expect(Object.keys(STATUTS_JALON)).toEqual([
      'a_venir',
      'en_cours',
      'termine',
      'bloque',
      'annule',
    ]);
  });

  it('couvre les six postes de budget de la section 16', () => {
    expect(Object.keys(POSTES_BUDGET)).toEqual([
      'materiaux',
      'main_oeuvre',
      'equipement',
      'etudes',
      'administratif',
      'divers',
    ]);
  });

  it('distingue visuellement un chantier sain d’un chantier qui dérape', () => {
    expect(pillClass(SITUATIONS_ALERTE, 'aucune')).toContain('success');
    expect(pillClass(SITUATIONS_ALERTE, 'retard')).toContain('warning');
    expect(pillClass(SITUATIONS_ALERTE, 'depassement_budget')).toContain(
      'warning',
    );
    // Les deux à la fois : c'est le seul cas franchement rouge.
    expect(pillClass(SITUATIONS_ALERTE, 'retard_et_depassement')).toContain(
      'danger',
    );
  });

  it('sépare la dépense à contrôler de la dépense validée', () => {
    expect(pillClass(STATUTS_DEPENSE, 'en_attente')).toContain('warning');
    expect(pillClass(STATUTS_DEPENSE, 'valide')).toContain('success');
    expect(pillClass(STATUTS_DEPENSE, 'rejete')).toContain('danger');
  });

  it('affiche tel quel un code ajouté dans les Paramètres', () => {
    // La section 25 permet d'étendre les référentiels sans développement :
    // un code inconnu doit s'afficher, pas casser l'écran.
    expect(label(STATUTS_CHANTIER, 'gros_oeuvre_seul')).toBe('gros_oeuvre_seul');
    expect(pillClass(STATUTS_CHANTIER, 'gros_oeuvre_seul')).toBe('status-pill');
  });

  it('rend un tiret plutôt que « null null » sans valeur', () => {
    expect(label(STATUTS_CHANTIER, null)).toBe('—');
    expect(nomPersonne(null)).toBe('—');
    expect(nomPersonne({ firstName: 'Awa', lastName: null })).toBe('Awa');
  });
});

describe('estEnRetard', () => {
  const hier = new Date(Date.now() - 86_400_000).toISOString();
  const demain = new Date(Date.now() + 86_400_000).toISOString();

  it('signale une fin prévue dépassée sur un chantier actif', () => {
    expect(estEnRetard({ dateFinPrevue: hier, statut: 'en_cours' })).toBe(true);
  });

  it('ne signale rien sans date de fin', () => {
    expect(estEnRetard({ dateFinPrevue: null, statut: 'en_cours' })).toBe(false);
  });

  it('ne signale pas une échéance à venir', () => {
    expect(estEnRetard({ dateFinPrevue: demain, statut: 'en_cours' })).toBe(
      false,
    );
  });

  it('se tait sur un chantier réceptionné : son retard est de l’histoire', () => {
    expect(estEnRetard({ dateFinPrevue: hier, statut: 'receptionne' })).toBe(
      false,
    );
    expect(estEnRetard({ dateFinPrevue: hier, statut: 'abandonne' })).toBe(
      false,
    );
  });
});

describe('tonAvancement', () => {
  it('colore la barre selon l’alerte, pas selon le statut', () => {
    expect(tonAvancement({ situationAlerte: 'aucune', statut: 'en_cours' })).toBe(
      '',
    );
    expect(tonAvancement({ situationAlerte: 'retard', statut: 'en_cours' })).toBe(
      'progress--warning',
    );
    expect(
      tonAvancement({
        situationAlerte: 'retard_et_depassement',
        statut: 'en_cours',
      }),
    ).toBe('progress--danger');
  });

  it('marque comme terminé un chantier clos, quelle que soit son alerte', () => {
    expect(
      tonAvancement({ situationAlerte: 'retard', statut: 'receptionne' }),
    ).toBe('progress--done');
  });
});

describe('montant', () => {
  it('lit les Decimal sérialisés en chaîne par l’API', () => {
    expect(montant('1500000.00')).toBe(1_500_000);
    expect(montant(42)).toBe(42);
  });

  it('retombe sur zéro plutôt que sur NaN', () => {
    expect(montant(null)).toBe(0);
    expect(montant(undefined)).toBe(0);
    expect(montant('abc')).toBe(0);
  });
});
