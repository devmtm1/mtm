import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PointInteret } from '../../types/terrain';
import { markerIcon } from './leaflet-icon';
import { observeMapResize } from './map-resize';
import { installBaseLayers } from './map-layers';

interface TerrainMapProps {
  latitude: number;
  longitude: number;
  title: string;
  pointsInteret?: PointInteret[] | null;
}

export function TerrainMap({ latitude, longitude, title, pointsInteret }: TerrainMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 14,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    installBaseLayers(map);

    L.marker([latitude, longitude], { icon: markerIcon }).addTo(map).bindPopup(title);

    for (const point of pointsInteret ?? []) {
      if (point.latitude === undefined || point.longitude === undefined) continue;
      L.marker([point.latitude, point.longitude], { icon: markerIcon })
        .addTo(map)
        .bindPopup(
          `${point.nom}${point.distanceKm !== undefined ? ` · ${point.distanceKm} km` : ''}`,
        );
    }

    const stopObserving = observeMapResize(map, containerRef.current);

    return () => {
      stopObserving();
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, title, pointsInteret]);

  // `isolate` : les calques Leaflet ont des z-index élevés (tuiles 400,
  // contrôles 1000). Sans contexte d'empilement propre, ils passeraient
  // au-dessus des fenêtres modales (z-50) dès que la carte défile sous elles.
  return (
    <div
      ref={containerRef}
      className="isolate h-80 w-full overflow-hidden rounded-lg border border-mtm-border"
      role="img"
      aria-label={`Carte de localisation de ${title}`}
    />
  );
}
