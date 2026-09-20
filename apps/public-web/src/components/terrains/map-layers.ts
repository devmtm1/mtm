import L from 'leaflet';

/**
 * Fonds de carte du site : le plan (OpenStreetMap) et la vue satellite
 * demandée par le cahier des charges (section 7). Le satellite est la
 * mosaïque Esri World Imagery, libre d'usage avec attribution et sans clé ;
 * un calque de noms de lieux est posé par-dessus pour rester lisible.
 */
export type BaseLayerKey = 'plan' | 'satellite';

const STORAGE_KEY = 'mtm.map-layer';

export function createBaseLayers(): Record<BaseLayerKey, L.Layer> {
  const plan = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; contributeurs OpenStreetMap',
    maxZoom: 19,
  });
  const imagery = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Imagerie &copy; Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
    },
  );
  const labels = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, pane: 'overlayPane' },
  );
  return { plan, satellite: L.layerGroup([imagery, labels]) };
}

/** Dernier fond choisi par le visiteur, pour le retrouver d'une carte à l'autre. */
export function preferredBaseLayer(): BaseLayerKey {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'satellite' ? 'satellite' : 'plan';
  } catch {
    return 'plan';
  }
}

function rememberBaseLayer(key: BaseLayerKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // stockage indisponible : le choix vaut pour cette carte seulement
  }
}

/**
 * Pose les deux fonds sur la carte et ajoute un sélecteur Plan / Satellite
 * (en haut à droite), plus lisible qu'un contrôle de calques à cases à cocher.
 */
export function installBaseLayers(map: L.Map, initial: BaseLayerKey = preferredBaseLayer()): void {
  const layers = createBaseLayers();
  let current: BaseLayerKey = initial;
  layers[current].addTo(map);

  const Switcher = L.Control.extend({
    onAdd(): HTMLElement {
      const root = L.DomUtil.create('div', 'mtm-layer-switch');
      root.setAttribute('role', 'group');
      root.setAttribute('aria-label', 'Fond de carte');
      const buttons: Record<BaseLayerKey, HTMLButtonElement> = {
        plan: L.DomUtil.create('button', '', root),
        satellite: L.DomUtil.create('button', '', root),
      };
      buttons.plan.type = 'button';
      buttons.plan.textContent = 'Plan';
      buttons.satellite.type = 'button';
      buttons.satellite.textContent = 'Satellite';

      const render = (): void => {
        (Object.keys(buttons) as BaseLayerKey[]).forEach((key) => {
          buttons[key].classList.toggle('is-active', key === current);
          buttons[key].setAttribute('aria-pressed', String(key === current));
        });
      };
      const select = (key: BaseLayerKey): void => {
        if (key === current) return;
        map.removeLayer(layers[current]);
        current = key;
        layers[current].addTo(map);
        rememberBaseLayer(key);
        render();
      };
      buttons.plan.addEventListener('click', () => select('plan'));
      buttons.satellite.addEventListener('click', () => select('satellite'));
      // Les clics et molettes sur le contrôle ne doivent pas déplacer la carte.
      L.DomEvent.disableClickPropagation(root);
      L.DomEvent.disableScrollPropagation(root);
      render();
      return root;
    },
  });
  new Switcher({ position: 'topright' }).addTo(map);
}
