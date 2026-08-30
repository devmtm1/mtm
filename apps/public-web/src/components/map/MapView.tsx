import { useEffect, useRef } from 'react';
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

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

  return <div ref={containerRef} className="mtm-leaflet-map" style={{ height }} />;
}
