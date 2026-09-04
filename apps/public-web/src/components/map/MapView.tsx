import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  popupHtml?: string;
  color?: string;
};

type MapViewProps = {
  markers: MapMarker[];
  height?: number;
  center?: [number, number];
  zoom?: number;
  route?: Array<[number, number]>;
  onMarkerClick?: (id: string) => void;
};

const DEFAULT_CENTER: [number, number] = [14.7167, -17.4677];

function createPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'mtm-map-pin',
    html: `<span class="mtm-map-pin-dot" style="--pin-color:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

export function MapView({
  markers,
  height = 360,
  center,
  zoom = 13,
  route,
  onMarkerClick,
}: Readonly<MapViewProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapType, setMapType] = useState<'plan' | 'satellite'>('plan');
  const clickRef = useRef<MapViewProps['onMarkerClick']>(onMarkerClick);
  clickRef.current = onMarkerClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const valid = markers.filter(
      (marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng),
    );
    const initialCenter =
      center ?? (valid[0] ? [valid[0].lat, valid[0].lng] : DEFAULT_CENTER);

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
    }).setView(initialCenter, zoom);

    const tileUrl =
      mapType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileAttr =
      mapType === 'satellite'
        ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        : '&copy; OpenStreetMap';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: tileAttr,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileAttr =
      mapType === 'satellite'
        ? 'Tiles &copy; Esri &mdash; Source: Esri, GeoEye'
        : '&copy; OpenStreetMap';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: tileAttr,
      maxZoom: 19,
    }).addTo(map);
  }, [mapType]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const valid = markers.filter(
      (marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng),
    );

    valid.forEach((marker) => {
      const leafMarker = L.marker([marker.lat, marker.lng], {
        icon: createPinIcon(marker.color ?? '#e2603f'),
      }).addTo(map);

      if (marker.popupHtml) {
        leafMarker.bindPopup(marker.popupHtml);
      }
      leafMarker.on('click', () => clickRef.current?.(marker.id));
    });

    if (route && route.length > 1) {
      L.polyline(route, {
        color: '#e2603f',
        weight: 3,
        opacity: 0.8,
        dashArray: '6 8',
      }).addTo(map);
    }

    if (valid.length) {
      const bounds = L.latLngBounds(
        valid.map((marker) => [marker.lat, marker.lng] as [number, number]),
      );
      const next = route?.length ? bounds.extend(route[0]) : bounds;
      map.fitBounds(next, { padding: [40, 40], maxZoom: 16 });
    }
  }, [markers, route]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-sand-300">
      <div className="absolute right-3 top-3 z-[1000] flex gap-1 rounded-lg bg-white/90 p-1 shadow-md backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setMapType('plan')}
          className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
            mapType === 'plan'
              ? 'bg-amber-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Plan
        </button>
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
            mapType === 'satellite'
              ? 'bg-amber-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Satellite
        </button>
      </div>
      <div ref={containerRef} className="mtm-leaflet-map" style={{ height }} />
    </div>
  );
}
