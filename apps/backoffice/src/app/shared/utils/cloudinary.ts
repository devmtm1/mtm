/**
 * Vignettes des images Cloudinary.
 *
 * L'API renvoie des liens déjà en format et compression automatiques, mais à
 * la taille d'origine : une photo de visite pèse plusieurs centaines de
 * kilo-octets, alors qu'une vignette de 320 pixels suffit à relire un
 * constat. On dérive donc la largeur voulue, sans toucher au reste du lien.
 */
const IMAGE_CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

/** Un segment de transformation (`f_auto,q_auto`), à distinguer de la version (`v1`). */
const SEGMENT_TRANSFORMATION = /^[a-z]{1,3}_[^/]+$/;

export function estImageCloudinary(url: string | null | undefined): boolean {
  return Boolean(url) && IMAGE_CLOUDINARY.test(url as string);
}

/**
 * Même image, à la largeur demandée. Renvoie le lien inchangé s'il ne vient
 * pas de Cloudinary (document signé servi par l'API, par exemple).
 */
export function vignetteCloudinary(url: string, largeur = 320): string {
  if (!estImageCloudinary(url)) return url;
  const [base, reste] = url.split('/upload/');
  const segments = reste.split('/');
  if (SEGMENT_TRANSFORMATION.test(segments[0])) {
    // Une transformation existe déjà : on y ajoute la largeur pour garder le
    // format et la qualité automatiques posés par l'API.
    segments[0] = `${segments[0]},w_${largeur},c_fill,ar_4:3`;
  } else {
    segments.unshift(`w_${largeur},c_fill,ar_4:3`);
  }
  return `${base}/upload/${segments.join('/')}`;
}
