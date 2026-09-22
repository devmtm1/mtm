import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

/**
 * Référentiels des missions de vérification foncière (section 14 du cahier
 * des charges). Tout ce qui dépend du métier ou de la tarification est
 * paramétrable en back-office : le cahier des charges interdit explicitement
 * de figer les tarifs dans le code.
 */
export const DEMARCHES_DEFAULTS = {
  /**
   * Étapes de la mission : demande → faisabilité → vérification physique →
   * vérification administrative → rapport, puis clôture ou abandon.
   */
  statuts: [
    'demande',
    'faisabilite',
    'verification_physique',
    'verification_administrative',
    'rapport',
    'cloturee',
    'abandonnee',
  ],
  /** Nature de la mission demandée par le client. */
  typesVerification: [
    'verification_fonciere',
    'verification_physique',
    'verification_administrative',
    'accompagnement_achat',
    'autre',
  ],
  urgences: ['normale', 'urgente', 'tres_urgente'],
  /** Conclusion de l'étude préalable (étape 2). */
  conclusionsFaisabilite: ['favorable', 'defavorable', 'a_completer'],
  /** Décision finale de MTM (étape 5). */
  decisions: ['favorable', 'defavorable', 'a_completer'],
  /** Ce que le collaborateur constate sur place (étape 3). */
  conformites: ['conforme', 'ecart_mineur', 'ecart_majeur', 'non_verifiable'],
  /**
   * Administrations consultées (étape 4). La liste dépend de la localisation
   * du terrain : MTM l'étend au fil des dossiers.
   */
  administrations: [
    'mairie',
    'service_domaines',
    'cadastre',
    'conservation_fonciere',
    'prefecture',
    'sous_prefecture',
    'autre',
  ],
  /** Suite donnée par l'administration consultée. */
  resultatsAdministration: [
    'confirme',
    'infirme',
    'partiel',
    'sans_reponse',
    'en_attente',
  ],
  /** Types de pièces attachées à une mission. */
  typesDocument: [
    'piece_fournie',
    'photo_visite',
    'constat',
    'piece_administrative',
    'rapport',
    'autre',
  ],
  modesPaiement: ['especes', 'virement', 'mobile_money', 'cheque', 'autre'],
} as const;

/** Étapes après lesquelles une mission ne bouge plus. */
export const MISSION_STATUTS_TERMINES = ['cloturee', 'abandonnee'] as const;

/**
 * Tarifs par défaut, en francs CFA. Le cahier des charges évoque 100 000 à
 * 200 000 FCFA « sans figer cette valeur dans le code » : ces montants ne
 * sont donc qu'une proposition de départ, modifiable dans les Paramètres.
 */
export const TARIFS_DEFAUT = {
  verification_fonciere: 150000,
  verification_physique: 100000,
  verification_administrative: 120000,
  accompagnement_achat: 200000,
  autre: 0,
} as const;

export type TarifsVerification = Record<string, number>;

@Injectable()
export class DemarchesOptionsService {
  constructor(private readonly settings: SettingsService) {}

  /** Tout ce dont les écrans ont besoin pour afficher des listes. */
  async getOptions() {
    const [
      statuts,
      typesVerification,
      urgences,
      conclusionsFaisabilite,
      decisions,
      conformites,
      administrations,
      resultatsAdministration,
      typesDocument,
      modesPaiement,
      tarifs,
    ] = await Promise.all([
      this.liste('demarches.statuts', DEMARCHES_DEFAULTS.statuts),
      this.liste(
        'demarches.typesVerification',
        DEMARCHES_DEFAULTS.typesVerification,
      ),
      this.liste('demarches.urgences', DEMARCHES_DEFAULTS.urgences),
      this.liste(
        'demarches.conclusionsFaisabilite',
        DEMARCHES_DEFAULTS.conclusionsFaisabilite,
      ),
      this.liste('demarches.decisions', DEMARCHES_DEFAULTS.decisions),
      this.liste('demarches.conformites', DEMARCHES_DEFAULTS.conformites),
      this.liste(
        'demarches.administrations',
        DEMARCHES_DEFAULTS.administrations,
      ),
      this.liste(
        'demarches.resultatsAdministration',
        DEMARCHES_DEFAULTS.resultatsAdministration,
      ),
      this.liste('demarches.typesDocument', DEMARCHES_DEFAULTS.typesDocument),
      this.liste('demarches.modesPaiement', DEMARCHES_DEFAULTS.modesPaiement),
      this.getTarifs(),
    ]);

    return {
      statuts,
      typesVerification,
      urgences,
      conclusionsFaisabilite,
      decisions,
      conformites,
      administrations,
      resultatsAdministration,
      typesDocument,
      modesPaiement,
      tarifs,
    };
  }

  /**
   * Tarif indicatif par type de vérification, proposé à la création d'une
   * mission. Le montant reste modifiable dossier par dossier : une mission
   * éloignée ou urgente ne se facture pas comme les autres.
   */
  async getTarifs(): Promise<TarifsVerification> {
    const valeur = await this.settings.getRawValue('demarches.tarifs');
    if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
      const tarifs: TarifsVerification = {};
      for (const [cle, montant] of Object.entries(
        valeur as Record<string, unknown>,
      )) {
        if (typeof montant === 'number' && Number.isFinite(montant)) {
          tarifs[cle] = montant;
        }
      }
      if (Object.keys(tarifs).length) return tarifs;
    }
    return { ...TARIFS_DEFAUT };
  }

  assertStatut(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.statuts',
      DEMARCHES_DEFAULTS.statuts,
      statut,
      'Étape de mission invalide',
    );
  }

  assertTypeVerification(type?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.typesVerification',
      DEMARCHES_DEFAULTS.typesVerification,
      type,
      'Type de vérification invalide',
    );
  }

  assertUrgence(urgence?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.urgences',
      DEMARCHES_DEFAULTS.urgences,
      urgence,
      'Niveau d’urgence invalide',
    );
  }

  assertConclusionFaisabilite(conclusion?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.conclusionsFaisabilite',
      DEMARCHES_DEFAULTS.conclusionsFaisabilite,
      conclusion,
      'Conclusion d’étude de faisabilité invalide',
    );
  }

  assertDecision(decision?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.decisions',
      DEMARCHES_DEFAULTS.decisions,
      decision,
      'Décision de mission invalide',
    );
  }

  assertConformite(conformite?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.conformites',
      DEMARCHES_DEFAULTS.conformites,
      conformite,
      'Constat de conformité invalide',
    );
  }

  assertAdministration(administration?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.administrations',
      DEMARCHES_DEFAULTS.administrations,
      administration,
      'Administration inconnue',
    );
  }

  assertResultatAdministration(resultat?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.resultatsAdministration',
      DEMARCHES_DEFAULTS.resultatsAdministration,
      resultat,
      'Résultat de consultation invalide',
    );
  }

  assertTypeDocument(type?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.typesDocument',
      DEMARCHES_DEFAULTS.typesDocument,
      type,
      'Type de document invalide',
    );
  }

  assertModePaiement(mode?: string): Promise<void> {
    return this.settings.assertInList(
      'demarches.modesPaiement',
      DEMARCHES_DEFAULTS.modesPaiement,
      mode,
      'Mode de paiement invalide',
    );
  }

  private liste(cle: string, defaut: readonly string[]): Promise<string[]> {
    return this.settings.getStringList(cle, defaut);
  }
}
