import { useState } from 'react';
import type { ShowcaseCategory } from '../../types/showcase';
import { useShowcase } from '../../hooks/useShowcase';
import { useEditableContent } from '../../hooks/useEditableContent';
import { cloudinarySrcSet } from '../../utils/cloudinary';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { VitrineCard } from './VitrineCard';

/** Photo du bandeau quand aucune image n'a été choisie dans le back-office. */
const IMAGE_PAR_DEFAUT = '/hero-poster.jpg';

interface ShowcaseVitrineProps {
  category: ShowcaseCategory;
  /**
   * Début des clés de contenu de la page (« realisations », « projets-a-venir ») : le bandeau lit
   * `<prefixe>.eyebrow`, `.title`, `.subtitle`, `.texte`, `.legende` et `.image` dans Contenus du site.
   */
  prefixe: string;
  /** Textes utilisés tant que rien n'est saisi dans le back-office. */
  defauts: { eyebrow: string; title: string; subtitle: string; texte: string };
  emptyLabel: string;
}

/**
 * Page vitrine : un grand bandeau photo aux couleurs de MTM (trait rouge, titre blanc, texte), puis
 * les projets en cartes qui chevauchent le bas du bandeau. Les projets viennent du back-office
 * (Site web › Réalisations & projets) ; rien n'est affiché en dur.
 */
export function ShowcaseVitrine({ category, prefixe, defauts, emptyLabel }: ShowcaseVitrineProps) {
  const { data, loading, error } = useShowcase(category);
  const { text, loading: contenuEnCours } = useEditableContent();
  const [imageMorte, setImageMorte] = useState(false);

  const eyebrow = text(`${prefixe}.eyebrow`, defauts.eyebrow);
  const title = text(`${prefixe}.title`, defauts.title);
  const subtitle = text(`${prefixe}.subtitle`, defauts.subtitle);
  const texte = text(`${prefixe}.texte`, defauts.texte);
  const legende = text(`${prefixe}.legende`, '');
  const choisie = text(`${prefixe}.image`, IMAGE_PAR_DEFAUT);
  const image = imageMorte ? IMAGE_PAR_DEFAUT : choisie;
  const srcSet = image === IMAGE_PAR_DEFAUT ? '' : cloudinarySrcSet(image);
  // Les textes se fondent à l'arrivée du contenu : pas de flash du texte par défaut avant le texte choisi.
  const fondu = `transition-opacity duration-300 ${contenuEnCours ? 'opacity-0' : 'opacity-100'}`;

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-mtm-primary-dark text-white">
        {/* Photo du site, assombrie à gauche pour que le texte se lise sur n'importe quelle image. */}
        <img
          src={image}
          srcSet={srcSet || undefined}
          sizes={srcSet ? '100vw' : undefined}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          onError={() => setImageMorte(true)}
          className={`absolute inset-0 -z-20 h-full w-full object-cover object-[70%_center] ${fondu}`}
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a2142]/95 via-[#0a2142]/80 to-[#0a2142]/25 max-lg:to-[#0a2142]/55" />
        <div className={`mx-auto max-w-6xl px-4 pb-28 pt-9 sm:px-6 sm:pt-12 lg:pb-40 lg:pt-16 ${fondu}`}>
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/90 sm:text-xs">
            <span aria-hidden="true" className="h-[3px] w-12 rounded-full bg-mtm-accent" />
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-[2.1rem] font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-lg font-light leading-snug text-white/90 sm:text-2xl lg:text-[1.7rem]">{subtitle}</p>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/90 sm:text-base">{texte}</p>
        </div>
      </section>

      <section className="relative mx-auto -mt-20 max-w-6xl px-4 pb-14 sm:px-6 lg:-mt-28" aria-label={eyebrow}>
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-mtm-border bg-mtm-surface shadow-card">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="space-y-3 p-6">
                  <Skeleton className="h-1 w-9" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="rounded-xl bg-mtm-surface p-4 shadow-card">
            <EmptyState title="Impossible de charger le contenu" description={error} />
          </div>
        )}
        {!loading && !error && (!data || data.length === 0) && (
          <div className="rounded-xl bg-mtm-surface p-4 shadow-card">
            <EmptyState title={emptyLabel} />
          </div>
        )}
        {!loading && !error && data && data.length > 0 && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((item) => (
              <li key={item.id}>
                <VitrineCard item={item} />
              </li>
            ))}
          </ul>
        )}

        {legende && (
          <p className="mt-10 flex items-center justify-center gap-4 text-center text-sm text-mtm-primary-dark">
            <span aria-hidden="true" className="hidden h-px w-16 bg-mtm-primary-dark/40 sm:block" />
            {legende}
            <span aria-hidden="true" className="hidden h-px w-16 bg-mtm-primary-dark/40 sm:block" />
          </p>
        )}
      </section>
    </div>
  );
}
