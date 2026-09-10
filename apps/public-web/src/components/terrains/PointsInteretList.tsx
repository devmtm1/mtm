import { MapPinned } from 'lucide-react';
import type { PointInteret } from '../../types/terrain';

export function PointsInteretList({ points }: { points: PointInteret[] }) {
  if (points.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {points.map((point, index) => (
        <li
          key={`${point.nom}-${index}`}
          className="flex items-center justify-between rounded-md border border-mtm-border bg-mtm-surface px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2 text-mtm-text">
            <MapPinned className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
            {point.nom}
            {point.type && <span className="text-mtm-muted">· {point.type}</span>}
          </span>
          {point.distanceKm !== undefined && (
            <span className="font-semibold text-mtm-muted">{point.distanceKm} km</span>
          )}
        </li>
      ))}
    </ul>
  );
}
