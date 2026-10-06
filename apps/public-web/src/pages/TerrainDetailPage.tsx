import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Globe2, MapPin, MessageSquare, ShieldCheck, UserCheck } from 'lucide-react';
import { ROUTES } from '../routes';
import { useTerrain } from '../hooks/useTerrain';
import { TerrainGallery } from '../components/terrains/TerrainGallery';
import { TerrainMap } from '../components/terrains/TerrainMap';
import { PointsInteretList } from '../components/terrains/PointsInteretList';
import { ContactModal } from '../components/contact/ContactModal';
import { ReservationModal } from '../components/reservation/ReservationModal';
import { TerrainDetailSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DetailActionBar } from '../components/mobile/DetailActionBar';
import { FavoriteButton } from '../components/mobile/FavoriteButton';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { formatMoney, formatSuperficie } from '../utils/format';
import { estBienBati, etatBienLabel, typeBienLabel, vocationLabel } from '../utils/bienLabels';

type ActiveModal = 'visite' | 'infos' | 'reservation' | null;

export function TerrainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: terrain, loading, error } = useTerrain(id);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const location = [terrain?.commune, terrain?.region].filter(Boolean).join(', ');
  const bati = terrain ? estBienBati(terrain) : false;
  const etatLabel = terrain ? etatBienLabel(terrain.etatBien) : null;

  // Titre dynamique : le nom du bien (et sa localisation) identifie la
  // fiche dans les onglets, l'historique et les résultats de recherche.
  usePageMetadata({
    title: terrain ? [terrain.nom, location].filter(Boolean).join(' – ') : 'Fiche du bien',
    description: terrain?.description?.slice(0, 160) ?? undefined,
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
      <Link
        to={ROUTES.catalog}
        className="mb-6 hidden lg:inline-flex items-center gap-1.5 text-sm font-semibold text-mtm-muted transition-colors hover:text-mtm-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour au catalogue
      </Link>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="relative order-2 -mx-4 -mt-12 rounded-t-3xl bg-mtm-bg px-4 pt-5 sm:-mx-6 sm:px-6 lg:order-1 lg:mx-0 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">
              {terrain.referenceInterne}
            </span>
            <h1 className="mt-1 font-display text-2xl font-bold text-mtm-text sm:text-3xl">
              {terrain.nom}
            </h1>
            {location && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-mtm-muted">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {location}
                {terrain.localisationDetail && ` · ${terrain.localisationDetail}`}
              </p>
            )}
            {/* Mobile : le prix se lit tout de suite sous le nom, comme sur une carte d'annonce. */}
            <p className="mt-2 font-display text-2xl font-bold text-mtm-primary lg:hidden">{formatMoney(terrain.prixPublic)}</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
              {/* La nature avant le statut juridique : le visiteur doit savoir
                  en un coup d'œil s'il regarde une parcelle ou une maison. */}
              <Badge tone="primary">{typeBienLabel(terrain.typeBien)}</Badge>
              {bati && terrain.nombrePieces && (
                <Badge tone="primary">{terrain.nombrePieces}</Badge>
              )}
              <Badge tone="primary">{terrain.statutJuridique}</Badge>
              <Badge tone="success">{terrain.niveauVerification}</Badge>
              {etatLabel && <Badge tone="neutral">{etatLabel}</Badge>}
              {terrain.vocation && <Badge tone="neutral">{vocationLabel(terrain.vocation)}</Badge>}
            </div>
          </div>

          <TerrainGallery
            medias={terrain.medias}
            alt={terrain.nom}
            className="order-1 -mx-4 sm:-mx-6 lg:mx-0 lg:order-2"
            overlay={<FavoriteButton kind="terrain" id={terrain.id} label={terrain.nom} className="h-10 w-10" />}
          />

          <div className="order-3 flex flex-col gap-6 lg:gap-8">
          {terrain.description && (
            <section>
              <h2 className="font-display text-lg font-bold text-mtm-text">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mtm-muted">
                {terrain.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="font-display text-lg font-bold text-mtm-text">Caractéristiques</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-mtm-border bg-mtm-surface p-4 sm:grid-cols-3">
              {/* Sur un bien bâti, l'habitable et les pièces passent devant :
                  c'est ce qu'un acheteur de villa regarde en premier. La
                  parcelle reste affichée, nommée pour ce qu'elle est. */}
              {bati && (
                <>
                  <div>
                    <dt className="text-xs text-mtm-muted">Surface habitable</dt>
                    <dd className="text-sm font-semibold text-mtm-text">
                      {terrain.surfaceHabitable === null
                        ? '—'
                        : formatSuperficie(terrain.surfaceHabitable, terrain.uniteSuperficie)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mtm-muted">Pièces</dt>
                    <dd className="text-sm font-semibold text-mtm-text">
                      {terrain.nombrePieces ?? '—'}
                      {terrain.nombreChambres !== null &&
                        ` · ${terrain.nombreChambres} chambre${terrain.nombreChambres > 1 ? 's' : ''}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mtm-muted">Salles d’eau</dt>
                    <dd className="text-sm font-semibold text-mtm-text">
                      {terrain.nombreSallesEau ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mtm-muted">Niveaux</dt>
                    <dd className="text-sm font-semibold text-mtm-text">
                      {terrain.niveaux ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mtm-muted">Année de construction</dt>
                    <dd className="text-sm font-semibold text-mtm-text">
                      {terrain.anneeConstruction ?? '—'}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-xs text-mtm-muted">
                  {bati ? 'Superficie du terrain' : 'Superficie'}
                </dt>
                <dd className="text-sm font-semibold text-mtm-text">
                  {formatSuperficie(terrain.superficie, terrain.uniteSuperficie)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-mtm-muted">Accès routier</dt>
                <dd className="text-sm font-semibold text-mtm-text">{terrain.accesRoutier ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-mtm-muted">Eau</dt>
                <dd className="text-sm font-semibold text-mtm-text">
                  {terrain.eauDisponible === null ? '—' : terrain.eauDisponible ? 'Disponible' : 'Non disponible'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-mtm-muted">Électricité</dt>
                <dd className="text-sm font-semibold text-mtm-text">
                  {terrain.electriciteDisponible === null
                    ? '—'
                    : terrain.electriciteDisponible
                      ? 'Disponible'
                      : 'Non disponible'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-mtm-muted">Voisinage</dt>
                <dd className="text-sm font-semibold text-mtm-text">{terrain.voisinage ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-mtm-muted">Proximité des axes</dt>
                <dd className="text-sm font-semibold text-mtm-text">{terrain.proximiteAxes ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {terrain.latitude !== null && terrain.longitude !== null && (
            <section>
              <h2 className="font-display text-lg font-bold text-mtm-text">Localisation</h2>
              <div className="mt-3">
                <TerrainMap
                  latitude={terrain.latitude}
                  longitude={terrain.longitude}
                  title={terrain.nom}
                  pointsInteret={terrain.pointsInteret}
                />
              </div>
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
              <ul className="mt-3 flex flex-col gap-2">
                {terrain.documents.map((document) => (
                  <li key={document.id}>
                    <a
                      href={document.secureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-mtm-primary hover:underline"
                    >
                      {document.title ?? document.type}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-mtm-border bg-mtm-surface p-5 shadow-card lg:sticky lg:top-24 lg:rounded-lg lg:p-6">
          <p className="hidden text-xs font-semibold uppercase tracking-wide text-mtm-muted lg:block">Prix public</p>
          <p className="mt-1 hidden font-display text-3xl font-bold text-mtm-primary lg:block">
            {formatMoney(terrain.prixPublic)}
          </p>
          <h2 className="font-display text-lg font-bold text-mtm-text lg:hidden">Intéressé par ce bien ?</h2>

          <div className="mt-4 flex flex-col gap-3 lg:mt-6">
            <Button onClick={() => setActiveModal('visite')}>
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Demander une visite
            </Button>
            <Button variant="secondary" onClick={() => setActiveModal('infos')}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Demander des informations
            </Button>
            <Button variant="secondary" onClick={() => setActiveModal('reservation')}>
              Réserver ce terrain
            </Button>
          </div>

          {/* Réassurance : les trois engagements du cahier des charges qui
              comptent au moment de cliquer (sections 6 et 7). */}
          <ul className="mt-6 flex flex-col gap-2 border-t border-mtm-border pt-5 text-sm text-mtm-muted">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
              Terrain contrôlé par nos équipes avant publication
            </li>
            <li className="flex items-start gap-2">
              <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
              Suivi à distance pour la diaspora
            </li>
            <li className="flex items-start gap-2">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
              Un interlocuteur dédié jusqu’à la signature
            </li>
          </ul>
        </aside>
      </div>

      {/* Mobile : le prix et l'action principale restent sous le pouce, sans
          avoir à défiler jusqu'au panneau latéral. */}
      <DetailActionBar label="Prix public" price={formatMoney(terrain.prixPublic)}>
        <Button className="px-4" onClick={() => setActiveModal('visite')}>
          <CalendarCheck className="h-4 w-4" aria-hidden="true" />
          Visiter
        </Button>
      </DetailActionBar>

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
          title="Demander des informations"
          terrainId={terrain.id}
          initialSujet={`Informations sur le terrain ${terrain.referenceInterne}`}
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
