import { useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TerrainFilters as TerrainFiltersValue } from '../../types/terrain';
import { typeBienLabel, vocationLabel } from '../../utils/bienLabels';
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
  /**
   * Mode « panneau » (catalogue sur ordinateur) : recherche libre et quatre critères essentiels toujours visibles,
   * les autres rangés sous « Plus de filtres ». `header` porte le choix À vendre / Vendus ; `onReset` efface tout.
   */
  panel?: boolean;
  header?: ReactNode;
  onReset?: () => void;
}

const baseInputClass =
  'w-full rounded-md border border-mtm-border bg-white px-3 py-2 text-sm text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary';
const panelInputClass =
  'w-full rounded-lg border border-mtm-border bg-white px-3 py-2.5 text-sm text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary';
const labelClass = 'text-xs font-semibold text-mtm-muted';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function TerrainFilters({ value, onChange, onSubmit, compact = false, sheet = false, panel = false, header, onReset }: TerrainFiltersProps) {
  const inputClass = panel ? panelInputClass : baseInputClass;
  // Critères du second niveau du panneau : rangés tant qu'aucun n'est utilisé.
  const avances = [value.nombrePieces, value.vocation, value.statutJuridique, value.superficieMin, value.superficieMax, value.prixPublicMin].filter(
    (critere) => critere !== undefined && critere !== '',
  ).length;
  const [ouvert, setOuvert] = useState(avances > 0);
  // Les options viennent de l'API (statuts paramétrables en back-office,
  // zones et vocations dérivées des terrains publiés) — rien n'est figé
  // dans le front, conformément à la section 25 du CDC.
  const { data: options } = useTerrainFilterOptions();

  /**
   * Le bâti et le sol ne se décrivent pas avec les mêmes critères : une villa
   * a une typologie (F1 à F6), une parcelle a un usage (habitation, commerce,
   * agricole). Les deux occupent donc le même emplacement, selon la nature
   * choisie. Sans type choisi, le catalogue reste mixte et c'est l'usage du
   * sol qui s'applique à tout.
   */
  const batiSelectionne = Boolean(value.typeBien) && value.typeBien !== 'terrain';

  function set<K extends keyof TerrainFiltersValue>(key: K, next: TerrainFiltersValue[K]): void {
    const suivant = { ...value, [key]: next, page: 1 };
    // Changer de nature libère le critère qui vient de disparaître : sinon le
    // catalogue continuerait de filtrer sur quelque chose que le visiteur ne
    // voit plus et ne peut plus annuler.
    if (key === 'typeBien') {
      const versBati = Boolean(next) && next !== 'terrain';
      if (versBati) delete suivant.vocation;
      else delete suivant.nombrePieces;
    }
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

  // Affichée à la place de l'usage du sol quand la recherche porte sur du
  // bâti. L'API ne renvoie des typologies que si des villas ou appartements
  // sont publiés : sans aucun, le filtre n'apparaît pas.
  const nombrePiecesField =
    options?.nombrePieces.length && batiSelectionne ? (
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

  const vocationField = batiSelectionne ? null : (
    <Field label="Usage du terrain">
      <select
        className={inputClass}
        value={value.vocation ?? ''}
        onChange={(event) => set('vocation', event.target.value || undefined)}
      >
        <option value="">Tous les types</option>
        {options?.vocation.map((vocation) => (
          <option key={vocation} value={vocation}>
            {vocationLabel(vocation)}
          </option>
        ))}
      </select>
    </Field>
  );

  const communeField = (
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
  );

  const statutJuridiqueField = (
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
  );

  const superficieField = (
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
  );

  const budgetField = (
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
  );

  const budgetMaxField = (
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
  );

  const budgetMinField = (
    <Field label="Budget minimum (FCFA)">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="Min"
        className={inputClass}
        value={value.prixPublicMin ?? ''}
        onChange={(event) => set('prixPublicMin', numberValue(event.target.value))}
      />
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

  if (panel) {
    const peutEffacer =
      avances > 0 || [value.typeBien, value.region, value.commune, value.prixPublicMax, value.search].some((c) => c !== undefined && c !== '');
    return (
      <form
        onSubmit={handleSubmit}
        aria-label="Filtres du catalogue"
        className="rounded-2xl border border-mtm-border/70 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(10,33,66,0.45)] sm:p-6"
      >
        {header && <div className="mb-4 empty:hidden">{header}</div>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mtm-muted" aria-hidden="true" />
            <input
              type="search"
              aria-label="Recherche libre"
              placeholder="Référence, nom, commune…"
              className="w-full rounded-xl border border-mtm-border bg-mtm-bg/60 py-3 pl-11 pr-11 text-[15px] text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-mtm-primary"
              value={value.search ?? ''}
              onChange={(event) => set('search', event.target.value || undefined)}
            />
            <MapPin className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mtm-primary/60" aria-hidden="true" />
          </div>
          <Button type="submit" className="shrink-0 px-8 py-3 text-[15px]">
            Rechercher
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {typeBienField}
          {regionField}
          {communeField}
          {budgetMaxField}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-expanded={ouvert}
            aria-controls="filtres-avances-catalogue"
            onClick={() => setOuvert((etat) => !etat)}
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-mtm-primary hover:text-mtm-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
          >
            {ouvert ? 'Moins de filtres' : 'Plus de filtres'}
            {avances > 0 && !ouvert && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mtm-primary px-1.5 text-[11px] font-bold text-white">{avances}</span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${ouvert ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {peutEffacer && onReset && (
            <button type="button" onClick={onReset} className="text-sm font-medium text-mtm-muted underline-offset-4 hover:text-mtm-accent hover:underline">
              Tout effacer
            </button>
          )}
        </div>

        {ouvert && (
          <div id="filtres-avances-catalogue" className="mt-4 grid grid-cols-2 gap-4 border-t border-mtm-border pt-5 lg:grid-cols-4">
            {nombrePiecesField}
            {vocationField}
            {statutJuridiqueField}
            {budgetMinField}
            {superficieField}
          </div>
        )}
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

      {communeField}

      {nombrePiecesField}

      {vocationField}

      {statutJuridiqueField}

      {superficieField}

      {budgetField}

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
