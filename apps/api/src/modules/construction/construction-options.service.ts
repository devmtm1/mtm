import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import {
  HORIZON_ECHEANCE_DEFAUT,
  SEUIL_DEPASSEMENT_DEFAUT,
} from './chantier.helper';

/**
 * Référentiels du suivi de chantier (section 16). Comme pour les autres
 * modules, rien de métier n'est figé dans le code : la section 25 impose que
 * MTM puisse faire évoluer ses listes sans développement.
 */
export const CONSTRUCTION_DEFAULTS = {
  /**
   * Vie d'un chantier : préparation → travaux → réception, avec la suspension
   * et l'abandon comme sorties possibles.
   */
  statuts: [
    'prepare',
    'en_cours',
    'suspendu',
    'receptionne',
    'cloture',
    'abandonne',
  ],
  /** Nature de l'ouvrage. */
  typesProjet: [
    'villa',
    'immeuble',
    'local_commercial',
    'cloture',
    'renovation',
    'viabilisation',
    'autre',
  ],
  /** Étapes d'un jalon de planning. */
  statutsJalon: ['a_venir', 'en_cours', 'termine', 'bloque', 'annule'],
  /**
   * Jalons proposés à la création d'un chantier : le déroulé courant d'une
   * construction, que MTM adapte projet par projet.
   */
  jalonsType: [
    'etudes_et_permis',
    'terrassement',
    'fondations',
    'elevation',
    'dalle',
    'toiture',
    'second_oeuvre',
    'finitions',
    'reception',
  ],
  /** Corps de métier des prestataires. */
  metiers: [
    'maconnerie',
    'terrassement',
    'ferraillage',
    'charpente',
    'electricite',
    'plomberie',
    'menuiserie',
    'peinture',
    'carrelage',
    'etudes',
    'controle',
    'autre',
  ],
  /** Situation contractuelle d'un prestataire. */
  statutsIntervenant: ['pressenti', 'engage', 'en_cours', 'termine', 'resilie'],
  /** Postes du budget prévisionnel. */
  postesBudget: [
    'materiaux',
    'main_oeuvre',
    'equipement',
    'etudes',
    'administratif',
    'divers',
  ],
  /** Unités de quantité des postes de matériaux. */
  unites: ['u', 'm', 'm2', 'm3', 'kg', 'tonne', 'sac', 'camion', 'forfait'],
  /** Contrôle comptable d'une dépense. */
  statutsDepense: ['en_attente', 'valide', 'rejete'],
  modesPaiement: ['especes', 'virement', 'mobile_money', 'cheque', 'autre'],
  /** Conditions du jour, notées au journal. */
  meteos: ['ensoleille', 'nuageux', 'pluie', 'vent', 'intemperies'],
  /** Types de pièces attachées à un chantier. */
  typesDocument: [
    'plan',
    'permis_construire',
    'devis',
    'contrat',
    'facture',
    'photo_chantier',
    'proces_verbal',
    'rapport_avancement',
    'autre',
  ],
} as const;

/**
 * Libellé français des étapes types. Le référentiel ne porte que des
 * codes — c'est ce qui permet à MTM d'en ajouter depuis les Paramètres
 * — mais une étape posée sur un planning doit se lire « Second œuvre »,
 * pas « second_oeuvre ».
 */
export const JALONS_TYPE_LIBELLES: Record<string, string> = {
  etudes_et_permis: 'Études et permis',
  terrassement: 'Terrassement',
  fondations: 'Fondations',
  elevation: 'Élévation',
  dalle: 'Dalle',
  toiture: 'Toiture',
  second_oeuvre: 'Second œuvre',
  finitions: 'Finitions',
  reception: 'Réception',
};

/**
 * Un code ajouté dans les Paramètres reste lisible sans redéploiement :
 * « mur_de_cloture » devient « Mur de cloture ». Les accents manquent,
 * mais c'est préférable à un code brut sur l'écran.
 */
