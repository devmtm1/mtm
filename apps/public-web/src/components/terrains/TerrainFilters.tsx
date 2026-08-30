import {
  ChevronDown,
  Compass,
  FileCheck2,
  Filter,
  MapPin,
  Search,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

type TerrainFiltersProps = {
  region: string;
  type: string;
  budget: string;
  size: string;
  legalStatus: string;
  onRegionChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onBudgetChange: (value: string) => void;
  onSizeChange: (value: string) => void;
  onLegalStatusChange: (value: string) => void;
  onSearch: () => void;
  hideHeading?: boolean;
};

export function TerrainFilters({
  hideHeading = false,
  ...props
}: Readonly<TerrainFiltersProps>) {
  return (
    <form
      className="filter-panel"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSearch();
      }}
    >
      {!hideHeading && (
        <div className="filter-panel-heading">
          <div>
            <p className="eyebrow">Recherche immobilière</p>
            <h2 className="filter-panel-title">Trouvez le terrain adapté à votre projet</h2>
            <p className="filter-panel-description">Affinez votre recherche selon la zone, la superficie et le statut du bien.</p>
          </div>
          <span className="filter-panel-icon" aria-hidden="true"><Filter size={19} /></span>
        </div>
      )}
      <div className="filter-grid">
        <FilterSelect
          icon={<MapPin size={17} />}
          label="Zone"
          value={props.region}
          onChange={props.onRegionChange}
          options={['Toutes les zones', 'Dakar', 'Thiès']}
        />
        <FilterSelect
          icon={<Compass size={17} />}
          label="Type de projet"
          value={props.type}
          onChange={props.onTypeChange}
          options={['Terrain à bâtir', 'Résidence', 'Investissement']}
        />
        <FilterSelect
          icon={<span className="ml-1 text-lg font-semibold">m²</span>}
          label="Superficie"
          value={props.size}
          onChange={props.onSizeChange}
          options={[
            'Toutes les superficies',
            'Moins de 200 m²',
            '200 à 400 m²',
            'Plus de 400 m²',
          ]}
        />
        <FilterSelect
          icon={<span className="ml-1 text-lg font-semibold">₣</span>}
          label="Budget"
          value={props.budget}
          onChange={props.onBudgetChange}
          options={[
            'Tous les budgets',
            'Moins de 15 M',
            '15 à 30 M',
            'Plus de 30 M',
          ]}
        />
        <FilterSelect
          icon={<FileCheck2 size={17} />}
          label="Statut juridique"
          value={props.legalStatus}
          onChange={props.onLegalStatusChange}
          options={['Tous les statuts', 'Titre foncier', 'Délibération']}
        />
      </div>
      <button
        type="submit"
        className="filter-submit"
      >
        <Search size={17} /> Rechercher
      </button>
    </form>
  );
}

type FilterSelectProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};
function FilterSelect({
  icon,
  label,
  value,
  options,
  onChange,
}: Readonly<FilterSelectProps>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="field filter-select" ref={containerRef}>
      {icon}
      <span className="filter-select-content">
        <small>{label}</small>
        <button
          type="button"
          className="select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{value}</span>
        </button>
      </span>
      <ChevronDown className={`select-chevron ${open ? 'is-open' : ''}`} size={16} />
      {open && (
        <div id={listboxId} className="select-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={value === option}
              className={`select-option ${value === option ? 'is-selected' : ''}`}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
