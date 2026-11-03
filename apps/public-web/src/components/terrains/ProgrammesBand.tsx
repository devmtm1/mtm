import { Link } from 'react-router-dom';
import { LayoutGrid, MapPin } from 'lucide-react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchProgrammes } from '../../api/programmes';
import { ROUTES } from '../../routes';
import { fourchettePrix } from '../../utils/programmes';

/**
 * Les lotissements ayant encore des lots à vendre. Leurs lots n'encombrent pas
 * le catalogue : une carte par programme, qui mène à la grille de ses lots.
 */
export function ProgrammesBand() {
  const { data } = useAsyncData(fetchProgrammes, []);
  if (!data || data.length === 0) return null;
  return (
    <section className="mt-6" aria-labelledby="lotissements-titre">
      <h2 id="lotissements-titre" className="font-display text-lg font-bold text-mtm-text">
        Lotissements
      </h2>
      <p className="mt-1 text-sm text-mtm-muted">Plusieurs lots au même endroit : choisissez le vôtre.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((p) => (
          <li key={p.id}>
            <Link
              to={ROUTES.programme(p.id)}
              className="flex h-full flex-col gap-2 rounded-2xl border border-mtm-border bg-white p-4 transition-shadow hover:shadow-md"
            >
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mtm-muted">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                {p.lotsDisponibles} lot{p.lotsDisponibles > 1 ? 's' : ''} disponible{p.lotsDisponibles > 1 ? 's' : ''}
              </span>
              <span className="font-display text-base font-bold text-mtm-text">{p.nom}</span>
              {(p.commune || p.region) && (
                <span className="flex items-center gap-1.5 text-sm text-mtm-muted">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {[p.commune, p.region].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="mt-auto text-sm font-semibold text-mtm-primary">{fourchettePrix(p.prixMin, p.prixMax)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
