import { BadRequestException, Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

export type CommissionRule = {
  id: string;
  typeRegle: 'pourcentage' | 'montant_fixe';
  taux?: number;
  montantFixe?: number;
  palier?: number;
  bonus?: number;
};

/** Référentiels paramétrables en back-office (section 25 CDC), avec repli. */
/** Types de documents de vente par défaut (paramètre `ventes.documentTypes`). */
export const DEFAULT_DOCUMENT_TYPES = [
  'bon_reservation',
  'recu',
  'facture',
  'contrat',
  'etat_paiement',
  'justificatif',
  'autre',
];

/** Documents que l'API sait générer elle-même (PDF) à partir du dossier. */
export const GENERATED_DOCUMENT_TYPES = [
  'bon_reservation',
  'recu',
  'facture',
  'contrat',
  'etat_paiement',
];

const VENTES_DEFAULTS = {
  statuts: [
    'en_cours',
    'pre_reserve',
    'reserve',
    'paiement_partiel',
    'solde',
    'annule',
  ],
  transitions: {
    en_cours: ['pre_reserve', 'reserve', 'annule'],
    pre_reserve: ['reserve', 'en_cours', 'annule'],
    reserve: ['paiement_partiel', 'solde', 'en_cours', 'annule'],
    paiement_partiel: ['solde', 'annule'],
    solde: [],
    annule: ['en_cours'],
  } as Record<string, string[]>,
  modesPaiement: ['especes', 'virement', 'en_ligne'],
  echeances: 3,
  dureeReservationJours: 15,
};

/**
 * Référentiels du module ventes, paramétrables en back-office (section 25
 * CDC) : statuts et transitions autorisées, modes de paiement, échéances,
 * durée de réservation, règles de commission.
 */
@Injectable()
export class VentesWorkflowService {
  constructor(private readonly settings: SettingsService) {}

  getAllowedSaleStatuses(): Promise<string[]> {
    return this.settings.getStringList(
      'ventes.statuts',
      VENTES_DEFAULTS.statuts,
    );
  }

  async getAllowedTransitions(): Promise<Record<string, string[]>> {
    const value = await this.settings.getRawValue('ventes.transitions');
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const transitions: Record<string, string[]> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (
          Array.isArray(val) &&
          val.every((item) => typeof item === 'string')
        ) {
          transitions[key] = val;
        }
      }
      if (Object.keys(transitions).length > 0) return transitions;
    }
    return VENTES_DEFAULTS.transitions;
  }

  getAllowedPaymentModes(): Promise<string[]> {
    return this.settings.getStringList(
      'paiements.modesAutorises',
      VENTES_DEFAULTS.modesPaiement,
    );
  }

  getDefaultEcheanceCount(): Promise<number> {
    return this.settings.getPositiveNumber(
      'ventes.echeancesDefaut',
      VENTES_DEFAULTS.echeances,
    );
  }

  /**
   * Durée de blocage d'un terrain réservé, en jours (section 12 du CDC :
   * « durée de blocage configurable »). Paramètre distinct du nombre
   * d'échéances de paiement — les deux étaient confondus, ce qui faisait
   * expirer les réservations après 3 jours et liait silencieusement la
   * durée de réservation au plan de paiement.
   */
  getDefaultReservationDays(): Promise<number> {
    return this.settings.getPositiveNumber(
      'reservations.dureeBlocageJours',
      VENTES_DEFAULTS.dureeReservationJours,
    );
  }

  /**
   * Référentiels exposés au back-office (formulaires de statut et de
   * commission). Les règles de commission sont un paramètre sensible : seuls
   * l'identifiant, le type et le libellé sont renvoyés, pas les montants.
   */
  async getOptions() {
    const [
      statuts,
      transitions,
      modesPaiement,
      regles,
      documentTypes,
      dureeReservationJours,
    ] = await Promise.all([
      this.getAllowedSaleStatuses(),
      this.getAllowedTransitions(),
      this.getAllowedPaymentModes(),
      this.settings.getRawValue('ventes.reglesCommissions'),
      this.settings.getStringList(
        'ventes.documentTypes',
        DEFAULT_DOCUMENT_TYPES,
      ),
      this.getDefaultReservationDays(),
    ]);
    const reglesCommissions = Array.isArray(regles)
      ? regles
          .filter(
            (item): item is CommissionRule & { description?: string } =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as CommissionRule).id === 'string',
          )
          .map((rule) => ({
            id: rule.id,
            typeRegle: rule.typeRegle,
            description: rule.description ?? rule.id,
          }))
      : [];
    return {
      statuts,
      transitions,
      modesPaiement,
      reglesCommissions,
      documentTypes,
      generatedDocumentTypes: GENERATED_DOCUMENT_TYPES.filter((type) =>
        documentTypes.includes(type),
      ),
      // Durée de blocage proposée par défaut dans le dialogue de réservation.
      dureeReservationJours,
    };
  }

  async getCommissionRule(regleId: string): Promise<CommissionRule> {
    const configured = await this.settings.getRawValue(
      'ventes.reglesCommissions',
    );
    const value = configured;
    if (!Array.isArray(value)) {
      throw new BadRequestException(
        'Aucune règle de commission n’est configurée',
      );
    }
    const rule = value.find(
      (item): item is CommissionRule =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item) &&
        (item as Record<string, unknown>).id === regleId &&
        ['pourcentage', 'montant_fixe'].includes(
          (item as Record<string, unknown>).typeRegle as string,
        ),
    );
    if (!rule) throw new BadRequestException('Règle de commission introuvable');
    if (
      (rule.typeRegle === 'pourcentage' &&
        (typeof rule.taux !== 'number' || rule.taux < 0 || rule.taux > 100)) ||
      (rule.typeRegle === 'montant_fixe' &&
        (typeof rule.montantFixe !== 'number' || rule.montantFixe < 0))
    ) {
      throw new BadRequestException('Règle de commission invalide');
    }
    return rule;
  }
}
