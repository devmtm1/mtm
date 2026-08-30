import { TerrainFilters } from '../terrains/TerrainFilters';

type TerrainSearchSectionProps = {
  filters: {
    region: string;
    type: string;
    budget: string;
    size: string;
    legalStatus: string;
  };
  onFilterChange: {
    region: (value: string) => void;
    type: (value: string) => void;
    budget: (value: string) => void;
    size: (value: string) => void;
    legalStatus: (value: string) => void;
  };
  onSearch: () => void;
  overlap?: boolean;
  hideHeading?: boolean;
};

export function TerrainSearchSection({
  filters,
  onFilterChange,
  onSearch,
  overlap = true,
  hideHeading = false,
}: Readonly<TerrainSearchSectionProps>) {
  return (
    <section
      className={`relative z-10 mx-auto max-w-6xl px-5 ${
        overlap ? '-mt-6 lg:-mt-8' : 'mt-10'
      }`}
    >
      <TerrainFilters
        {...filters}
        onRegionChange={onFilterChange.region}
        onTypeChange={onFilterChange.type}
        onBudgetChange={onFilterChange.budget}
        onSizeChange={onFilterChange.size}
        onLegalStatusChange={onFilterChange.legalStatus}
        onSearch={onSearch}
        hideHeading={hideHeading}
      />
    </section>
  );
}
