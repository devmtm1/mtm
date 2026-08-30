import { ArrowRight, MapPin } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Terrain } from '../../domain/terrains/types';

type TerrainCardProps = {
  terrain: Terrain;
  index: number;
  onSelect: (terrain: Terrain) => void;
};

export function TerrainCard({
  terrain,
  index,
  onSelect,
}: Readonly<TerrainCardProps>) {
  return (
    <article
      className="terrain-card group"
      style={{ '--card-index': index } as CSSProperties}
    >
      <div className="terrain-card-media relative aspect-[1.75] overflow-hidden">
        <img
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          src={terrain.image}
          alt={`${terrain.name}, ${terrain.location}`}
          loading="lazy"
        />
        <span className="terrain-card-tag absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-ink">
          {terrain.tag}
        </span>
        <span className="terrain-card-status absolute bottom-2.5 right-2.5 rounded-full bg-ink/90 px-2 py-0.5 text-[0.62rem] font-semibold text-white">
          {terrain.status}
        </span>
      </div>
      <div className="p-3.5">
        <div className="terrain-card-reference">
          <p>{terrain.id}</p>
          {terrain.misEnAvant && (
            <span className="terrain-card-featured">Mis en avant</span>
          )}
        </div>
        <h3 className="mt-1 font-display text-base leading-snug text-ink">
          {terrain.name}
        </h3>
        <p className="terrain-card-location mt-1 text-[0.78rem] text-slate-500">
          <MapPin size={13} /> {terrain.location}
        </p>
        <div className="terrain-card-details mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <div>
            <p className="text-[0.68rem] text-slate-400">Superficie</p>
            <p className="mt-0.5 text-[0.8rem] font-semibold text-ink">
              {terrain.size}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.68rem] text-slate-400">Prix </p>
            <p className="mt-0.5 text-[0.8rem] font-semibold text-ink">
              {terrain.price}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="card-action mt-3 w-full rounded-lg px-3 py-2 text-[0.78rem] font-bold"
          onClick={() => onSelect(terrain)}
        >
          Voir la fiche <ArrowRight size={14} className="ml-1 inline" />
        </button>
      </div>
    </article>
  );
}
