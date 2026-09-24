import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { HORIZON_MOIS_DEFAUT } from './echeance-loyer.helper';

/**
 * Référentiels de la gestion locative (section 15 du cahier des charges).
 * Tout ce qui dépend du métier est paramétrable en back-office, comme pour
 * les démarches et les ventes.
 */
export const LOCATIF_DEFAULTS = {
  typesBien: ['villa', 'appartement', 'studio', 'bureau', 'commerce', 'autre'],
  /** disponible : jamais loué ou libéré ; loue : bail actif ; en_travaux/indisponible : hors marché. */
  statutsBien: ['disponible', 'loue', 'en_travaux', 'indisponible'],
  /** Cycle de vie du bail (section 15 : préavis, clôture normale, départ sans préavis). */
  statutsBail: ['actif', 'preavis', 'termine', 'resilie_sans_preavis'],
  /** Situation de paiement du bail, recalculée : cas « impayé prolongé » de la section 15. */
  situationsPaiement: ['a_jour', 'retard', 'impaye_prolonge'],
  statutsCaution: [
    'non_versee',
    'partiellement_versee',
    'versee',
    'partiellement_retenue',
    'retenue_totale',
    'remboursee',
  ],
  /** Nature du versement (section 15 : « avance, normal, partiel, régularisation »). */
  typesPaiement: ['avance', 'normal', 'partiel', 'regularisation'],
  /** Contrôle des encaissements (section 24 : permission « valider »). */
  statutsPaiement: ['en_attente', 'valide', 'rejete'],
  modesPaiement: ['especes', 'virement', 'mobile_money', 'cheque', 'autre'],
  /** Statut d'une échéance, recalculé automatiquement — jamais saisi à la main. */
  statutsEcheance: [
    'a_venir',
    'partielle',
    'en_retard',
    'impayee',
    'payee',
    'annulee',
  ],
  /** Mouvements de caution : l'« historique » exigé par la section 15. */
  typesMouvementCaution: [
    'versement',
    'retenue',
    'remboursement',
    'ajustement',
  ],
  typesIncident: ['plomberie', 'electricite', 'serrurerie', 'autre'],
  /** Demandes du locataire (sections 4 et 15 : « incidents **et demandes** »). */
  typesDemande: [
    'renouvellement_bail',
    'attestation',
    'travaux',
    'depart',
    'autre',
  ],
  statutsIncident: ['signale', 'en_cours', 'resolu'],
  typesDocument: [
    'contrat',
    'quittance',
    'etat_lieux_entree',
    'etat_lieux_sortie',
    'releve_gestion',
    'rapport',
    'autre',
  ],
} as const;

/** Statuts après lesquels un bail ne bouge plus. */
export const BAIL_STATUTS_TERMINES = [
  'termine',
  'resilie_sans_preavis',
] as const;

/** Nombre de jours de retard avant la première relance, si MTM n'en décide pas autrement. */
const RELANCE_SEUIL_JOURS_DEFAUT = 5;

/** Jours d'impayé au-delà desquels un bail passe « impayé prolongé ». */
const IMPAYE_PROLONGE_JOURS_DEFAUT = 60;

/**
 * Modèle de relance : un palier du calendrier de relance de la section 15.
 * `joursRetard` porte le délai paramétrable, `objet`/`message` le modèle de
 * message, avec les jetons {{locataire}}, {{bien}}, {{periode}},
 * {{montantDu}}, {{joursRetard}} et {{reference}}.
 */
export interface ModeleRelance {
  code: string;
  libelle: string;
  joursRetard: number;
  canal: string;
  objet: string;
  message: string;
}

