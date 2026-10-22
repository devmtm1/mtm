/**
 * Origines autorisées à appeler l'API : celles de `CORS_ORIGIN` (séparées par
 * des virgules), plus, pour un domaine nu comme `https://mtm-immobilier.com`,
 * sa variante `https://www.mtm-immobilier.com` — et inversement.
 *
 * Un site public est presque toujours atteignable avec et sans « www » : oublier
 * l'une des deux dans la variable laisse la moitié des visiteurs devant des
 * pages vides, alors que tout marche sur le poste de celui qui a configuré.
 */
export function originesAutorisees(corsOrigin: string): string[] {
  const origines = corsOrigin
    .split(',')
    .map((origine) => origine.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const jumelles = origines.flatMap((origine) => {
    let url: URL;
    try {
      url = new URL(origine);
    } catch {
      return [];
    }
    const { protocol, hostname, port } = url;
    const suffixe = port ? `:${port}` : '';
    if (hostname.startsWith('www.'))
      return [`${protocol}//${hostname.slice(4)}${suffixe}`];
    // Seul un domaine nu (deux étiquettes : « mtm-immobilier.com ») a un « www » évident ;
    // « admin.mtm-immobilier.com » ou « localhost » n'en ont pas.
    if (hostname.split('.').length === 2)
      return [`${protocol}//www.${hostname}${suffixe}`];
    return [];
  });

  return [...new Set([...origines, ...jumelles])];
}
