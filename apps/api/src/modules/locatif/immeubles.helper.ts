/**
 * Calculs de synthèse d'une propriété (villa divisée, immeuble, résidence), sans accès à la base : testables seuls.
 */

export interface LogementSynthese {
  statut: string;
  modeLocation: string;
  /** Loyer annoncé du logement (le bail en cours l'emporte quand il y en a un). */
  loyerMensuel: number | null;
  /** Bail en cours : loyer convenu et sommes échues non payées. */
  bail: { loyerMensuel: number; impaye: number } | null;
}

export interface SyntheseImmeuble {
  logements: number;
  loues: number;
  disponibles: number;
  /** En travaux ou indisponibles. */
  horsMarche: number;
  /** Part des logements loués, en pourcentage entier. */
  tauxOccupation: number;
  /** Loyers mensuels des baux en cours. */
  loyerMensuelAttendu: number;
  /** Ce que rapporterait la propriété pleine : baux en cours + loyers annoncés des logements libres. */
  loyerMensuelPotentiel: number;
  /** Logements dont au moins une échéance échue n'est pas soldée. */
  logementsEnRetard: number;
  /** Total des sommes échues non payées. */
  impayes: number;
}

/**
 * Les séjours de courte durée n'entrent pas dans les loyers mensuels : leur revenu dépend de l'occupation, il ne se
 * « attend » pas. Ils comptent en revanche dans les logements et le taux d'occupation.
 */
export function syntheseImmeuble(
  logements: readonly LogementSynthese[],
): SyntheseImmeuble {
  const loues = logements.filter((l) => l.statut === 'loue').length;
  const disponibles = logements.filter((l) => l.statut === 'disponible').length;
  const mensuels = logements.filter((l) => l.modeLocation !== 'courte_duree');

  const loyerMensuelAttendu = mensuels.reduce(
    (somme, l) => somme + (l.bail?.loyerMensuel ?? 0),
    0,
  );
  const loyerMensuelPotentiel = mensuels.reduce(
    (somme, l) =>
      somme + (l.bail ? l.bail.loyerMensuel : (l.loyerMensuel ?? 0)),
    0,
  );
  const enRetard = logements.filter((l) => (l.bail?.impaye ?? 0) > 0);

  return {
    logements: logements.length,
    loues,
    disponibles,
    horsMarche: logements.length - loues - disponibles,
    tauxOccupation:
      logements.length === 0 ? 0 : Math.round((loues / logements.length) * 100),
    loyerMensuelAttendu,
    loyerMensuelPotentiel,
    logementsEnRetard: enRetard.length,
    impayes: enRetard.reduce((somme, l) => somme + (l.bail?.impaye ?? 0), 0),
  };
}

/** Repères par défaut de n logements : A1, A2, A3… (ou le préfixe donné). */
export function reperesParDefaut(nombre: number, prefixe = 'A'): string[] {
  return Array.from({ length: nombre }, (_, index) => `${prefixe}${index + 1}`);
}
