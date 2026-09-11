import L from 'leaflet';

/**
 * Marqueur Leaflet aux couleurs MTM, encodé en SVG inline.
 *
 * Les icônes par défaut de Leaflet référencent des PNG via des chemins
 * relatifs qui ne survivent pas au bundling Vite ; les charger depuis un CDN
 * externe ajoutait une dépendance réseau et un point de rupture. Un SVG
 * embarqué supprime les deux et respecte la charte.
 */
const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
  <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 25 13 25s13-15.25 13-25c0-7.18-5.82-13-13-13z" fill="#B43036"/>
  <circle cx="13" cy="13" r="5" fill="#FFFFFF"/>
</svg>`.trim();

export const markerIcon = L.icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(PIN_SVG)}`,
  iconSize: [26, 38],
  iconAnchor: [13, 38],
  popupAnchor: [0, -34],
});
