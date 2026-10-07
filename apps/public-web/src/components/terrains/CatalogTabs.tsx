import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { useTerrainFilterOptions } from '../../hooks/useTerrainFilterOptions';

/**
 * « À vendre » et « Vendus » : les références vendues ont leur onglet, qui
 * n'apparaît que si MTM en affiche au moins une. Les biens vendus n'entrent
 * jamais dans les résultats d'une recherche de biens à acheter.
 */
export function CatalogTabs({ active }: { active: 'disponible' | 'vendu' }) {
  const { data } = useTerrainFilterOptions();
  const vendus = data?.vendus ?? 0;
  if (vendus === 0) return null;

  const classe = (courant: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      courant ? 'bg-mtm-primary text-white shadow-card' : 'text-mtm-muted hover:text-mtm-primary'
    }`;

  return (
    <nav aria-label="Type de biens" className="mt-4 inline-flex rounded-full border border-mtm-border bg-mtm-surface p-1">
      <Link to={ROUTES.catalog} aria-current={active === 'disponible' ? 'page' : undefined} className={classe(active === 'disponible')}>
        À vendre
      </Link>
      <Link
        to={`${ROUTES.catalog}?statut=vendu`}
        aria-current={active === 'vendu' ? 'page' : undefined}
        className={classe(active === 'vendu')}
      >
        Vendus ({vendus})
      </Link>
    </nav>
  );
}
