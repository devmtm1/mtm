import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import type { Terrain } from '../../types/terrain';
import { formatMoney, formatSuperficie } from '../../utils/format';
import { ROUTES } from '../../routes';
import { markerIcon } from './leaflet-icon';
import { EmptyState } from '../ui/EmptyState';

/**
 * Vue cartographique du catalogue : localise l'ensemble des terrains publiés
 * (section 9 du CDC — « localiser les terrains »), avec une bulle cliquable
 * renvoyant vers la fiche détaillée.
 */
export function TerrainsMap({ terrains }: { terrains: Terrain[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const located = terrains.filter(
    (terrain) => terrain.latitude !== null && terrain.longitude !== null,
  );

  useEffect(() => {
    if (!containerRef.current || located.length === 0) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; contributeurs OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const bounds: [number, number][] = [];

    for (const terrain of located) {
      const position: [number, number] = [terrain.latitude!, terrain.longitude!];
      bounds.push(position);

      const popup = document.createElement('div');
      popup.innerHTML = `
        <strong>${terrain.nom}</strong><br />
        <span>${formatSuperficie(terrain.superficie, terrain.uniteSuperficie)} · ${formatMoney(terrain.prixPublic)}</span><br />
      `;
      const link = document.createElement('button');
      link.type = 'button';
      link.textContent = 'Voir la fiche';
      link.style.cssText =
        'margin-top:6px;color:#B43036;font-weight:600;text-decoration:underline;cursor:pointer;background:none;border:none;padding:0;';
      link.addEventListener('click', () => navigateRef.current(ROUTES.terrainDetail(terrain.id)));
      popup.appendChild(link);

      L.marker(position, { icon: markerIcon }).addTo(map).bindPopup(popup);
    }

    map.fitBounds(L.latLngBounds(bounds).pad(0.2), { maxZoom: 13 });

    return () => {
      map.remove();
    };
  }, [located]);

  if (located.length === 0) {
    return (
      <EmptyState
        title="Aucun terrain géolocalisé"
        description="Les terrains correspondant à votre recherche n'ont pas encore de coordonnées GPS."
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[32rem] w-full overflow-hidden rounded-lg border border-mtm-border"
      role="img"
      aria-label="Carte des terrains disponibles"
    />
  );
}
