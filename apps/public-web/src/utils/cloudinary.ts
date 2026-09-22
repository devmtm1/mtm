/**
 * Variantes de taille des images Cloudinary.
 *
 * L'API renvoie déjà des URL en format et compression automatiques, mais
 * toujours à la taille d'origine : une photo de terrain pèse ~600 Ko alors
 * qu'une vignette de catalogue n'a besoin que de 800 pixels de large, soit
 * ~50 Ko. On dérive donc ici les largeurs à proposer au navigateur, qui
 * choisit celle qui correspond à l'écran et à la place réellement occupée.
 */

/** Largeurs proposées, du téléphone à l'écran large en haute densité. */
const WIDTHS = [400, 800, 1200, 1600];

/** Une URL de livraison d'image Cloudinary, seule à accepter ces variantes. */
const CLOUDINARY_IMAGE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

/**
 * Un segment de transformation Cloudinary (`f_auto,q_auto`) se reconnaît à
 * ses paramètres `x_y`. À ne pas confondre avec le segment de version
 * (`v1`) ni avec le début de l'identifiant du fichier.
 */
const TRANSFORMATION_SEGMENT = /^[a-z]{1,3}_[^/]+$/;

export function isCloudinaryImage(url: string): boolean {
  return CLOUDINARY_IMAGE.test(url);
}

/**
 * Même image, à la largeur demandée. L'URL est renvoyée telle quelle si elle
 * ne vient pas de Cloudinary (média local, illustration statique).
 */
export function cloudinaryWidth(url: string, width: number): string {
  if (!isCloudinaryImage(url)) return url;

  const [base, reste] = url.split(/\/upload\//);
  const segments = reste.split('/');
  // Une transformation existe déjà : on y ajoute la largeur, pour ne pas
  // perdre le format et la qualité automatiques posés par l'API.
  if (TRANSFORMATION_SEGMENT.test(segments[0])) {
    segments[0] = `${segments[0]},w_${width}`;
  } else {
    segments.unshift(`w_${width}`);
  }
  return `${base}/upload/${segments.join('/')}`;
}

/**
 * Jeu de variantes pour l'attribut `srcSet`. Renvoie une chaîne vide quand
 * l'image ne vient pas de Cloudinary : le navigateur s'en tient alors à
 * `src`, sans requête inutile.
 */
export function cloudinarySrcSet(url: string): string {
  if (!isCloudinaryImage(url)) return '';
  return WIDTHS.map((width) => `${cloudinaryWidth(url, width)} ${width}w`).join(', ');
}
