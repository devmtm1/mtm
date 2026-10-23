/**
 * Identifiant public d'une image Cloudinary à partir de son adresse de livraison, ou `null` si l'adresse
 * n'en est pas une (image du site, lien extérieur…). Sert à supprimer l'ancienne image quand une nouvelle la
 * remplace. Exemple : `https://res.cloudinary.com/x/image/upload/f_auto,q_auto/v1/mtm-prod/mtm/pages/bandeau`
 * → `mtm-prod/mtm/pages/bandeau`.
 */
export function publicIdDepuisUrl(
  url: string | null | undefined,
): string | null {
  if (!url || !/^https:\/\/res\.cloudinary\.com\//i.test(url)) return null;
  const correspondance =
    /\/image\/upload\/(?:[^/]+\/)*?v\d+\/(.+?)(?:\.[a-z0-9]{2,5})?(?:\?.*)?$/i.exec(
      url,
    );
  return correspondance?.[1] ?? null;
}
