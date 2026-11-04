import { useMemo, useState } from 'react';
import { ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import type { CategoriePublique, LotPublic } from '../../api/programmes';
import { lotsAffiches, nombreDeLots, TRIS_LOTS, type TriLots } from '../../utils/programmes';
import { LotRow } from './LotRow';
import { LotTile, type VisuelLot } from './LotTile';

interface LotsExplorerProps {
  lots: LotPublic[];
  categories: CategoriePublique[];
  onVisite: (lot: LotPublic) => void;
  /** Ce que montre une tuile sans photo : le plan de masse du lotissement, à défaut une de ses photos. */
  visuel?: VisuelLot | null;
}

const puce = (actif: boolean) =>
  `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary ${
    actif
      ? 'border-mtm-primary-dark bg-mtm-primary-dark text-white shadow-card'
      : 'border-mtm-border bg-mtm-surface text-mtm-text hover:border-mtm-primary hover:text-mtm-primary'
  }`;

/**
 * Les lots d'un lotissement : une liste alignée, un lot par ligne, ou des tuiles régulières pour balayer d'un coup
 * d'œil. On filtre par catégorie, on trie par prix ou superficie ; les lots réservés et vendus se montrent à la
 * demande, grisés, après ceux qu'on peut acheter.
 */
export function LotsExplorer({ lots, categories, onVisite, visuel = null }: LotsExplorerProps) {
  const [categorie, setCategorie] = useState('');
  const [seulementDisponibles, setSeulementDisponibles] = useState(true);
  const [tri, setTri] = useState<TriLots>('numero');
  const [vue, setVue] = useState<'liste' | 'tuiles'>('tuiles');

  // Dès qu'une tuile a une image, toutes en ont une (au moins un fond à la charte) : la grille reste régulière.
  const avecPhoto = visuel !== null || lots.some((l) => l.photo);
  const libres = lots.filter((l) => l.statut === 'Disponible').length;
  const autres = lots.length - libres;
  const affiches = useMemo(
    () => lotsAffiches(lots, { categorie, seulementDisponibles, tri }),
    [lots, categorie, seulementDisponibles, tri],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer les lots">
          <button type="button" className={puce(categorie === '')} aria-pressed={categorie === ''} onClick={() => setCategorie('')}>
            Tous les lots
            <span className={categorie === '' ? 'text-mtm-primary-light' : 'text-mtm-muted'}>({libres})</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.nom}
              type="button"
              className={puce(categorie === c.nom)}
              aria-pressed={categorie === c.nom}
              onClick={() => setCategorie(categorie === c.nom ? '' : c.nom)}
            >
              {c.nom}
              <span className={categorie === c.nom ? 'text-mtm-primary-light' : 'text-mtm-primary-medium'}>({c.lotsDisponibles})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-mtm-muted">
            <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Trier les lots</span>
            <select
              value={tri}
              onChange={(event) => setTri(event.target.value as TriLots)}
              className="rounded-md border border-mtm-border bg-mtm-surface px-2.5 py-1.5 text-sm font-semibold text-mtm-text focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary max-lg:min-h-11"
            >
              {TRIS_LOTS.map((t) => (
                <option key={t.cle} value={t.cle}>
                  {t.libelle}
                </option>
              ))}
            </select>
          </label>
          <div className="flex rounded-xl border border-mtm-border bg-mtm-surface p-0.5" role="group" aria-label="Mode d’affichage des lots">
            {(['tuiles', 'liste'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={vue === mode}
                aria-label={mode === 'liste' ? 'Afficher les lots en liste' : 'Afficher les lots en tuiles'}
                onClick={() => setVue(mode)}
                className={`flex items-center rounded-[0.6rem] px-3 py-2 max-lg:min-h-11 ${
                  vue === mode ? 'bg-mtm-primary-dark text-white' : 'text-mtm-muted hover:text-mtm-primary'
                }`}
              >
                {mode === 'liste' ? <List className="h-4 w-4" aria-hidden="true" /> : <LayoutGrid className="h-4 w-4" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-mtm-muted" aria-live="polite">
        <strong className="text-mtm-text">{nombreDeLots(affiches.length)}</strong>
        {seulementDisponibles ? ' disponible' + (affiches.length > 1 ? 's' : '') : ' affichés'}
        {autres > 0 && (
          <>
            {' · '}
            <button
              type="button"
              className="font-semibold text-mtm-primary hover:underline"
              onClick={() => setSeulementDisponibles((v) => !v)}
            >
              {seulementDisponibles ? `Voir aussi les ${autres} lots réservés ou vendus` : 'Masquer les lots réservés ou vendus'}
            </button>
          </>
        )}
      </p>

      {affiches.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-mtm-border bg-mtm-surface p-6 text-center text-sm text-mtm-muted">
          Aucun lot ne correspond à ce choix. {libres > 0 && 'Essayez une autre catégorie.'}
        </p>
      ) : vue === 'liste' ? (
        <ul className="mt-4 divide-y divide-mtm-border overflow-hidden rounded-2xl border border-mtm-border shadow-card">
          {affiches.map((lot) => (
            <LotRow key={lot.id} lot={lot} onVisite={onVisite} />
          ))}
        </ul>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {affiches.map((lot) => (
            <LotTile key={lot.id} lot={lot} visuel={visuel} avecPhoto={avecPhoto} />
          ))}
        </ul>
      )}
    </div>
  );
}
