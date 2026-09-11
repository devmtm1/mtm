import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PointInteret } from '../../types/terrain';
import { markerIcon } from './leaflet-icon';

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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; contributeurs OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    L.marker([latitude, longitude], { icon: markerIcon }).addTo(map).bindPopup(title);

    for (const point of pointsInteret ?? []) {
      if (point.latitude === undefined || point.longitude === undefined) continue;
      L.marker([point.latitude, point.longitude], { icon: markerIcon })
        .addTo(map)
        .bindPopup(
          `${point.nom}${point.distanceKm !== undefined ? ` · ${point.distanceKm} km` : ''}`,
        );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, title, pointsInteret]);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-lg border border-mtm-border"
      role="img"
      aria-label={`Carte de localisation de ${title}`}
    />
  );
}
