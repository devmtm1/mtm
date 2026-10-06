import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, HeartOff, Trash2 } from 'lucide-react';
import { fetchTerrain } from '../api/terrains';
import { fetchLocation } from '../api/locations';
import { LocationCard } from '../components/locations/LocationCard';
import { TerrainCard } from '../components/terrains/TerrainCard';
import { CATALOG_GRID } from '../components/terrains/terrain-grid';
import { CardGridSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { LinkButton } from '../components/ui/LinkButton';
import { useFavorites } from '../hooks/useFavorites';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ROUTES } from '../routes';
import { removeFavorite, type FavoriteKind } from '../utils/favorites';
import type { Terrain } from '../types/terrain';
import type { Location } from '../types/location';

type Loaded =
  | { state: 'ok'; kind: 'terrain'; id: string; terrain: Terrain }
  | { state: 'ok'; kind: 'location'; id: string; location: Location }
  | { state: 'gone'; kind: FavoriteKind; id: string };

const TABS: { kind: FavoriteKind; label: string }[] = [
  { kind: 'terrain', label: 'À vendre' },
  { kind: 'location', label: 'Locations' },
];

/**
 * Favoris du visiteur. Le bien est relu à l'affichage : le prix et la
 * disponibilité sont ceux d'aujourd'hui, et un bien vendu, loué ou retiré du
 * catalogue est signalé comme tel au lieu de disparaître sans explication.
 */
export function FavorisPage() {
  usePageMetadata({ title: 'Mes favoris', description: 'Les biens et locations que vous avez mis de côté.' });
  const { entries } = useFavorites();
  const [tab, setTab] = useState<FavoriteKind>('terrain');
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [loading, setLoading] = useState(true);

  // Identifiants sous forme de chaîne : l'effet ne se relance que si la liste
  // change réellement, pas à chaque rendu.
  const signature = entries.map((entry) => `${entry.kind}:${entry.id}`).join('|');

  useEffect(() => {
    let cancelled = false;
    const wanted = signature ? signature.split('|') : [];
    if (wanted.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all(
      wanted.map(async (key): Promise<[string, Loaded]> => {
        const [kind, id] = key.split(':') as [FavoriteKind, string];
        try {
          if (kind === 'terrain') return [key, { state: 'ok', kind, id, terrain: await fetchTerrain(id) }];
          return [key, { state: 'ok', kind, id, location: await fetchLocation(id) }];
        } catch {
          return [key, { state: 'gone', kind, id }];
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setLoaded(Object.fromEntries(results));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [signature]);

  const counts = useMemo(
    () => ({
      terrain: entries.filter((entry) => entry.kind === 'terrain').length,
      location: entries.filter((entry) => entry.kind === 'location').length,
    }),
    [entries],
  );

  const visible = entries.filter((entry) => entry.kind === tab);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-mtm-primary">Mes favoris</p>
          <h1 className="font-display text-2xl font-bold text-mtm-text">Mis de côté</h1>
        </div>
        <Heart className="h-7 w-7 fill-mtm-accent text-mtm-accent" aria-hidden="true" />
      </div>
      <p className="mt-1 text-sm text-mtm-muted">
        Gardés sur cet appareil : retrouvez ici les biens qui vous ont plu, sans créer de compte.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-mtm-border/50 p-1" role="tablist" aria-label="Type de favoris">
        {TABS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            onClick={() => setTab(kind)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all active:scale-[0.98] ${
              tab === kind ? 'bg-mtm-surface text-mtm-primary shadow-card' : 'text-mtm-muted'
            }`}
          >
            {label} <span className="ml-1 text-xs opacity-70">({counts[kind]})</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {entries.length === 0 && (
          <EmptyState
            title="Aucun favori pour le moment"
            description="Touchez le cœur d’un bien ou d’une location pour le retrouver ici."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <LinkButton to={ROUTES.catalog}>Voir les biens</LinkButton>
                <LinkButton to={ROUTES.locations} variant="secondary">
                  Voir les locations
                </LinkButton>
              </div>
            }
          />
        )}

        {entries.length > 0 && visible.length === 0 && (
          <EmptyState
            title={tab === 'terrain' ? 'Aucun bien à vendre en favori' : 'Aucune location en favori'}
            description="Parcourez le catalogue et touchez le cœur de ce qui vous plaît."
            action={
              <LinkButton to={tab === 'terrain' ? ROUTES.catalog : ROUTES.locations}>
                {tab === 'terrain' ? 'Voir les biens' : 'Voir les locations'}
              </LinkButton>
            }
          />
        )}

        {visible.length > 0 && loading && <CardGridSkeleton count={Math.min(visible.length, 4)} gridClassName={CATALOG_GRID} compact />}

        {visible.length > 0 && !loading && (
          <div className={CATALOG_GRID}>
            {visible.map((entry) => {
              const item = loaded[`${entry.kind}:${entry.id}`];
              if (!item) return null;
              if (item.state === 'gone') {
                return (
                  <div
                    key={`${entry.kind}-${entry.id}`}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-mtm-border bg-mtm-surface p-4 text-center"
                  >
                    <HeartOff className="h-6 w-6 text-mtm-muted" aria-hidden="true" />
                    <p className="text-sm font-semibold text-mtm-text">Plus disponible</p>
                    <p className="text-xs text-mtm-muted">Ce bien a été vendu, loué ou retiré.</p>
                    <button
                      type="button"
                      onClick={() => removeFavorite(entry.kind, entry.id)}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-mtm-border px-3 py-1.5 text-xs font-semibold text-mtm-muted active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Retirer
                    </button>
                  </div>
                );
              }
              return item.kind === 'terrain' ? (
                <TerrainCard key={`t-${entry.id}`} terrain={item.terrain} compact />
              ) : (
                <LocationCard key={`l-${entry.id}`} location={item.location} compact />
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-mtm-muted">
        Besoin d’aide pour choisir ?{' '}
        <Link to={ROUTES.contact} className="font-semibold text-mtm-primary">
          Parlez à un conseiller
        </Link>
      </p>
    </div>
  );
}
