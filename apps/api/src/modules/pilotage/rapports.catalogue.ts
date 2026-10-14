export interface DefinitionRapport {
  code: string;
  titre: string;
  description: string;
  /** Ce que le rapport accepte comme filtres, en plus de la période. */
  filtres: Array<'region'>;
  /** Vrai : la période compte (sinon le rapport est une photo du jour). */
  parPeriode: boolean;
}

export const CATALOGUE_RAPPORTS: DefinitionRapport[] = [
  {
    code: 'ventes_periode',
    titre: 'Ventes par période',
    description:
      'Les ventes conclues sur la période, une par ligne, avec le total et le détail par mois.',
    filtres: ['region'],
    parPeriode: true,
  },
  {
    code: 'ventes_zone',
    titre: 'Ventes par zone',
    description:
      'Nombre de ventes, chiffre d’affaires, prix moyen et superficie vendue par région et par commune.',
    filtres: ['region'],
    parPeriode: true,
  },
  {
    code: 'performance_commerciaux',
    titre: 'Performance des commerciaux',
    description:
      'Pour chaque commercial : prospects, visites, ventes, chiffre d’affaires, commissions et objectifs.',
    filtres: [],
    parPeriode: true,
  },
  {
    code: 'terrains_etat',
    titre: 'Terrains disponibles et vendus',
    description:
      'L’état du portefeuille : répartition par statut et par zone, liste des biens disponibles.',
    filtres: ['region'],
    parPeriode: false,
  },
  {
    code: 'loyers_impayes',
    titre: 'Loyers et impayés',
    description:
      'Loyers attendus et encaissés par bien sur la période, et impayés à la date du jour.',
    filtres: [],
    parPeriode: true,
  },
  {
    code: 'rentabilite_activite',
    titre: 'Rentabilité par activité',
    description:
      'Encaissements, revenu de MTM, dépenses et résultat de chaque activité, mois par mois.',
    filtres: [],
    parPeriode: true,
  },
  {
    code: 'activite_demarches',
    titre: 'Activité des démarches',
    description:
      'Missions ouvertes, rapports rendus, décisions, délais et règlements.',
    filtres: [],
    parPeriode: true,
  },
];
