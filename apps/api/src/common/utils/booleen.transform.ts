/**
 * Booléen reçu en texte : formulaires multipart (`isPublic=false`) et query
 * string. L'API active `enableImplicitConversion`, qui applique
 * `Boolean("false")` — soit `true` — **avant** les `@Transform`. Le paramètre
 * `value` d'un transformateur est donc déjà faux ; la valeur d'origine se lit
 * dans `obj[key]`. Sans cela, un document envoyé « non public » devient
 * public.
 *
 * Toute autre valeur est renvoyée telle quelle pour que `@IsBoolean()` la
 * rejette au lieu de l'interpréter.
 */
export const versBooleen = ({
  value,
  obj,
  key,
}: {
  value: unknown;
  obj?: Record<string, unknown>;
  key?: string;
}): unknown => {
  const brut = obj && key !== undefined && key in obj ? obj[key] : value;
  if (typeof brut === 'boolean') return brut;
  if (brut === 'true' || brut === '1') return true;
  if (brut === 'false' || brut === '0') return false;
  return brut;
};
