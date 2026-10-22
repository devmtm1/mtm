import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  KeyRound,
  LandPlot,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '../../routes';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { useLocationsCatalog } from '../../hooks/useLocations';
import { AppPropertyCard } from '../mobile/AppPropertyCard';
import { ServicesSheet } from '../mobile/ServicesSheet';
import { mergeRecent } from '../mobile/recent-properties';
import { Skeleton } from '../ui/Skeleton';
import { useHeroContent } from './hero-content';
import { HeroBackdrop } from './HeroBackdrop';
import { PromoBanner } from './PromoBanner';
import { useHeroPromotions } from '../../hooks/useHeroPromotions';
import { ServicesSection } from './ServicesSection';
import { UpcomingProjectsSection } from './UpcomingProjectsSection';
import { RealisationsPreviewSection } from './RealisationsPreviewSection';
import { VideosSection } from './VideosSection';
import { AboutPreviewSection } from './AboutPreviewSection';
import { TestimonialsSection } from './TestimonialsSection';
import { ContactCtaSection } from './ContactCtaSection';
import { Reveal } from '../ui/Reveal';

interface Category {
  label: string;
  to?: string;
  icon: LucideIcon;
  /** Teinte de l'icône, tirée de la palette de MTM. */
  tone: string;
  box: string;
}

const CATEGORIES: Category[] = [
  { label: 'Vente', to: ROUTES.catalog, icon: Home, tone: 'text-mtm-primary', box: 'bg-mtm-primary-subtle' },
  { label: 'Location', to: ROUTES.locations, icon: KeyRound, tone: 'text-mtm-success', box: 'bg-mtm-success/10' },
  {
    label: 'Terrains',
    to: `${ROUTES.catalog}?typeBien=terrain`,
    icon: LandPlot,
    tone: 'text-mtm-accent',
    box: 'bg-mtm-accent-subtle',
  },
  { label: 'Autres', icon: LayoutGrid, tone: 'text-mtm-primary-medium', box: 'bg-mtm-info-bg' },
];

/**
 * Accueil de l'application mobile : un visuel d'accueil avec la recherche, les
 * grandes catégories, puis les biens les plus récents — ventes et locations
 * mêlées — et les sections habituelles du site. Tout vient du catalogue et du
 * contenu administré au back-office.
 */
