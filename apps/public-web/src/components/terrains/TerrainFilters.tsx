import type { FormEvent, ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TerrainFilters as TerrainFiltersValue } from '../../types/terrain';
import { typeBienLabel } from '../../utils/bienLabels';
import { useTerrainFilterOptions } from '../../hooks/useTerrainFilterOptions';
import { Button } from '../ui/Button';
import { ROUTES } from '../../routes';

interface TerrainFiltersProps {
  value: TerrainFiltersValue;
  onChange: (next: TerrainFiltersValue) => void;
  onSubmit?: () => void;
  /**
   * Mode « recherche rapide » (accueil) : seuls les 3 critères d'entrée les
   * plus courants sont affichés, avec un renvoi vers le catalogue pour les
   * filtres complets. Afficher les 8 champs dès l'accueil surchargeait la
   * page et masquait le contenu situé en dessous.
   */
  compact?: boolean;
  /**
   * Mode « feuille » (catalogue sur mobile) : les critères seuls, en une
   * colonne ; la recherche libre et les boutons sont portés par le parent.
   */
  sheet?: boolean;
}

const inputClass =
  'w-full rounded-md border border-mtm-border bg-white px-3 py-2 text-sm text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary';
const labelClass = 'text-xs font-semibold text-mtm-muted';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function TerrainFilters({ value, onChange, onSubmit, compact = false, sheet = false }: TerrainFiltersProps) {
  // Les options viennent de l'API (statuts paramétrables en back-office,
  // zones et vocations dérivées des terrains publiés) — rien n'est figé
  // dans le front, conformément à la section 25 du CDC.
  const { data: options } = useTerrainFilterOptions();

  function set<K extends keyof TerrainFiltersValue>(key: K, next: TerrainFiltersValue[K]): void {
    const suivant = { ...value, [key]: next, page: 1 };
    // Une parcelle nue n'a pas de pièces : revenir sur « Terrain » doit
    // libérer la typologie, sinon le catalogue continuerait de filtrer sur un
    // critère que le visiteur ne voit plus.
    if (key === 'typeBien' && next === 'terrain') delete suivant.nombrePieces;
    onChange(suivant);
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit?.();
  }

  const numberValue = (next: string): number | undefined => (next ? Number(next) : undefined);

  const regionField = (
    <Field label="Région / zone">
      <select
        className={inputClass}
        value={value.region ?? ''}
        onChange={(event) => set('region', event.target.value || undefined)}
      >
        <option value="">Toutes les zones</option>
        {options?.region.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>
    </Field>
  );

  // La nature du bien d'abord : c'est le premier tri que fait un visiteur,
  // bien avant la zone ou le budget. À ne pas confondre avec la vocation
  // juste en dessous, qui dit l'usage du sol et non ce qui est vendu.
  const typeBienField = (
    <Field label="Type de bien">
      <select
        className={inputClass}
        value={value.typeBien ?? ''}
        onChange={(event) => set('typeBien', event.target.value || undefined)}
      >
        <option value="">Tous les biens</option>
        {options?.typeBien.map((type) => (
          <option key={type} value={type}>
            {typeBienLabel(type)}
          </option>
        ))}
      </select>
    </Field>
  );

  // N'a de sens que si des biens bâtis sont en vente — l'API ne renvoie des
  // typologies que si des villas ou appartements sont publiés — et que la
  // recherche n'est pas restreinte aux parcelles nues.
  const nombrePiecesField =
    options?.nombrePieces.length && value.typeBien !== 'terrain' ? (
    <Field label="Nombre de pièces">
      <select
        className={inputClass}
        value={value.nombrePieces ?? ''}
        onChange={(event) => set('nombrePieces', event.target.value || undefined)}
      >
        <option value="">Indifférent</option>
        {options.nombrePieces.map((piece) => (
          <option key={piece} value={piece}>
            {piece}
          </option>
        ))}
      </select>
    </Field>
  ) : null;

  const vocationField = (
    <Field label="Usage du terrain">
      <select
        className={inputClass}
        value={value.vocation ?? ''}
        onChange={(event) => set('vocation', event.target.value || undefined)}
      >
        <option value="">Tous les types</option>
        {options?.vocation.map((vocation) => (
          <option key={vocation} value={vocation}>
            {vocation}
          </option>
        ))}
      </select>
    </Field>
  );

  const submitButton = (
    <div className="flex items-end">
      <Button type="submit" className="w-full">
        <Search className="h-4 w-4" aria-hidden="true" />
        Rechercher
      </Button>
    </div>
  );

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        aria-label="Recherche rapide de biens"
        className="rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {typeBienField}
          {regionField}
          <Field label="Budget maximum (FCFA)">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Ex. 10 000 000"
              className={inputClass}
              value={value.prixPublicMax ?? ''}
              onChange={(event) => set('prixPublicMax', numberValue(event.target.value))}
            />
          </Field>
          {submitButton}
        </div>

        <Link
          to={ROUTES.catalog}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-mtm-primary hover:underline"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Recherche avancée
        </Link>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Filtres du catalogue"
      className={
        sheet
          ? 'grid grid-cols-1 gap-4'
          : 'grid grid-cols-1 gap-3 rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4'
      }
    >
      {typeBienField}

      {regionField}

      <Field label="Commune">
        <select
          className={inputClass}
          value={value.commune ?? ''}
          onChange={(event) => set('commune', event.target.value || undefined)}
        >
          <option value="">Toutes les communes</option>
          {options?.commune.map((commune) => (
            <option key={commune} value={commune}>
              {commune}
            </option>
          ))}
        </select>
      </Field>

      {nombrePiecesField}

      {vocationField}

      <Field label="Statut juridique">
        <select
          className={inputClass}
          value={value.statutJuridique ?? ''}
          onChange={(event) => set('statutJuridique', event.target.value || undefined)}
        >
          <option value="">Tous</option>
          {options?.statutJuridique.map((statut) => (
            <option key={statut} value={statut}>
              {statut}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-1">
        {/* Toujours la parcelle, jamais l'habitable : comparer la surface
            au sol d'un terrain à l'habitable d'une villa n'aurait aucun sens
            dans un même filtre. */}
        <legend className={labelClass}>Superficie du terrain (m²)</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="Superficie minimum en m²"
            placeholder="Min"
            className={inputClass}
            value={value.superficieMin ?? ''}
            onChange={(event) => set('superficieMin', numberValue(event.target.value))}
          />
          <span className="text-mtm-muted">—</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="Superficie maximum en m²"
            placeholder="Max"
            className={inputClass}
            value={value.superficieMax ?? ''}
            onChange={(event) => set('superficieMax', numberValue(event.target.value))}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className={labelClass}>Budget (FCFA)</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="Budget minimum en FCFA"
            placeholder="Min"
            className={inputClass}
            value={value.prixPublicMin ?? ''}
            onChange={(event) => set('prixPublicMin', numberValue(event.target.value))}
          />
          <span className="text-mtm-muted">—</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="Budget maximum en FCFA"
            placeholder="Max"
            className={inputClass}
            value={value.prixPublicMax ?? ''}
            onChange={(event) => set('prixPublicMax', numberValue(event.target.value))}
          />
        </div>
      </fieldset>

      {!sheet && (
        <Field label="Recherche libre">
          <input
            type="text"
            className={inputClass}
            placeholder="Référence, nom, commune..."
            value={value.search ?? ''}
            onChange={(event) => set('search', event.target.value || undefined)}
          />
        </Field>
      )}

      {!sheet && submitButton}
    </form>
  );
}
