/**
 * Convertit une durée au format "15m", "7d", "1h", "30s" en millisecondes.
 * Évite une dépendance externe pour un besoin aussi simple.
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Format de durée invalide: "${duration}" (attendu ex: "15m", "7d")`,
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const unitToMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * unitToMs[unit];
}
