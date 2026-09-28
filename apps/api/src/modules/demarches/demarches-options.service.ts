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
    // Parcours « vérification » (le parcours historique du module).
    'demande',
    'faisabilite',
    'verification_physique',
    'verification_administrative',
    'rapport',
    // Parcours « démarche administrative » : constituer, déposer, suivre,
    // retirer. Une vérification n'y passe pas, et réciproquement.
    'constitution_dossier',
    'depot',
    'suivi_administration',
    'retrait',
    // Parcours « prestation technique » (plans).
    'devis',
    'production',
    'livraison',
    // Fins de parcours, communes aux trois.
    'cloturee',
    'abandonnee',
  ],
  /**
   * Nature de la prestation demandée par le client. Le module ne couvrait que
   * la vérification foncière ; il porte aussi les démarches déposées pour le
   * compte du client et les prestations techniques sous-traitées.
   */
  typesVerification: [
    // Famille « vérification »
    'verification_fonciere',
    'verification_physique',
    'verification_administrative',
    'accompagnement_achat',
    'autre',
    // Famille « démarche administrative »
    'depot_mutation',
    'depot_bail',
    'depot_autorisation_construire',
    'retrait_document',
    'autre_demarche',
    // Famille « prestation technique »
    'plan_architectural',
    'plan_geometre',
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
 * Les trois familles de prestation n'ont pas le même parcours : vérifier un
 * terrain se conclut par un rapport de conformité, déposer un dossier se
 * conclut par le retrait de l'acte, et produire un plan se conclut par sa
 * livraison. Un même jeu d'étapes pour les trois laisserait un dépôt de bail
 * coincé à « vérification physique ».
 */
export const FAMILLES_PRESTATION = [
  'verification',
  'demarche',
  'technique',
] as const;

export type FamillePrestation = (typeof FAMILLES_PRESTATION)[number];

/** Parcours propre à chaque famille, hors fins de parcours communes. */
export const PARCOURS_PAR_FAMILLE: Record<
  FamillePrestation,
  readonly string[]
> = {
  verification: [
    'demande',
    'faisabilite',
    'verification_physique',
    'verification_administrative',
    'rapport',
  ],
  demarche: [
    'demande',
    'constitution_dossier',
    'depot',
    'suivi_administration',
    'retrait',
  ],
  technique: ['demande', 'devis', 'production', 'livraison'],
};

/**
 * Famille de chaque type de prestation. `autre` reste rattaché à la
 * vérification : c'était son comportement avant l'ouverture du module aux
 * autres prestations, et les dossiers déjà saisis sous ce type ne doivent pas
 * changer de parcours en cours de route.
 */
export const FAMILLE_PAR_TYPE: Record<string, FamillePrestation> = {
  verification_fonciere: 'verification',
  verification_physique: 'verification',
  verification_administrative: 'verification',
  accompagnement_achat: 'verification',
  autre: 'verification',
  depot_mutation: 'demarche',
  depot_bail: 'demarche',
  depot_autorisation_construire: 'demarche',
  retrait_document: 'demarche',
  autre_demarche: 'demarche',
  plan_architectural: 'technique',
  plan_geometre: 'technique',
};

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
  // Les démarches et les prestations techniques partent à 0, c'est-à-dire
  // « sur devis » : leur coût dépend des droits réclamés par l'administration
  // et du prestataire retenu. Les monter à un montant inventé donnerait un
  // devis faux à la création d'un dossier.
  depot_mutation: 0,
  depot_bail: 0,
  depot_autorisation_construire: 0,
  retrait_document: 0,
  autre_demarche: 0,
  plan_architectural: 0,
  plan_geometre: 0,
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
    // Les écrans doivent savoir quelles étapes proposer selon le type choisi :
    // sans cette table, la liste des étapes d'un dépôt de bail afficherait le
    // parcours d'une vérification foncière.
    const famillesParType = await this.getFamillesParType();

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
      famillesParType,
      parcoursParFamille: Object.fromEntries(
        FAMILLES_PRESTATION.map((famille) => [
          famille,
          [...PARCOURS_PAR_FAMILLE[famille], ...MISSION_STATUTS_TERMINES],
        ]),
      ),
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

  /**
   * Famille d'un type de prestation. La table est paramétrable : le jour où
   * MTM ajoute un type depuis les Paramètres, il faut pouvoir lui dire quel
   * parcours il suit sans passer par un déploiement. Un type inconnu est
   * traité comme une vérification, le parcours historique du module.
   */
  async familleDuType(type: string | null | undefined) {
    const table = await this.getFamillesParType();
    const famille = type ? table[type] : undefined;
    return famille ?? 'verification';
  }

  /** Table `type -> famille`, valeurs par défaut surchargeables. */
  async getFamillesParType(): Promise<Record<string, FamillePrestation>> {
    const valeur = await this.settings.getRawValue('demarches.famillesParType');
    const table: Record<string, FamillePrestation> = { ...FAMILLE_PAR_TYPE };
    if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
      for (const [cle, famille] of Object.entries(
        valeur as Record<string, unknown>,
      )) {
        if (
          typeof famille === 'string' &&
          (FAMILLES_PRESTATION as readonly string[]).includes(famille)
        ) {
          table[cle] = famille as FamillePrestation;
        }
      }
    }
    return table;
  }

  /**
   * Étapes praticables pour un type donné : le parcours de sa famille, suivi
   * des deux fins de parcours communes.
   */
  async parcoursDuType(type: string | null | undefined): Promise<string[]> {
    const famille = await this.familleDuType(type);
    return [...PARCOURS_PAR_FAMILLE[famille], ...MISSION_STATUTS_TERMINES];
  }

  private liste(cle: string, defaut: readonly string[]): Promise<string[]> {
    return this.settings.getStringList(cle, defaut);
  }
}
