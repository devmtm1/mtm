import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  FileSearch,
  Hammer,
  Home,
  KeyRound,
  LandPlot,
  LayoutGrid,
  Newspaper,
  Search,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '../../routes';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { useLocationsCatalog } from '../../hooks/useLocations';
import { AppPropertyCard } from '../mobile/AppPropertyCard';
import { MobileSheet } from '../mobile/MobileSheet';
import { mergeRecent } from '../mobile/recent-properties';
import { Skeleton } from '../ui/Skeleton';
import { useHeroContent } from './hero-content';
import { ServicesSection } from './ServicesSection';
import { UpcomingProjectsSection } from './UpcomingProjectsSection';
import { RealisationsPreviewSection } from './RealisationsPreviewSection';
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

const OTHER_LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: ROUTES.gestionLocative, label: 'Gestion locative', icon: KeyRound },
  { to: ROUTES.construction, label: 'Construction', icon: Hammer },
  { to: ROUTES.demarches, label: 'Démarches administratives', icon: FileSearch },
  { to: ROUTES.realisations, label: 'Nos réalisations', icon: Sparkles },
  { to: ROUTES.projetsAVenir, label: 'Projets à venir', icon: Hammer },
  { to: ROUTES.actualites, label: 'Actualités et conseils', icon: Newspaper },
];

/**
 * Accueil de l'application mobile : un visuel d'accueil avec la recherche, les
 * grandes catégories, puis les biens les plus récents — ventes et locations
 * mêlées — et les sections habituelles du site. Tout vient du catalogue et du
 * contenu administré au back-office.
 */
export function MobileHome() {
  const navigate = useNavigate();
  const { title, subtitle } = useHeroContent();
  const [query, setQuery] = useState('');
  const [othersOpen, setOthersOpen] = useState(false);

  const terrainsFilters = useMemo(() => ({ pageSize: 6 }), []);
  const locationsFilters = useMemo(() => ({ pageSize: 6 }), []);
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
      {/* Visuel d'accueil : l'image du site, le titre administré, et la recherche
          qui chevauche le bas de la carte. */}
      <section className="px-4 pt-3">
        <div className="relative">
          <div className="relative h-[17rem] overflow-hidden rounded-3xl bg-mtm-primary-dark shadow-card">
            <img src="/hero-poster.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" aria-hidden="true" />
            <div className="absolute inset-0 bg-mtm-primary-dark/20 mix-blend-multiply" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-5 pb-10">
              <h1 className="whitespace-pre-line font-display text-[1.65rem] font-bold leading-tight text-white drop-shadow">{title}</h1>
              <p className="line-clamp-2 text-[13px] text-white/85">{subtitle}</p>
            </div>
          </div>

          <form
            onSubmit={submit}
            role="search"
            aria-label="Recherche de biens"
            className="absolute inset-x-4 -bottom-6 flex items-center gap-2 rounded-full border border-mtm-border/70 bg-mtm-surface py-1.5 pl-4 pr-1.5 shadow-[0_10px_30px_rgba(31,41,55,0.18)]"
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

      <ul className="mt-12 grid grid-cols-4 gap-3 px-4" aria-label="Catégories">
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
          <h2 id="recents-title" className="font-display text-lg font-bold text-mtm-text">
            Nos biens récents
          </h2>
          <Link to={ROUTES.catalog} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70">
            Voir tout
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {loading && (
          <div className="mt-3 flex gap-3 overflow-hidden px-4" aria-hidden="true">
            {[0, 1].map((index) => (
              <div key={index} className="w-[62%] shrink-0 overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-surface">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
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
            aria-label="Biens récents"
          >
            {recents.map((card) => (
              <li key={`${card.kind}-${card.id}`} className="w-[62%] max-w-[15rem] shrink-0 snap-start">
                <AppPropertyCard card={card} />
              </li>
            ))}
          </ul>
        )}

        {!loading && recents.length === 0 && (
          <p className="mx-4 mt-3 rounded-2xl border border-dashed border-mtm-border bg-mtm-surface p-5 text-center text-sm text-mtm-muted">
            Aucun bien publié pour le moment. Revenez bientôt, ou contactez-nous pour connaître nos prochaines offres.
          </p>
        )}
      </section>

      <div className="mt-2">
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
          <ContactCtaSection />
        </Reveal>
      </div>

      {othersOpen && (
        <MobileSheet title="Autres services" onClose={() => setOthersOpen(false)}>
          <ul className="flex flex-col gap-1 pb-2">
            {OTHER_LINKS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => setOthersOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-semibold text-mtm-text active:scale-[0.98] active:bg-mtm-bg"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 text-mtm-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </MobileSheet>
      )}
    </div>
  );
}
