/**
 * Contenu d'une bulle de carte en nœud de texte. `bindPopup(chaîne)` de Leaflet
 * insère la chaîne comme HTML : un nom de terrain ou de point d'intérêt saisi
 * au back-office pourrait alors injecter du balisage sur le site public.
 */
export function popupText(texte: string, gras = false): HTMLElement {
  const element = document.createElement(gras ? 'strong' : 'span');
  element.textContent = texte;
  return element;
}