const RELANCE_MODELES_DEFAUT: ModeleRelance[] = [
  {
    code: 'rappel_amiable',
    libelle: 'Rappel amiable',
    joursRetard: 5,
    canal: 'email',
    objet: 'Rappel : loyer de {{periode}} — {{reference}}',
    message:
      'Bonjour {{locataire}},\n\nLe loyer de {{periode}} pour {{bien}} reste dû à hauteur de {{montantDu}}.\n\nSi le règlement a déjà été effectué, merci de nous transmettre la référence du versement.\n\nCordialement,\nMTM Immobilier — Gestion locative',
  },
  {
    code: 'relance_ferme',
    libelle: 'Relance ferme',
    joursRetard: 15,
    canal: 'email',
    objet: 'Relance : loyer de {{periode}} impayé depuis {{joursRetard}} jours',
    message:
      'Bonjour {{locataire}},\n\nMalgré notre premier rappel, le loyer de {{periode}} pour {{bien}} reste impayé ({{montantDu}}), soit {{joursRetard}} jours de retard.\n\nNous vous invitons à régulariser sans délai ou à nous contacter pour convenir d’un échéancier.\n\nCordialement,\nMTM Immobilier — Gestion locative',
  },
  {
    code: 'mise_en_demeure',
    libelle: 'Mise en demeure',
    joursRetard: 30,
    canal: 'email',
    objet: 'Mise en demeure — loyer de {{periode}} ({{reference}})',
    message:
      'Bonjour {{locataire}},\n\nLe loyer de {{periode}} pour {{bien}} demeure impayé à hauteur de {{montantDu}}, {{joursRetard}} jours après son échéance.\n\nSans règlement de votre part, MTM Immobilier engagera la procédure prévue au bail.\n\nCordialement,\nMTM Immobilier — Gestion locative',
  },
];

@Injectable()
export class LocatifOptionsService {
  constructor(private readonly settings: SettingsService) {}

  /** Tout ce dont les écrans ont besoin pour afficher des listes. */
  async getOptions() {
    const [
      typesBien,
      statutsBien,
      statutsBail,
      situationsPaiement,
      statutsCaution,
      typesPaiement,
      statutsPaiement,
      modesPaiement,
      statutsEcheance,
      typesMouvementCaution,
      typesIncident,
      typesDemande,
      statutsIncident,
      typesDocument,
      relanceSeuilJours,
      impayeProlongeJours,
      horizonEcheancesMois,
      relanceModeles,
    ] = await Promise.all([
      this.liste('locatif.typesBien', LOCATIF_DEFAULTS.typesBien),
      this.liste('locatif.statutsBien', LOCATIF_DEFAULTS.statutsBien),
      this.liste('locatif.statutsBail', LOCATIF_DEFAULTS.statutsBail),
      this.liste(
        'locatif.situationsPaiement',
        LOCATIF_DEFAULTS.situationsPaiement,
      ),
      this.liste('locatif.statutsCaution', LOCATIF_DEFAULTS.statutsCaution),
      this.liste('locatif.typesPaiement', LOCATIF_DEFAULTS.typesPaiement),
      this.liste('locatif.statutsPaiement', LOCATIF_DEFAULTS.statutsPaiement),
      this.liste('locatif.modesPaiement', LOCATIF_DEFAULTS.modesPaiement),
      this.liste('locatif.statutsEcheance', LOCATIF_DEFAULTS.statutsEcheance),
      this.liste(
        'locatif.typesMouvementCaution',
        LOCATIF_DEFAULTS.typesMouvementCaution,
      ),
      this.liste('locatif.typesIncident', LOCATIF_DEFAULTS.typesIncident),
      this.liste('locatif.typesDemande', LOCATIF_DEFAULTS.typesDemande),
      this.liste('locatif.statutsIncident', LOCATIF_DEFAULTS.statutsIncident),
      this.liste('locatif.typesDocument', LOCATIF_DEFAULTS.typesDocument),
      this.getRelanceSeuilJours(),
      this.getImpayeProlongeJours(),
      this.getHorizonEcheancesMois(),
      this.getRelanceModeles(),
    ]);

    return {
      typesBien,
      statutsBien,
      statutsBail,
      situationsPaiement,
      statutsCaution,
      typesPaiement,
      statutsPaiement,
      modesPaiement,
      statutsEcheance,
      typesMouvementCaution,
      typesIncident,
      typesDemande,
      statutsIncident,
      typesDocument,
      relanceSeuilJours,
      impayeProlongeJours,
      horizonEcheancesMois,
      relanceModeles,
    };
  }

  /**
   * Seuil de retard déclenchant la première relance (section 15 : « délais
   * paramétrables par MTM »). Sert de repli lorsque le calendrier de relance
   * n'a pas été personnalisé.
   */
  getRelanceSeuilJours(): Promise<number> {
    return this.settings.getPositiveNumber(
      'locatif.relanceSeuilJours',
      RELANCE_SEUIL_JOURS_DEFAUT,
    );
  }

