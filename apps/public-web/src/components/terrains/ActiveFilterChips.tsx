import { X } from 'lucide-react';
import type { FilterChip } from './active-filter-chips';

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onRemove: (chip: FilterChip) => void;
  onClear: () => void;
}

/**
 * Ce qui filtre la liste, en un coup d'œil — et retirable d'un tap, sans
 * rouvrir le formulaire. Indispensable sur mobile où les critères sont repliés.
 */
export function ActiveFilterChips({ chips, onRemove, onClear }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => onRemove(chip)}
            className="inline-flex max-w-[16rem] items-center gap-1 rounded-full border border-mtm-primary/30 bg-mtm-primary-subtle py-1 pl-3 pr-2 text-xs font-semibold text-mtm-primary hover:bg-mtm-primary/10"
            aria-label={`Retirer le filtre ${chip.label}`}
          >
            <span className="truncate">{chip.label}</span>
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button type="button" onClick={onClear} className="text-xs font-semibold text-mtm-muted underline-offset-2 hover:text-mtm-text hover:underline">
            Tout effacer
          </button>
        </li>
      )}
    </ul>
  );
}
