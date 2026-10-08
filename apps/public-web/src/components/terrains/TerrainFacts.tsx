import { Bath, BedDouble, Coins, Compass, LandPlot, Layers, Ruler, ShieldCheck, TriangleAlert, Check, X, type LucideIcon } from 'lucide-react';
import type { Terrain } from '../../types/terrain';
import { caracteristiques, faitsEssentiels, type FaitIcone } from '../../utils/terrainFacts';
import { niveauStatutJuridique } from '../../utils/statutJuridique';

const ICONES: Record<FaitIcone, LucideIcon> = {
  surface: Ruler,
  pieces: BedDouble,
  eau: Bath,
  parcelle: LandPlot,
  statut: ShieldCheck,
  vocation: Compass,
  prix: Coins,
  niveaux: Layers,
  annee: Layers,
  route: Layers,
};

/** « L'essentiel » en quatre repères : ce qu'un acheteur lit avant tout le reste. */
export function TerrainEssentiel({ terrain }: { terrain: Terrain }) {
  const faits = faitsEssentiels(terrain);
  if (faits.length === 0) return null;

  return (
    <ul aria-label="L’essentiel" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {faits.map((fait) => {
        const Icone = ICONES[fait.icone];
        return (
          <li
            key={fait.key}
            className="flex items-center gap-3 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-3.5 shadow-card lg:rounded-xl lg:border-mtm-border"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
              <Icone className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-mtm-muted">{fait.label}</span>
              <span className="block text-sm font-bold leading-snug text-mtm-text">{fait.value}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Caractéristiques détaillées, regroupées ; une information absente n'est pas montrée. */
export function TerrainCaracteristiques({ terrain }: { terrain: Terrain }) {
  const groupes = caracteristiques(terrain);
  if (groupes.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-lg font-bold text-mtm-text">Caractéristiques</h2>
      <div className="mt-3 flex flex-col gap-3">
        {groupes.map((groupe) => (
          <div key={groupe.titre} className="overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-surface shadow-card lg:rounded-lg lg:border-mtm-border">
            <h3 className="bg-mtm-bg/70 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-mtm-muted">{groupe.titre}</h3>
            <dl className="divide-y divide-mtm-border/70">
              {groupe.lignes.map((ligne) => (
                <div key={ligne.label} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-mtm-muted">{ligne.label}</dt>
                  <dd className="flex items-center gap-1.5 text-right font-semibold text-mtm-text">
                    {ligne.etat === 'oui' && <Check className="h-4 w-4 text-mtm-success" aria-hidden="true" />}
                    {ligne.etat === 'non' && <X className="h-4 w-4 text-mtm-muted" aria-hidden="true" />}
                    {ligne.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

const ENCART = {
  solide: { fond: 'border-mtm-success/30 bg-mtm-success/5', icone: 'bg-mtm-success text-white', titre: 'text-mtm-success' },
  standard: { fond: 'border-mtm-primary/25 bg-mtm-primary-subtle/60', icone: 'bg-mtm-primary text-white', titre: 'text-mtm-primary' },
  attention: { fond: 'border-mtm-warning/30 bg-mtm-warning/5', icone: 'bg-mtm-warning text-white', titre: 'text-mtm-warning' },
} as const;

/**
 * Le statut juridique en toutes lettres, tout en haut de la fiche : c'est
 * l'information qui décide d'un achat foncier. Le niveau de vérification de
 * MTM l'accompagne.
 */
export function TerrainStatutJuridique({ terrain }: { terrain: Terrain }) {
  if (!terrain.statutJuridique) return null;
  const niveau = niveauStatutJuridique(terrain.statutJuridique);
  const style = ENCART[niveau];
  const Icone = niveau === 'attention' ? TriangleAlert : ShieldCheck;

  return (
    <section aria-label="Statut juridique" className={`flex items-center gap-3.5 rounded-2xl border p-4 lg:rounded-xl ${style.fond}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.icone}`}>
        <Icone className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-mtm-muted">Statut juridique</p>
        <p className={`font-display text-xl font-bold leading-tight ${style.titre}`}>{terrain.statutJuridique}</p>
        {terrain.niveauVerification && (
          <p className="mt-0.5 text-sm text-mtm-muted">Vérification MTM : {terrain.niveauVerification}</p>
        )}
      </div>
    </section>
  );
}
