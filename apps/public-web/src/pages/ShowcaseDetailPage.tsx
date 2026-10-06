import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, MessageSquare } from 'lucide-react';
import { ROUTES } from '../routes';
import { useShowcase, useShowcaseItem } from '../hooks/useShowcase';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { MediaImage } from '../components/ui/MediaImage';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LinkButton } from '../components/ui/LinkButton';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { ShowcaseCard } from '../components/showcase/ShowcaseCard';
import { ContactModal } from '../components/contact/ContactModal';
import { CtaBand } from '../components/ui/CtaBand';
import { Carousel } from '../components/ui/Carousel';
import { DetailActionBar } from '../components/mobile/DetailActionBar';
import { formatDate } from '../utils/format';

const CATEGORY_INFO = {
  realisation: {
    label: 'Réalisation',
    listLabel: 'Toutes les réalisations',
    listRoute: ROUTES.realisations,
    dateLabel: 'Livré le',
    cta: 'Un projet similaire ?',
    ctaText: 'Décrivez-nous votre projet : notre équipe vous répond sous 48 h.',
  },
  projet_a_venir: {
    label: 'Projet à venir',
    listLabel: 'Tous les projets à venir',
    listRoute: ROUTES.projetsAVenir,
    dateLabel: 'Lancement prévu',
    cta: 'Intéressé par ce projet ?',
    ctaText: 'Laissez-nous vos coordonnées pour être informé en priorité de la commercialisation.',
  },
} as const;

function categoryInfo(category: string) {
  return category === 'projet_a_venir' ? CATEGORY_INFO.projet_a_venir : CATEGORY_INFO.realisation;
}

/**
 * Fiche d'une réalisation ou d'un projet à venir : grande photo, description
 * complète, lieu et date, puis les autres éléments de la même catégorie.
 * Les cartes des listes restent courtes, le détail vit ici.
 */
export function ShowcaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: item, loading, error } = useShowcaseItem(id);
  const { data: siblings } = useShowcase(item?.category);
  const [contactOpen, setContactOpen] = useState(false);

  const info = categoryInfo(item?.category ?? 'realisation');

  usePageMetadata({
    title: item ? `${item.title} – ${info.label}` : info.label,
    description: item?.description?.slice(0, 160) ?? undefined,
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
        <span className="sr-only">Chargement…</span>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
        <Skeleton className="mt-8 aspect-[16/9] w-full rounded-lg" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Projet introuvable"
          description={error ?? 'Cet élément n’est plus publié.'}
          action={<LinkButton to={ROUTES.realisations} variant="secondary">Voir les réalisations</LinkButton>}
        />
      </div>
    );
  }

  const others = (siblings ?? []).filter((sibling) => sibling.id !== item.id).slice(0, 4);

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:py-10">
        <Link
          to={info.listRoute}
          className="mb-6 hidden items-center lg:inline-flex gap-1.5 text-sm font-semibold text-mtm-muted transition-colors hover:text-mtm-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {info.listLabel}
        </Link>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
          <article className="flex flex-col gap-6">
            <div className="relative order-2 -mx-4 -mt-12 rounded-t-3xl bg-mtm-bg px-4 pt-5 sm:-mx-6 sm:px-6 lg:order-1 lg:mx-0 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0">
              <Badge tone="primary">{info.label}</Badge>
              <h1 className="mt-3 font-display text-2xl font-bold text-mtm-text sm:text-3xl lg:text-4xl">{item.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-mtm-muted">
                {item.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {item.location}
                  </span>
                )}
                {item.date && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {info.dateLabel} {formatDate(item.date)}
                  </span>
                )}
              </p>
            </div>

            <div className="order-1 -mx-4 sm:-mx-6 lg:mx-0 aspect-[4/3] overflow-hidden bg-mtm-border sm:aspect-video lg:order-2 lg:rounded-lg lg:border lg:border-mtm-border">
              <MediaImage
                src={item.imageUrl}
                alt={item.title}
                fallbackLabel="Image à venir"
                className="h-full w-full object-cover"
              />
            </div>

            <section className="order-3">
              <h2 className="font-display text-lg font-bold text-mtm-text">Le projet</h2>
              {item.description ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mtm-muted sm:text-base">
                  {item.description}
                </p>
              ) : (
                <p className="mt-3 text-sm text-mtm-muted">Description à venir.</p>
              )}
            </section>
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-mtm-border bg-mtm-surface p-5 shadow-card lg:rounded-lg lg:p-6">
              <h2 className="font-display text-lg font-bold text-mtm-text">{info.cta}</h2>
              <p className="mt-2 text-sm text-mtm-muted">{info.ctaText}</p>
              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={() => setContactOpen(true)}>
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  Nous écrire
                </Button>
                <LinkButton to={ROUTES.catalog} variant="secondary">
                  Voir les biens disponibles
                </LinkButton>
              </div>
              <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-mtm-border pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-mtm-muted">Type</dt>
                  <dd className="font-semibold text-mtm-text">{info.label}</dd>
                </div>
                {item.location && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-mtm-muted">Lieu</dt>
                    <dd className="text-right font-semibold text-mtm-text">{item.location}</dd>
                  </div>
                )}
                {item.date && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-mtm-muted">Date</dt>
                    <dd className="text-right font-semibold text-mtm-text">{formatDate(item.date)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <section className="mt-8 lg:mt-14">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-mtm-text lg:text-xl">
                {item.category === 'projet_a_venir' ? 'Autres projets à venir' : 'Autres réalisations'}
              </h2>
              <Link to={info.listRoute} className="shrink-0 text-[13px] font-semibold text-mtm-primary hover:underline lg:text-sm">
                <span className="lg:hidden">Voir tout</span>
                <span className="hidden lg:inline">{info.listLabel}</span>
              </Link>
            </div>
            <div className="mt-4 lg:mt-6">
              <Carousel
                ariaLabel={item.category === 'projet_a_venir' ? 'Autres projets à venir' : 'Autres réalisations'}
                itemClassName="w-[72%] sm:w-[46%] lg:w-auto"
                lgClassName="lg:grid lg:grid-cols-4 lg:gap-5"
                dotsOnly
              >
                {others.map((sibling) => (
                  <ShowcaseCard key={sibling.id} item={sibling} />
                ))}
              </Carousel>
            </div>
          </section>
        )}
      </div>

      <div className="hidden lg:block">
        <CtaBand />
      </div>

      <DetailActionBar>
        <Button onClick={() => setContactOpen(true)}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Nous écrire
        </Button>
      </DetailActionBar>

      {contactOpen && (
        <ContactModal
          onClose={() => setContactOpen(false)}
          title={info.cta}
          initialSujet={`${info.label} : ${item.title}`}
        />
      )}
    </div>
  );
}
