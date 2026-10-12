import { UN_JOUR } from './pilotage.calculs';
import { CATALOGUE_RAPPORTS } from './rapports.catalogue';

export const CLE_ENVOI_AUTOMATIQUE = 'pilotage.envoiAutomatique';

export type FrequenceEnvoi = 'hebdomadaire' | 'mensuelle';
export type FormatEnvoi = 'pdf' | 'xlsx';

export interface ConfigEnvoi {
  actif: boolean;
  frequence: FrequenceEnvoi;
  rapports: string[];
  formats: FormatEnvoi[];
  destinataires: string[];
}

export const ENVOI_PAR_DEFAUT: ConfigEnvoi = {
  actif: false,
  frequence: 'hebdomadaire',
  rapports: ['rentabilite_activite', 'ventes_periode'],
  formats: ['pdf'],
  destinataires: [],
};

const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Message affiché quand la valeur enregistrée dans Paramètres est refusée. */
export const MESSAGE_ENVOI_INVALIDE =
  'Envoi automatique : {"actif":true|false,"frequence":"hebdomadaire"|"mensuelle","rapports":[codes de rapports],"formats":["pdf","xlsx"],"destinataires":[adresses e-mail]}. Avec actif=true, au moins un destinataire et un rapport sont requis.';

/** Contrôle strict de la valeur saisie dans la page Paramètres. */
export function envoiValide(valeur: unknown): boolean {
  if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) {
    return false;
  }
  const v = valeur as Record<string, unknown>;
  const codes = CATALOGUE_RAPPORTS.map((r) => r.code);
  const liste = (x: unknown): x is string[] =>
    Array.isArray(x) && x.every((e) => typeof e === 'string');
  if (typeof v.actif !== 'boolean') return false;
  if (v.frequence !== 'hebdomadaire' && v.frequence !== 'mensuelle') {
    return false;
  }
  if (!liste(v.rapports) || !v.rapports.every((c) => codes.includes(c))) {
    return false;
  }
  if (
    !liste(v.formats) ||
    v.formats.length === 0 ||
    !v.formats.every((f) => f === 'pdf' || f === 'xlsx')
  ) {
    return false;
  }
  if (
    !liste(v.destinataires) ||
    v.destinataires.length > 20 ||
    !v.destinataires.every((d) => COURRIEL.test(d))
  ) {
    return false;
  }
  return !v.actif || (v.rapports.length > 0 && v.destinataires.length > 0);
}

/** Lecture tolérante : une valeur abîmée désactive l'envoi plutôt que de le fausser. */
export function lireEnvoi(valeur: unknown): ConfigEnvoi {
  if (!envoiValide(valeur)) return { ...ENVOI_PAR_DEFAUT, actif: false };
  const v = valeur as ConfigEnvoi;
  return {
    actif: v.actif,
    frequence: v.frequence,
    rapports: [...new Set(v.rapports)],
    formats: [...new Set(v.formats)],
    destinataires: [...new Set(v.destinataires.map((d) => d.toLowerCase()))],
  };
}

function jourUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Lundi pour l'hebdomadaire, le 1er du mois pour le mensuel. */
export function estJourDEnvoi(
  frequence: FrequenceEnvoi,
  maintenant: Date,
): boolean {
  return frequence === 'hebdomadaire'
    ? maintenant.getUTCDay() === 1
    : maintenant.getUTCDate() === 1;
}

/** Dernière période complète : semaine (lundi→dimanche) ou mois précédent. */
export function periodeEcoulee(
  frequence: FrequenceEnvoi,
  maintenant: Date,
): { du: string; au: string } {
  const jour = jourUtc(maintenant);
  let du: Date;
  let au: Date;
  if (frequence === 'hebdomadaire') {
    const ecartLundi = (jour.getUTCDay() + 6) % 7;
    const lundi = new Date(jour.getTime() - ecartLundi * UN_JOUR);
    du = new Date(lundi.getTime() - 7 * UN_JOUR);
    au = new Date(lundi.getTime() - UN_JOUR);
  } else {
    du = new Date(Date.UTC(jour.getUTCFullYear(), jour.getUTCMonth() - 1, 1));
    au = new Date(Date.UTC(jour.getUTCFullYear(), jour.getUTCMonth(), 0));
  }
  return {
    du: du.toISOString().slice(0, 10),
    au: au.toISOString().slice(0, 10),
  };
}
