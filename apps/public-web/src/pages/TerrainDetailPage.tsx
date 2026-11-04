import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CalendarCheck, ChevronRight, Download, FileText, LandPlot, LayoutGrid, MapPin, MessageSquare, Navigation } from 'lucide-react';
import { ROUTES } from '../routes';
import { useTerrain } from '../hooks/useTerrain';
import { TerrainGallery } from '../components/terrains/TerrainGallery';
import { TerrainBandeau, TerrainCaracteristiques, TerrainEssentiel, TerrainStatutJuridique } from '../components/terrains/TerrainFacts';
import { CartePrixBien } from '../components/terrains/CartePrixBien';
import { SimilarTerrains } from '../components/terrains/SimilarTerrains';
import { AutresLotsDuProgramme } from '../components/programmes/AutresLotsDuProgramme';
import { ClientRow } from '../components/client/shell/ClientUi';
import { ExpandableText } from '../components/ui/ExpandableText';
import { ShareButton } from '../components/mobile/ShareButton';
import { TerrainMap } from '../components/terrains/TerrainMap';
import { PointsInteretList } from '../components/terrains/PointsInteretList';
import { ContactModal } from '../components/contact/ContactModal';
import { ReservationModal } from '../components/reservation/ReservationModal';
import { TerrainDetailSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DetailActionBar } from '../components/mobile/DetailActionBar';
import { SoldBadge } from '../components/terrains/SoldBadge';
import { LinkButton } from '../components/ui/LinkButton';
import { estVendu, venduLabel } from '../utils/venteLabels';
import { FavoriteButton } from '../components/mobile/FavoriteButton';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { descriptionDe, donneesTerrain, premierePhoto } from '../utils/seo';
import { useVueFiche } from '../hooks/useSuiviVisites';
import { formatMoney } from '../utils/format';
import { estBienBati, etatBienLabel, typeBienLabel, vocationLabel } from '../utils/bienLabels';

type ActiveModal = 'visite' | 'infos' | 'reservation' | null;

