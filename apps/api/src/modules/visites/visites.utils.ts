import { createHash } from 'node:crypto';
import { PERIODES_JOURS, type SourceVisite } from './visites.types';

/** Robots d'indexation, aperçus de liens, outils de mesure et scripts : jamais comptés comme visiteurs. */
const ROBOTS =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp\/|telegram|preview|monitor|headless|lighthouse|pingdom|uptime|curl\/|wget|python|axios|node-fetch|go-http|java\/|postman/i;

export function estUnRobot(userAgent: string | undefined): boolean {
  if (!userAgent || userAgent.length < 10) return true;
  return ROBOTS.test(userAgent);
}

/** Jour (UTC, soit l'heure de Dakar) à minuit. */
export function jourDe(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function ajouterJours(jour: Date, nombre: number): Date {
  return new Date(jour.getTime() + nombre * 86_400_000);
}

export function formaterJour(jour: Date): string {
  return jour.toISOString().slice(0, 10);
}

/** Ramène une période libre à 7, 30 ou 90 jours. */
export function periodeValide(valeur: unknown): number {
  const demandee = Number(valeur);
  if (!Number.isFinite(demandee)) return 30;
  return PERIODES_JOURS.reduce((meilleure, candidate) =>
    Math.abs(candidate - demandee) < Math.abs(meilleure - demandee)
      ? candidate
      : meilleure,
  );
}

/**
 * Empreinte d'un visiteur pour un jour : hachage salé de l'adresse et du navigateur. Le jour
 * fait partie du hachage : l'empreinte ne permet pas de suivre quelqu'un d'un jour à l'autre, et
 * l'adresse ne peut pas en être retrouvée.
 */
export function empreinteVisiteur(
  sel: string,
  jour: Date,
  adresse: string,
  userAgent: string,
): string {
  return createHash('sha256')
    .update(`${sel}|${formaterJour(jour)}|${adresse}|${userAgent}`)
    .digest('hex')
    .slice(0, 32);
}

/** Série continue : un point par jour de `depuis` à `jusqua`, à zéro quand rien n'a été compté. */
export function jours(depuis: Date, jusqua: Date): Date[] {
  const liste: Date[] = [];
  for (let jour = depuis; jour <= jusqua; jour = ajouterJours(jour, 1))
    liste.push(jour);
  return liste;
}

export function sourceValide(valeur: unknown): SourceVisite {
  return typeof valeur === 'string' &&
    (
      [
        'direct',
        'google',
        'facebook',
        'instagram',
        'whatsapp',
        'tiktok',
        'youtube',
        'autre',
      ] as string[]
    ).includes(valeur)
    ? (valeur as SourceVisite)
    : 'direct';
}
