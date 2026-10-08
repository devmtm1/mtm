import { useTerrainFilterOptions } from '../../hooks/useTerrainFilterOptions';

export type CatalogStatut = 'tous' | 'disponible' | 'vendu';

const CHOIX: { valeur: CatalogStatut; label: string }[] = [
  { valeur: 'tous', label: 'Tous' },
  { valeur: 'disponible', label: 'À vendre' },
  { valeur: 'vendu', label: 'Vendus' },
];

/**
 * Tous les biens, ceux à vendre, ou les références vendues. Le catalogue les
 * mêle par défaut (les biens à vendre d'abord) ; cet interrupteur n'existe que
 * si MTM affiche au moins une référence vendue.
 */
export function CatalogStatutSwitch({ value, onChange }: { value: CatalogStatut; onChange: (statut: CatalogStatut) => void }) {
  const { data } = useTerrainFilterOptions();
  const vendus = data?.vendus ?? 0;
  if (vendus === 0) return null;

  return (
    <div role="group" aria-label="Biens à afficher" className="mt-4 inline-flex rounded-full border border-mtm-border bg-mtm-surface p-1">
      {CHOIX.map(({ valeur, label }) => (
        <button
          key={valeur}
          type="button"
          aria-pressed={value === valeur}
          onClick={() => onChange(valeur)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            value === valeur ? 'bg-mtm-primary text-white shadow-card' : 'text-mtm-muted hover:text-mtm-primary'
          }`}
        >
          {valeur === 'vendu' ? `${label} (${vendus})` : label}
        </button>
      ))}
    </div>
  );
}