export function TerrainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: terrain, loading, error } = useTerrain(id);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const location = [terrain?.commune, terrain?.region].filter(Boolean).join(', ');
  const bati = terrain ? estBienBati(terrain) : false;
  const etatLabel = terrain ? etatBienLabel(terrain.etatBien) : null;
  // Un bien vendu, affiché comme référence : fiche réduite, aucune demande possible.
  const vendu = terrain ? estVendu(terrain) : false;

  // Titre dynamique : le nom du bien (et sa localisation) identifie la
  // fiche dans les onglets, l'historique et les résultats de recherche.
  const titreFiche = terrain ? [vendu ? `${terrain.nom} (vendu)` : terrain.nom, location].filter(Boolean).join(' – ') : 'Fiche du bien';
  const descriptionFiche = terrain
    ? descriptionDe(
        terrain.description,
        [typeBienLabel(terrain.typeBien), vendu ? 'vendu' : 'à vendre', location && `à ${location}`].filter(Boolean).join(' '),
      )
    : undefined;
  const imageFiche = terrain ? premierePhoto(terrain.medias) : null;
  useVueFiche('terrain', terrain?.id);
  usePageMetadata({
    title: titreFiche,
    description: descriptionFiche,
    image: imageFiche,
    jsonLd: terrain && descriptionFiche ? donneesTerrain(terrain, titreFiche, descriptionFiche, imageFiche) : undefined,
  });

  if (loading) return <TerrainDetailSkeleton />;
  if (error || !terrain) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Bien introuvable"
          description={error ?? "Ce bien n'est plus disponible ou a été retiré du catalogue."}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:py-10 lg:pb-10">
      {terrain.programme ? (
        /* Un lot de lotissement : le fil d'Ariane remonte au lotissement, pas seulement au catalogue. */
        <nav aria-label="Fil d’Ariane" className="mb-6 hidden flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mtm-muted lg:flex">
          <Link to={ROUTES.catalog} className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-mtm-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Nos biens
          </Link>
          <span aria-hidden="true">/</span>
          <Link to={ROUTES.programme(terrain.programme.id)} className="font-semibold transition-colors hover:text-mtm-primary">
            {terrain.programme.nom}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-mtm-text">Lot {terrain.numeroLot ?? terrain.referenceInterne}</span>
        </nav>
      ) : (
        <Link
          to={ROUTES.catalog}
          className="mb-6 hidden lg:inline-flex items-center gap-1.5 text-sm font-semibold text-mtm-muted transition-colors hover:text-mtm-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au catalogue
        </Link>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="relative order-2 -mx-4 -mt-12 rounded-t-3xl bg-mtm-bg px-4 pt-5 sm:-mx-6 sm:px-6 lg:order-1 lg:mx-0 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0">
            <span className="inline-flex rounded-full bg-mtm-primary-dark px-3 py-1 text-xs font-bold tracking-wide text-white">
              {terrain.referenceInterne}
            </span>
            <h1 className="mt-2.5 font-display text-2xl font-extrabold leading-tight text-mtm-text sm:text-3xl lg:text-[2.6rem]">
              {terrain.nom}
            </h1>
            {location && (
              <p className="mt-2.5 flex items-center gap-1.5 text-sm text-mtm-muted sm:text-base">
                <MapPin className="h-4 w-4 shrink-0 fill-mtm-primary/15 text-mtm-primary" aria-hidden="true" />
                {location}
                {terrain.localisationDetail && ` · ${terrain.localisationDetail}`}
              </p>
            )}
            {terrain.programme && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mtm-primary-subtle px-3 py-1.5 text-sm font-semibold text-mtm-primary">
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                  Lot {terrain.numeroLot ?? terrain.referenceInterne}
                  {terrain.categorieLot && <span className="font-medium text-mtm-primary/80">· {terrain.categorieLot.nom}</span>}
                </span>
                <Link
                  to={ROUTES.programme(terrain.programme.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-mtm-primary-subtle px-3 py-1.5 text-sm font-semibold text-mtm-primary transition-colors hover:bg-mtm-primary-light"
                >
                  <LandPlot className="h-4 w-4" aria-hidden="true" />
                  Lotissement {terrain.programme.nom}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
            {/* Mobile : le prix se lit tout de suite sous le nom, comme sur une carte d'annonce. */}
            {vendu ? (
              <p className="mt-2 font-display text-xl font-bold text-mtm-accent">{venduLabel(terrain.venduLe)}</p>
            ) : (
              <p className="mt-2 font-display text-2xl font-bold text-mtm-primary lg:hidden">{formatMoney(terrain.prixPublic)}</p>
            )}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
              {/* La nature avant le statut juridique : le visiteur doit savoir
                  en un coup d'œil s'il regarde une parcelle ou une maison. */}
              {vendu && <Badge tone="accent">Vendu</Badge>}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mtm-primary-dark px-3 py-1 text-xs font-semibold text-white">
                <LandPlot className="h-3.5 w-3.5" aria-hidden="true" />
                {typeBienLabel(terrain.typeBien)}
              </span>
              {bati && terrain.nombrePieces && (
                <Badge tone="primary">{terrain.nombrePieces}</Badge>
              )}
              <Badge tone="success">
                <BadgeCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {terrain.niveauVerification}
              </Badge>
              {etatLabel && <Badge tone="neutral">{etatLabel}</Badge>}
              {terrain.vocation && <Badge tone="neutral">{vocationLabel(terrain.vocation)}</Badge>}
            </div>
          </div>

          <TerrainGallery
            medias={terrain.medias}
            alt={terrain.nom}
            className="order-1 -mx-4 sm:-mx-6 lg:mx-0 lg:order-2"
            badge={vendu ? <SoldBadge /> : undefined}
            overlay={
              <>
                <ShareButton title={terrain.nom} />
                {!vendu && <FavoriteButton kind="terrain" id={terrain.id} label={terrain.nom} className="h-10 w-10" />}
              </>
            }
          />

          <div className="order-3 flex flex-col gap-6 lg:gap-8">
          <div className="flex flex-col gap-6 lg:hidden">
            <TerrainStatutJuridique terrain={terrain} />
            <TerrainEssentiel terrain={terrain} />
          </div>
          <div className="hidden lg:block">
            <TerrainBandeau terrain={terrain} />
          </div>

          {terrain.description && (
            <section>
              <h2 className="font-display text-lg font-bold text-mtm-text">Description</h2>
              <ExpandableText text={terrain.description} className="mt-3 text-sm leading-relaxed text-mtm-muted" />
            </section>
          )}

          <TerrainCaracteristiques terrain={terrain} />

          {terrain.latitude !== null && terrain.longitude !== null && (
            <section>
              <h2 className="font-display text-lg font-bold text-mtm-text">Localisation</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-mtm-border/70 shadow-card lg:rounded-lg">
                <TerrainMap
                  latitude={terrain.latitude}
                  longitude={terrain.longitude}
                  title={terrain.nom}
                  pointsInteret={terrain.pointsInteret}
                />
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${terrain.latitude},${terrain.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-mtm-border bg-mtm-surface px-4 py-2.5 text-sm font-semibold text-mtm-primary transition-transform active:scale-[0.98] lg:rounded-md"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Itinéraire
              </a>
              {terrain.pointsInteret && terrain.pointsInteret.length > 0 && (
                <div className="mt-3">
                  <PointsInteretList points={terrain.pointsInteret} />
                </div>
              )}
            </section>
          )}

          {terrain.documents.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-mtm-text">Documents</h2>
              <ul className="mt-2">
                {terrain.documents.map((document) => (
                  <li key={document.id}>
                    <ClientRow
                      href={document.secureUrl}
                      icon={FileText}
                      title={document.title ?? document.type}
                      trailing={<Download className="h-4 w-4 shrink-0 text-mtm-primary" aria-label="Ouvrir" />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          </div>
        </div>

        {vendu ? (
          <aside className="h-fit rounded-2xl border border-mtm-border bg-mtm-surface p-5 shadow-card lg:sticky lg:top-24 lg:rounded-lg lg:p-6">
            <SoldBadge />
            <h2 className="mt-3 font-display text-lg font-bold text-mtm-text">Ce bien a trouvé son acquéreur</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-mtm-muted">
              {venduLabel(terrain.venduLe)}. D’autres biens vérifiés sont disponibles{terrain.commune ? ` à ${terrain.commune} et ailleurs` : ''} :
              notre équipe peut aussi vous alerter dès qu’un bien similaire est proposé.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <LinkButton to={ROUTES.catalog}>Voir les biens disponibles</LinkButton>
              <Button variant="secondary" onClick={() => setActiveModal('infos')}>
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Être prévenu d’un bien similaire
              </Button>
            </div>
          </aside>
        ) : (
          <CartePrixBien
            prix={terrain.prixPublic}
            onVisite={() => setActiveModal('visite')}
            onReservation={() => setActiveModal('reservation')}
            onInfos={() => setActiveModal('infos')}
            contexte={terrain.programme ? `Lot ${terrain.numeroLot ?? terrain.referenceInterne} · ${terrain.programme.nom}` : undefined}
          />
        )}
      </div>

      {terrain.programme && !vendu && <AutresLotsDuProgramme programmeId={terrain.programme.id} lotId={terrain.id} />}
      <SimilarTerrains terrain={terrain} />

      {/* Mobile : le prix et l'action principale restent sous le pouce, sans
          avoir à défiler jusqu'au panneau latéral. */}
      {vendu ? (
        <DetailActionBar>
          <LinkButton to={ROUTES.catalog}>Voir les biens disponibles</LinkButton>
        </DetailActionBar>
      ) : (
        <DetailActionBar label="Prix public" price={formatMoney(terrain.prixPublic)}>
          <Button className="px-4" onClick={() => setActiveModal('visite')}>
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Visiter
          </Button>
        </DetailActionBar>
      )}

      {activeModal === 'visite' && (
        <ContactModal
          title="Demander une visite"
          demandeType="visite"
          terrainId={terrain.id}
          initialSujet={`Visite du terrain ${terrain.referenceInterne}`}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'infos' && (
        <ContactModal
          title={vendu ? 'Être prévenu d’un bien similaire' : 'Demander des informations'}
          terrainId={terrain.id}
          initialSujet={
            vendu
              ? `Recherche d'un bien similaire à ${terrain.nom}`
              : `Informations sur le terrain ${terrain.referenceInterne}`
          }
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'reservation' && (
        <ReservationModal
          terrainId={terrain.id}
          terrainNom={terrain.nom}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