export function MobileHome() {
  const navigate = useNavigate();
  const { title } = useHeroContent();
  const { promotions, loading: promotionsLoading } = useHeroPromotions();
  const [query, setQuery] = useState('');
  const [othersOpen, setOthersOpen] = useState(false);
  const closeOthers = useCallback(() => setOthersOpen(false), []);

  // Cette rangée ne montre que les biens en vedette (mis en avant par MTM), ventes et locations.
  const terrainsFilters = useMemo(() => ({ misEnAvant: true, pageSize: 6 }), []);
  const locationsFilters = useMemo(() => ({ misEnAvant: true, pageSize: 6 }), []);
  const terrains = useTerrainsCatalog(terrainsFilters);
  const locations = useLocationsCatalog(locationsFilters);

  const recents = useMemo(
    () => mergeRecent(terrains.data?.items ?? [], locations.data?.items ?? []),
    [terrains.data, locations.data],
  );
  const loading = terrains.loading || locations.loading;

  function submit(event: FormEvent): void {
    event.preventDefault();
    const text = query.trim();
    navigate(text ? `${ROUTES.catalog}?search=${encodeURIComponent(text)}` : ROUTES.catalog);
  }

  return (
    <div className="pb-4">
      {/* Visuel d'accueil : la vidéo du site, le titre administré, et la recherche
          qui chevauche le bas de la carte. */}
      <section className="px-4 pt-3">
        <div className="relative">
          {/* Carte plus basse et moins chargée : la vidéo de MTM reste visible. Seul
              le bas est assombri, juste assez pour lire le titre. */}
          <div
            className={
              promotions.length > 0
                ? // Format des affiches (16/9), grands coins : le visuel de la publicité remplit tout le cadre.
                  'relative aspect-[16/9] w-full overflow-hidden rounded-[1.75rem] bg-mtm-primary-dark shadow-[0_12px_32px_rgba(26,73,116,0.22)]'
                : 'relative h-[12.5rem] overflow-hidden rounded-3xl bg-mtm-primary-dark shadow-card'
            }
          >
            {promotions.length > 0 ? (
              // Publicités en ligne : elles remplacent la vidéo et le titre, qui
              // masqueraient les affiches (le titre reste lisible par les lecteurs d'écran).
              <>
                <h1 className="sr-only">{title}</h1>
                <PromoBanner promotions={promotions} variant="card" />
              </>
            ) : (
              <>
                <HeroBackdrop lecture={!promotionsLoading} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 px-5 pb-9">
                  <h1 className="line-clamp-2 whitespace-pre-line font-display text-[1.3rem] font-bold leading-tight text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
                    {title}
                  </h1>
                </div>
              </>
            )}
          </div>

          <form
            onSubmit={submit}
            role="search"
            aria-label="Recherche de biens"
            className={`flex items-center gap-2 rounded-full border border-mtm-border/70 bg-mtm-surface py-1.5 pl-4 pr-1.5 shadow-[0_10px_30px_rgba(31,41,55,0.18)] ${
              // Avec une publicité, la recherche passe sous la carte : elle ne cache pas l'affiche.
              promotions.length > 0 ? 'mt-3' : 'absolute inset-x-4 -bottom-6'
            }`}
          >
            <Search className="h-[18px] w-[18px] shrink-0 text-mtm-muted" aria-hidden="true" />
            <input
              type="search"
              enterKeyHint="search"
              aria-label="Rechercher un bien"
              placeholder="Rechercher un bien…"
              className="h-9 min-w-0 flex-1 bg-transparent text-sm text-mtm-text placeholder:text-mtm-muted focus:outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Link
              to={ROUTES.catalog}
              aria-label="Filtrer les biens"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mtm-primary-subtle text-mtm-primary active:scale-90"
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
          </form>
        </div>
      </section>

      <ul className={`${promotions.length > 0 ? 'mt-5' : 'mt-12'} grid grid-cols-4 gap-3 px-4`} aria-label="Catégories">
        {CATEGORIES.map(({ label, to, icon: Icon, tone, box }) => {
          const inner = (
            <>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${box} ${tone}`}>
                <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-mtm-text">{label}</span>
            </>
          );
          const cls =
            'flex w-full flex-col items-center gap-2 rounded-2xl border border-mtm-border/70 bg-mtm-surface px-1 py-3 shadow-card transition-transform active:scale-95';
          return (
            <li key={label}>
              {to ? (
                <Link to={to} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button type="button" className={cls} onClick={() => setOthersOpen(true)} aria-haspopup="dialog">
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <section className="mt-7" aria-labelledby="recents-title">
        <div className="flex items-center justify-between px-4">
          <h2 id="recents-title" className="flex items-center gap-2 font-display text-lg font-bold text-mtm-text">
            <Star className="h-5 w-5 fill-current text-mtm-accent" aria-hidden="true" />
            Biens en vedette
          </h2>
          <Link to={ROUTES.catalog} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70">
            Voir tout
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {loading && (
          <div className="mt-3 flex gap-3 overflow-hidden px-4" aria-hidden="true">
            {[0, 1].map((index) => (
              <div key={index} className="w-[72%] max-w-[17.5rem] shrink-0 overflow-hidden rounded-[1.4rem] border border-mtm-border/70 bg-mtm-surface">
                <Skeleton className="aspect-[3/2] w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && recents.length > 0 && (
          <ul
            className="mt-3 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Biens en vedette"
          >
            {recents.map((card) => (
              <li key={`${card.kind}-${card.id}`} className="w-[72%] max-w-[17.5rem] shrink-0 snap-start">
                <AppPropertyCard card={card} />
              </li>
            ))}
          </ul>
        )}

        {!loading && recents.length === 0 && (
          <p className="mx-4 mt-3 rounded-2xl border border-dashed border-mtm-border bg-mtm-surface p-5 text-center text-sm text-mtm-muted">
            Aucun bien en vedette pour le moment. Découvrez tous nos biens, ou contactez-nous pour connaître nos prochaines offres.
          </p>
        )}
      </section>

      <div className="mt-2">
        <Reveal>
          <VideosSection />
        </Reveal>
        <Reveal>
          <ServicesSection />
        </Reveal>
        <Reveal>
          <UpcomingProjectsSection />
        </Reveal>
        <Reveal>
          <RealisationsPreviewSection />
        </Reveal>
        <Reveal>
          <TestimonialsSection />
        </Reveal>
        <Reveal>
          <AboutPreviewSection />
        </Reveal>
        <Reveal>
          <ContactCtaSection />
        </Reveal>
      </div>

      {othersOpen && <ServicesSheet title="Autres services" onClose={closeOthers} />}
    </div>
  );
}
