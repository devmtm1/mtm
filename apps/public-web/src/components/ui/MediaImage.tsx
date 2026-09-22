import { ImageOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cloudinarySrcSet } from '../../utils/cloudinary';

interface MediaImageProps {
  /** URL unique, ou liste de candidates essayées dans l'ordre. */
  src: string | null | undefined | (string | null | undefined)[];
  alt: string;
  /** Classes appliquées à l'image ET au conteneur de repli, pour garder le même gabarit. */
  className?: string;
  /** Message affiché quand plus aucune source n'est exploitable. */
  fallbackLabel?: string;
  /** Masque le libellé de repli (vignettes, aperçus décoratifs). */
  compact?: boolean;
  loading?: 'lazy' | 'eager';
  /**
   * Place réellement occupée par l'image, en CSS (`sizes`). C'est ce qui
   * permet au navigateur de télécharger la bonne variante : sans cette
   * indication, il suppose la pleine largeur de l'écran et charge la plus
   * grande. Par défaut, une carte de grille.
   */
  sizes?: string;
  'aria-hidden'?: boolean;
}

/**
 * Image de média distant tolérante aux URL mortes.
 *
 * Un média peut disparaître du stockage (asset supprimé côté Cloudinary,
 * purge de rétention) alors que sa référence subsiste en base : sans repli,
 * le navigateur affiche une icône « image cassée » et le texte alternatif
 * brut, ce qui dégrade fortement une fiche terrain. On essaie donc les
 * sources suivantes puis, en dernier recours, un placeholder à la charte.
 */
export function MediaImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'Photo à venir',
  compact = false,
  loading = 'lazy',
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  'aria-hidden': ariaHidden,
}: MediaImageProps) {
  const sources = useMemo(
    () => (Array.isArray(src) ? src : [src]).filter((url): url is string => Boolean(url)),
    [src],
  );
  const [index, setIndex] = useState(0);

  // De nouvelles sources doivent pouvoir réussir même si les précédentes ont échoué.
  useEffect(() => {
    setIndex(0);
  }, [sources]);

  const current = sources[index];
  // Vide hors Cloudinary (illustration locale) : le navigateur s'en tient
  // alors à `src`.
  const srcSet = current ? cloudinarySrcSet(current) : '';

  if (!current) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-mtm-border/40 text-mtm-muted ${className}`}
        aria-hidden={ariaHidden}
      >
        <ImageOff className={compact ? 'h-4 w-4' : 'h-6 w-6'} aria-hidden="true" />
        {compact ? (
          <span className="sr-only">{fallbackLabel}</span>
        ) : (
          <span className="text-xs">{fallbackLabel}</span>
        )}
      </div>
    );
  }

  return (
    <img
      key={current}
      src={current}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      aria-hidden={ariaHidden}
      onError={() => setIndex((previous) => previous + 1)}
      className={className}
    />
  );
}
