import { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { fetchTerrains } from '../../api/terrains';
import { fieldInputClass } from '../ui/FormField';

export interface TerrainChoice {
  id: string;
  referenceInterne: string;
  nom: string;
  /** « Commune, Région » si connu. */
  location?: string;
  /** Terrain d'un des dossiers du client. */
  mine?: boolean;
}

interface TerrainPickerProps {
  id: string;
  value: TerrainChoice | null;
  onChange: (choice: TerrainChoice | null) => void;
  /** Terrains des dossiers du client, proposés en premier. */
  pinned: TerrainChoice[];
  /** Réservation : seuls les terrains du catalogue (disponibles) sont proposés. */
  availableOnly: boolean;
  placeholder?: string;
}

const MAX_RESULTS = 6;
const DEBOUNCE_MS = 250;

/**
 * Choix d'un terrain par recherche (référence, nom, commune) plutôt que par
 * une liste déroulante : le catalogue peut compter des dizaines de terrains,
 * une liste native devient vite illisible sur téléphone. Les terrains des
 * dossiers du client sont proposés d'abord ; le catalogue est interrogé côté
 * serveur au fil de la saisie, limité à quelques résultats.
 */
export function TerrainPicker({ id, value, onChange, pinned, availableOnly, placeholder }: TerrainPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [catalogue, setCatalogue] = useState<TerrainChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Catalogue : interrogé à l'ouverture (premiers terrains) puis à chaque
  // saisie, avec un léger délai pour ne pas appeler l'API à chaque touche.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchTerrains({ search: query.trim() || undefined, pageSize: MAX_RESULTS + pinned.length, sortBy: 'nom', sortOrder: 'asc' })
        .then((page) => {
          if (cancelled) return;
          setCatalogue(
            page.items.map((terrain) => ({
              id: terrain.id,
              referenceInterne: terrain.referenceInterne,
              nom: terrain.nom,
              location: [terrain.commune, terrain.region].filter(Boolean).join(', ') || undefined,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setCatalogue([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, pinned.length]);

  // Clic en dehors : referme les suggestions.
  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const needle = query.trim().toLowerCase();
  const matches = (choice: TerrainChoice): boolean =>
    !needle ||
    choice.referenceInterne.toLowerCase().includes(needle) ||
    choice.nom.toLowerCase().includes(needle) ||
    (choice.location ?? '').toLowerCase().includes(needle);
  const pinnedResults = availableOnly ? [] : pinned.filter(matches);
  const catalogueResults = catalogue.filter((choice) => !pinned.some((mine) => mine.id === choice.id));
  const results = [...pinnedResults, ...catalogueResults].slice(0, MAX_RESULTS);

  function select(choice: TerrainChoice): void {
    onChange(choice);
    setQuery('');
    setOpen(false);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-mtm-primary bg-mtm-primary-subtle px-3 py-2 text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-semibold text-mtm-text">
          {value.referenceInterne} · {value.nom}
          {value.location ? <span className="font-normal text-mtm-muted"> — {value.location}</span> : null}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Retirer le terrain"
          className="rounded-full p-1 text-mtm-muted hover:bg-white hover:text-mtm-text"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mtm-muted" aria-hidden="true" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className={`${fieldInputClass} pl-9`}
          placeholder={placeholder ?? 'Référence, nom ou commune…'}
          value={query}
          onFocus={(event) => {
            setOpen(true);
            // Dans une feuille en bas d'écran, remonte le champ pour laisser
            // la place aux suggestions sous lui.
            event.currentTarget.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && results[active]) {
              event.preventDefault();
              select(results[active]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-md border border-mtm-border bg-mtm-surface py-1 shadow-card-hover"
        >
          {results.map((choice, index) => (
            <li
              key={choice.id}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(choice)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${index === active ? 'bg-mtm-primary-subtle' : 'hover:bg-mtm-bg'}`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-mtm-text">
                  {choice.referenceInterne} · {choice.nom}
                </span>
                <span className="block truncate text-xs text-mtm-muted">
                  {choice.mine ? 'Mon dossier' : choice.location ?? 'Terrain disponible'}
                </span>
              </span>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-mtm-muted">{loading ? 'Recherche…' : 'Aucun terrain ne correspond.'}</li>
          )}
          {results.length > 0 && loading && <li className="px-3 py-1 text-xs text-mtm-muted">Recherche…</li>}
        </ul>
      )}
    </div>
  );
}
