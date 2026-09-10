import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarCheck, MapPin, MessageSquare } from 'lucide-react';
import { useTerrain } from '../hooks/useTerrain';
import { TerrainGallery } from '../components/terrains/TerrainGallery';
import { TerrainMap } from '../components/terrains/TerrainMap';
import { PointsInteretList } from '../components/terrains/PointsInteretList';
import { ContactModal } from '../components/contact/ContactModal';
import { ReservationModal } from '../components/reservation/ReservationModal';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatMoney, formatSuperficie } from '../utils/format';

type ActiveModal = 'visite' | 'infos' | 'reservation' | null;

export function TerrainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: terrain, loading, error } = useTerrain(id);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  if (loading) return <Spinner label="Chargement du terrain..." />;
  if (error || !terrain) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Terrain introuvable"
          description={error ?? "Ce terrain n'est plus disponible ou a été retiré du catalogue."}
        />
      </div>
    );
  }

  const location = [terrain.commune, terrain.region].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-8">
          <div>
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
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="primary">{terrain.statutJuridique}</Badge>
              <Badge tone="success">{terrain.niveauVerification}</Badge>
              {terrain.vocation && <Badge tone="neutral">{terrain.vocation}</Badge>}
            </div>
          </div>

          <TerrainGallery medias={terrain.medias} alt={terrain.nom} />

          <section>
            <h2 className="font-display text-lg font-bold text-mtm-text">Caractéristiques</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-mtm-border bg-mtm-surface p-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-mtm-muted">Superficie</dt>
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

        <aside className="h-fit rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">Prix public</p>
          <p className="mt-1 font-display text-3xl font-bold text-mtm-primary">
            {formatMoney(terrain.prixPublic)}
          </p>

          <div className="mt-6 flex flex-col gap-3">
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
        </aside>
      </div>

      {activeModal === 'visite' && (
        <ContactModal
          title="Demander une visite"
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
