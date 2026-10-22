const CLE = 'mtm.rechargement-version';
/** Une seule tentative par minute : si le rechargement ne règle rien, on ne boucle pas. */
const DELAI_MS = 60_000;

/**
 * Après un déploiement, une page restée ouverte réclame des fichiers de l'ancienne version, qui
 * n'existent plus : le serveur répond par la page d'accueil et le navigateur refuse le « module ».
 * L'écran visé ne s'ouvre pas et le clic semble sans effet.
 */
export function estErreurDeChargement(erreur: unknown): boolean {
  const message = erreur instanceof Error ? erreur.message : String(erreur ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message)
  );
}

/** Recharge la page pour récupérer la nouvelle version ; renvoie `false` si on vient déjà de le faire. */
export function rechargerSiVersionPerimee(
  maintenant = Date.now(),
  recharger: () => void = () => window.location.reload(),
): boolean {
  try {
    const derniere = Number(sessionStorage.getItem(CLE) ?? 0);
    if (maintenant - derniere < DELAI_MS) return false;
    sessionStorage.setItem(CLE, String(maintenant));
  } catch {
    // Stockage indisponible (navigation privée stricte) : on recharge quand même, une fois par erreur.
  }
  recharger();
  return true;
}