  /** Bascule d'un bail en « impayé prolongé » (cas particulier de la section 15). */
  getImpayeProlongeJours(): Promise<number> {
    return this.settings.getPositiveNumber(
      'locatif.impayeProlongeJours',
      IMPAYE_PROLONGE_JOURS_DEFAUT,
    );
  }

  /** Mois d'échéances maintenus d'avance sur un bail en cours. */
  getHorizonEcheancesMois(): Promise<number> {
    return this.settings.getPositiveNumber(
      'locatif.horizonEcheancesMois',
      HORIZON_MOIS_DEFAUT,
    );
  }

  /**
   * Calendrier de relance : la liste des paliers, triée par jours de retard.
   * Un paramètre mal formé ne doit pas bloquer la gestion locative : on
   * retombe sur le calendrier par défaut, comme pour les autres référentiels.
   */
  async getRelanceModeles(): Promise<ModeleRelance[]> {
    const brut = await this.settings.getRawValue('locatif.relanceModeles');
    const modeles = Array.isArray(brut)
      ? brut.filter((item): item is ModeleRelance => estModeleRelance(item))
      : [];
    const retenus = modeles.length > 0 ? modeles : RELANCE_MODELES_DEFAUT;
    return [...retenus].sort((a, b) => a.joursRetard - b.joursRetard);
  }

  assertTypeBien(type?: string): Promise<void> {
    return this.settings.assertInList(
      'locatif.typesBien',
      LOCATIF_DEFAULTS.typesBien,
      type,
      'Type de bien invalide',
    );
  }

  assertStatutBien(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'locatif.statutsBien',
      LOCATIF_DEFAULTS.statutsBien,
      statut,
      'Statut de bien invalide',
    );
  }

  assertStatutCaution(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'locatif.statutsCaution',
      LOCATIF_DEFAULTS.statutsCaution,
      statut,
      'Statut de caution invalide',
    );
  }

  assertTypePaiement(type?: string): Promise<void> {
    return this.settings.assertInList(
      'locatif.typesPaiement',
      LOCATIF_DEFAULTS.typesPaiement,
      type,
      'Type de paiement invalide',
    );
  }

  assertModePaiement(mode?: string): Promise<void> {
    return this.settings.assertInList(
      'locatif.modesPaiement',
      LOCATIF_DEFAULTS.modesPaiement,
      mode,
      'Mode de paiement invalide',
    );
  }

  assertTypeMouvementCaution(type?: string): Promise<void> {
    return this.settings.assertInList(
      'locatif.typesMouvementCaution',
      LOCATIF_DEFAULTS.typesMouvementCaution,
      type,
      'Type de mouvement de caution invalide',
    );
  }

  /** Un incident et une demande n'ont pas le même référentiel de types. */
  assertTypeSignalement(nature: string, type?: string): Promise<void> {
    return nature === 'demande'
      ? this.settings.assertInList(
          'locatif.typesDemande',
          LOCATIF_DEFAULTS.typesDemande,
          type,
          'Type de demande invalide',
        )
      : this.settings.assertInList(
          'locatif.typesIncident',
          LOCATIF_DEFAULTS.typesIncident,
          type,
          'Type d’incident invalide',
        );
  }

  assertStatutIncident(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'locatif.statutsIncident',
      LOCATIF_DEFAULTS.statutsIncident,
      statut,
      'Statut d’incident invalide',
    );
  }

  assertTypeDocument(type?: string): Promise<void> {
    return this.settings.assertInList(
      'locatif.typesDocument',
      LOCATIF_DEFAULTS.typesDocument,
      type,
      'Type de document invalide',
    );
  }

  private liste(cle: string, defaut: readonly string[]): Promise<string[]> {
    return this.settings.getStringList(cle, defaut);
  }
}

function estModeleRelance(valeur: unknown): valeur is ModeleRelance {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const candidat = valeur as Record<string, unknown>;
  return (
    typeof candidat.code === 'string' &&
    typeof candidat.libelle === 'string' &&
    typeof candidat.joursRetard === 'number' &&
    Number.isFinite(candidat.joursRetard) &&
    candidat.joursRetard >= 0 &&
    typeof candidat.canal === 'string' &&
    typeof candidat.objet === 'string' &&
    typeof candidat.message === 'string'
  );
}
