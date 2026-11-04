import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Check, Images, Layers, LayoutGrid, MapPin, Maximize2, MessageSquare, Tag, Wallet } from 'lucide-react';
import { fetchProgramme, fetchProgrammes, type LotPublic, type ProgrammePublicDetail } from '../api/programmes';
import { disponibilites, fourchettePrix, fourchetteSuperficie, pointsDeConditions } from '../utils/programmes';
import { formatMoney } from '../utils/format';
import { VAGUES } from '../utils/vagues';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ROUTES } from '../routes';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { ExpandableText } from '../components/ui/ExpandableText';
import { MediaImage } from '../components/ui/MediaImage';
import { PhotoLightbox } from '../components/ui/PhotoLightbox';
import { ContactModal } from '../components/contact/ContactModal';
import { PageFallback } from '../components/layout/PageFallback';
import { IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
import { StatutJuridiqueChip } from '../components/terrains/StatutJuridiqueChip';
import { TerrainGallery } from '../components/terrains/TerrainGallery';
import { ShareButton } from '../components/mobile/ShareButton';
import { DetailActionBar } from '../components/mobile/DetailActionBar';
import { LotsExplorer } from '../components/programmes/LotsExplorer';
import { ProgrammeCard } from '../components/programmes/ProgrammeCard';
import { CarteAchat } from '../components/programmes/CarteAchat';
import { TitreSection } from '../components/programmes/TitreSection';
import type { TerrainMedia } from '../types/terrain';

/** Les photos d'un programme au format de la galerie des biens. */
function enMediasGalerie(programme: ProgrammePublicDetail): TerrainMedia[] {
  return programme.medias
    .filter((m) => m.type === 'photo')
    .map((m, i) => ({
      id: m.id,
      type: 'photo',
      title: m.title,
      isPublic: true,
      sortOrder: i,
      secureUrl: m.secureUrl,
      capturedAt: null,
      createdAt: '',
    }));
}

/**
 * La page de vente d'un lotissement : un bandeau panoramique (le lieu, le statut juridique, la surface), la carte d'achat
 * qui reste sous la main, puis le projet, les lots à choisir, le plan de masse, les photos et les conditions de paiement.
 */
export function ProgrammePage() {
  const { id } = useParams<{ id: string }>();
  const { data: programme, loading, error } = useAsyncData(
    () => (id ? fetchProgramme(id) : Promise.reject(new Error('Programme manquant'))),
    [id],
  );
  const { data: tous } = useAsyncData(() => fetchProgrammes(), []);
  const [contact, setContact] = useState<LotPublic | 'programme' | null>(null);
  const [planOuvert, setPlanOuvert] = useState<number | null>(null);

  usePageMetadata({
    title: programme ? `${programme.nom} — lots à vendre` : 'Lotissement',
    description: programme
      ? `${programme.lotsDisponibles} lot${programme.lotsDisponibles > 1 ? 's' : ''} à vendre au sein du lotissement ${programme.nom}${programme.commune ? ` à ${programme.commune}` : ''}. ${programme.statutJuridique}. ${fourchettePrix(programme.prixMin, programme.prixMax)}.`
      : 'Lots à vendre au sein d’un lotissement MTM Immobilier.',
    image: programme?.couverture ?? undefined,
  });

  const photos = useMemo(() => (programme ? enMediasGalerie(programme) : []), [programme]);
  const plans = useMemo(() => (programme ? programme.medias.filter((m) => m.type === 'plan') : []), [programme]);
  const autres = (tous ?? []).filter((p) => p.id !== programme?.id).slice(0, 3);

  if (loading) return <PageFallback />;
  if (error || !programme) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Lotissement introuvable"
          description="Ce lotissement n’a plus de lot à vendre ou a été retiré."
          action={
            <Link to={ROUTES.catalog} className="text-sm font-semibold text-mtm-primary">
              Voir le catalogue
            </Link>
          }
        />
      </div>
    );
  }

  const lieu = [programme.commune, programme.region].filter(Boolean).join(', ');
  const surface = fourchetteSuperficie(programme.superficieMin, programme.superficieMax, programme.uniteSuperficie);
  const conditions = pointsDeConditions(programme.conditions);
  // Une tuile de lot sans photo prend le plan de masse ; à défaut, la première photo du lotissement, ou sa couverture.
  const visuelDesLots = plans[0]
    ? { src: plans[0].secureUrl, legende: 'Plan de masse' }
    : (photos[0]?.secureUrl ?? programme.couverture)
      ? { src: (photos[0]?.secureUrl ?? programme.couverture) as string, legende: 'Le lotissement' }
      : null;
  // La seconde photo illustre le texte de présentation ; à défaut, la couverture.
  const vignette = photos[1]?.secureUrl ?? programme.couverture;

  return (
    <div className="relative overflow-x-clip bg-mtm-bg pb-24 lg:pb-0">
      {/* Courbes très claires en arrière-plan : elles adoucissent le fond sans rien charger. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-[34rem] -z-0 h-[28rem] w-[28rem] rounded-full bg-mtm-primary-subtle blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-[70rem] -z-0 h-[26rem] w-[26rem] rounded-full bg-mtm-accent-subtle blur-3xl" />

      {/* Bandeau panoramique : la photo du lotissement sous un voile bleu nuit, et la vague qui le fond dans la page. */}
      <header className="relative isolate overflow-hidden bg-mtm-primary-dark text-white">
        <MediaImage
          src={[programme.couverture, IMAGE_BANDEAU_PAGE]}
          alt=""
          aria-hidden
          loading="eager"
          sizes="100vw"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0a2142]/90 via-[#0a2142]/55 to-[#0a2142]/30" />
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-10 w-full text-mtm-bg sm:h-14 lg:h-16"
          fill="currentColor"
        >
          <path d={VAGUES.douce} />
        </svg>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pb-24 lg:pb-36">
          <div className="flex items-center justify-between gap-3">
            <nav aria-label="Fil d’Ariane" className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-white/80">
              <Link to={ROUTES.catalog} className="inline-flex items-center gap-1.5 font-semibold hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Nos biens
              </Link>
              <span aria-hidden="true">/</span>
              <span className="truncate font-semibold text-white">{programme.nom}</span>
            </nav>
            <ShareButton title={programme.nom} className="shrink-0 rounded-full bg-white/95 p-2.5 text-mtm-primary shadow-card hover:bg-white" />
          </div>

          <div className="mt-8 sm:mt-12 lg:mt-14">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mtm-accent px-3 py-1 text-xs font-bold text-white">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                Lotissement
              </span>
              <StatutJuridiqueChip statut={programme.statutJuridique} className="bg-white/95" />
              {surface && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {surface}
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{programme.reference}</span>
            </div>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight [text-shadow:0_2px_18px_rgba(10,33,66,0.55)] sm:text-5xl">
              {programme.nom}
            </h1>
            {lieu && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90 sm:text-base">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {lieu}
                {programme.localisationDetail && ` · ${programme.localisationDetail}`}
              </p>
            )}
            {/* Sur téléphone, où la carte d'achat est plus bas, le prix de départ se lit dès l'en-tête. */}
            {programme.prixMin !== null && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-display text-base font-bold text-mtm-primary-dark shadow-card lg:hidden">
                <Tag className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
                dès {formatMoney(programme.prixMin)}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-x-10 gap-y-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-14 pt-6 lg:col-start-1 lg:row-start-1 lg:pt-10">
          {(programme.description || vignette) && (
            <section aria-labelledby="presentation-titre">
              <TitreSection id="presentation-titre" icone={<Building2 />} titre="Le lotissement" />
              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                {vignette && (
                  <MediaImage
                    src={vignette}
                    alt={`Le lotissement ${programme.nom}`}
                    sizes="(min-width: 640px) 260px, 100vw"
                    className="aspect-[4/3] w-full shrink-0 rounded-2xl object-cover shadow-card sm:w-64"
                  />
                )}
                {programme.description && (
                  <ExpandableText text={programme.description} className="text-[15px] leading-relaxed text-mtm-text" />
                )}
              </div>
            </section>
          )}

          <section id="lots" aria-labelledby="lots-titre" className="scroll-mt-24">
            <TitreSection
              id="lots-titre"
              icone={<Layers />}
              titre="Choisissez votre lot"
              sousTitre={`${disponibilites(programme)}. Touchez un lot pour voir sa fiche.`}
            />
            <div className="mt-5">
              <LotsExplorer lots={programme.lots} categories={programme.categories} onVisite={setContact} visuel={visuelDesLots} />
            </div>
          </section>

          {plans.length > 0 && (
            <section aria-labelledby="plan-titre">
              <TitreSection
                id="plan-titre"
                icone={<MapPin />}
                titre="Plan de masse"
                sousTitre="Repérez l’emplacement des lots. Touchez le plan pour l’agrandir."
              />
              <div className="mt-5 grid gap-4">
                {plans.map((plan, index) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanOuvert(index)}
                    aria-label={`Agrandir ${plan.title ?? 'le plan de masse'}`}
                    className="group relative overflow-hidden rounded-2xl border border-mtm-border bg-mtm-surface shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
                  >
                    <MediaImage
                      src={plan.secureUrl}
                      alt={plan.title ?? `Plan de masse de ${programme.nom}`}
                      sizes="(min-width: 1024px) 760px, 100vw"
                      className="max-h-[32rem] w-full object-contain"
                    />
                    <span className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-mtm-primary-dark shadow-card transition-transform group-hover:scale-105">
                      <Maximize2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {photos.length > 1 && (
            <section aria-labelledby="photos-titre">
              <TitreSection id="photos-titre" icone={<Images />} titre="Photos" />
              <TerrainGallery medias={photos} alt={programme.nom} className="mt-5 overflow-hidden rounded-2xl" />
            </section>
          )}

          {(conditions.length > 0 || programme.categories.length > 0) && (
            <section aria-labelledby="conditions-titre">
              <TitreSection id="conditions-titre" icone={<Wallet />} titre="Conditions de paiement" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {conditions.length > 0 && (
                  <ul className="space-y-3.5 rounded-2xl border border-mtm-border bg-mtm-surface p-5 shadow-card">
                    {conditions.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-mtm-text">
                        <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mtm-primary-subtle text-mtm-primary">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
                {programme.categories.length > 0 && (
                  <div className="rounded-2xl border border-mtm-border bg-mtm-surface p-5 shadow-card">
                    <p className="text-xs font-bold uppercase tracking-wide text-mtm-muted">Par catégorie</p>
                    <ul className="mt-2 divide-y divide-mtm-border">
                      {programme.categories.map((c) => (
                        <li key={c.nom} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                          <span className="font-semibold text-mtm-text">
                            {c.nom} <span className="font-normal text-mtm-muted">· {c.lotsDisponibles} dispo.</span>
                          </span>
                          <span className="text-right font-semibold text-mtm-primary">{fourchettePrix(c.prixMin, c.prixMax)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* La carte d'achat chevauche le bandeau sur ordinateur et reste sous la main ; sur téléphone, elle suit les sections. */}
        <aside className="relative z-10 lg:col-start-2 lg:row-start-1 lg:-mt-28 lg:self-start lg:sticky lg:top-24" aria-label="Acheter un lot">
          <CarteAchat programme={programme} onRappel={() => setContact('programme')} />
        </aside>

        {autres.length > 0 && (
          <section aria-labelledby="autres-titre" className="min-w-0 lg:col-span-2 lg:row-start-2">
            <TitreSection id="autres-titre" icone={<LayoutGrid />} titre="Autres lotissements" />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {autres.map((p) => (
                <ProgrammeCard key={p.id} programme={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      <DetailActionBar label="À partir de" price={programme.prixMin === null ? undefined : formatMoney(programme.prixMin)}>
        <Button className="px-4" onClick={() => setContact('programme')}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Être rappelé
        </Button>
      </DetailActionBar>

      {planOuvert !== null && (
        <PhotoLightbox
          photos={plans.map((p) => ({ src: p.secureUrl, alt: p.title ?? `Plan de masse de ${programme.nom}` }))}
          index={planOuvert}
          onIndexChange={setPlanOuvert}
          onClose={() => setPlanOuvert(null)}
          label="Plan de masse"
        />
      )}

      {contact && (
        <ContactModal
          title={contact === 'programme' ? 'Être rappelé par un conseiller' : 'Demander une visite'}
          demandeType={contact === 'programme' ? undefined : 'visite'}
          terrainId={contact === 'programme' ? undefined : contact.id}
          initialSujet={
            contact === 'programme'
              ? `Informations sur le lotissement ${programme.nom}`
              : `Visite du lot ${contact.numeroLot} — ${programme.nom}`
          }
          onClose={() => setContact(null)}
        />
      )}
    </div>
  );
}