export function libelleJalonType(code: string): string {
  const connu = JALONS_TYPE_LIBELLES[code];
  if (connu) return connu;
  const texte = code.replace(/_/g, ' ').trim();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Paramètres numériques du module, tous surchargeables. */
export const CONSTRUCTION_REGLAGES_DEFAUT = {
  /** Au-delà de ce pourcentage du budget consommé, le chantier alerte. */
  'construction.seuilAlerteBudget': SEUIL_DEPASSEMENT_DEFAUT,
  /** Fenêtre des échéances signalées comme proches, en jours. */
  'construction.horizonEcheanceJours': HORIZON_ECHEANCE_DEFAUT,
  /**
   * Au-delà de ce retard sur la fin prévue, le chantier est signalé comme
   * durablement en retard sur les tableaux de bord.
   */
  'construction.retardCritiqueJours': 30,
} as const;

@Injectable()
export class ConstructionOptionsService {
  constructor(private readonly settings: SettingsService) {}

  /** Tout ce dont les écrans ont besoin pour afficher leurs listes. */
  async getOptions() {
    const [
      statuts,
      typesProjet,
      statutsJalon,
      jalonsType,
      metiers,
      statutsIntervenant,
      postesBudget,
      unites,
      statutsDepense,
      modesPaiement,
      meteos,
      typesDocument,
      reglages,
    ] = await Promise.all([
      this.liste('construction.statuts', CONSTRUCTION_DEFAULTS.statuts),
      this.liste('construction.typesProjet', CONSTRUCTION_DEFAULTS.typesProjet),
      this.liste(
        'construction.statutsJalon',
        CONSTRUCTION_DEFAULTS.statutsJalon,
      ),
      this.liste('construction.jalonsType', CONSTRUCTION_DEFAULTS.jalonsType),
      this.liste('construction.metiers', CONSTRUCTION_DEFAULTS.metiers),
      this.liste(
        'construction.statutsIntervenant',
        CONSTRUCTION_DEFAULTS.statutsIntervenant,
      ),
      this.liste(
        'construction.postesBudget',
        CONSTRUCTION_DEFAULTS.postesBudget,
      ),
      this.liste('construction.unites', CONSTRUCTION_DEFAULTS.unites),
      this.liste(
        'construction.statutsDepense',
        CONSTRUCTION_DEFAULTS.statutsDepense,
      ),
      this.liste(
        'construction.modesPaiement',
        CONSTRUCTION_DEFAULTS.modesPaiement,
      ),
      this.liste('construction.meteos', CONSTRUCTION_DEFAULTS.meteos),
      this.liste(
        'construction.typesDocument',
        CONSTRUCTION_DEFAULTS.typesDocument,
      ),
      this.getReglages(),
    ]);

    return {
      statuts,
      typesProjet,
      statutsJalon,
      jalonsType,
      metiers,
      statutsIntervenant,
      postesBudget,
      unites,
      statutsDepense,
      modesPaiement,
      meteos,
      typesDocument,
      reglages,
    };
  }

  /** Seuils d'alerte, relus à chaque calcul pour rester paramétrables. */
  async getReglages(): Promise<{
    seuilAlerteBudget: number;
    horizonEcheanceJours: number;
    retardCritiqueJours: number;
  }> {
    const [seuil, horizon, retard] = await Promise.all([
      this.nombre(
        'construction.seuilAlerteBudget',
        CONSTRUCTION_REGLAGES_DEFAUT['construction.seuilAlerteBudget'],
      ),
      this.nombre(
        'construction.horizonEcheanceJours',
        CONSTRUCTION_REGLAGES_DEFAUT['construction.horizonEcheanceJours'],
      ),
      this.nombre(
        'construction.retardCritiqueJours',
        CONSTRUCTION_REGLAGES_DEFAUT['construction.retardCritiqueJours'],
      ),
    ]);
    return {
      seuilAlerteBudget: seuil,
      horizonEcheanceJours: horizon,
      retardCritiqueJours: retard,
    };
  }

  assertStatut(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.statuts',
      CONSTRUCTION_DEFAULTS.statuts,
      statut,
      'Statut de chantier invalide',
    );
  }

  assertTypeProjet(type?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.typesProjet',
      CONSTRUCTION_DEFAULTS.typesProjet,
      type,
      'Type de projet invalide',
    );
  }

  assertStatutJalon(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.statutsJalon',
      CONSTRUCTION_DEFAULTS.statutsJalon,
      statut,
      'Statut de jalon invalide',
    );
  }

  assertMetier(metier?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.metiers',
      CONSTRUCTION_DEFAULTS.metiers,
      metier,
      'Corps de métier invalide',
    );
  }

  assertStatutIntervenant(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.statutsIntervenant',
      CONSTRUCTION_DEFAULTS.statutsIntervenant,
      statut,
      'Statut de prestataire invalide',
    );
  }

  assertPosteBudget(poste?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.postesBudget',
      CONSTRUCTION_DEFAULTS.postesBudget,
      poste,
      'Poste de budget invalide',
    );
  }

  assertUnite(unite?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.unites',
      CONSTRUCTION_DEFAULTS.unites,
      unite,
      'Unité invalide',
    );
  }

  assertModePaiement(mode?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.modesPaiement',
      CONSTRUCTION_DEFAULTS.modesPaiement,
      mode,
      'Mode de paiement invalide',
    );
  }

  assertMeteo(meteo?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.meteos',
      CONSTRUCTION_DEFAULTS.meteos,
      meteo,
      'Condition météo invalide',
    );
  }

  assertTypeDocument(type?: string): Promise<void> {
    return this.settings.assertInList(
      'construction.typesDocument',
      CONSTRUCTION_DEFAULTS.typesDocument,
      type,
      'Type de document invalide',
    );
  }

  private liste(cle: string, defaut: readonly string[]): Promise<string[]> {
    return this.settings.getStringList(cle, defaut);
  }

  private nombre(cle: string, defaut: number): Promise<number> {
    return this.settings.getPositiveNumber(cle, defaut);
  }
}
