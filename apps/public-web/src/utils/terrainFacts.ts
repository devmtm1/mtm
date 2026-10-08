import type { Terrain } from '../types/terrain';
import { estBienBati, vocationLabel } from './bienLabels';
import { formatMoney, formatSuperficie } from './format';

export type FaitIcone = 'surface' | 'pieces' | 'eau' | 'parcelle' | 'statut' | 'vocation' | 'prix' | 'niveaux' | 'annee' | 'route';

export interface Fait {
  key: string;
  label: string;
  value: string;
  icone: FaitIcone;
}

export interface LigneCaracteristique {
  label: string;
  value: string;
  /** Équipement présent (vert) ou absent (grisé) ; sans effet pour une valeur ordinaire. */
  etat?: 'oui' | 'non';
}

export interface GroupeCaracteristiques {
  titre: string;
  lignes: LigneCaracteristique[];
}

/** La superficie en mètres carrés, ou `null` si l'unité n'est pas convertible. */
function enMetresCarres(terrain: Pick<Terrain, 'superficie' | 'uniteSuperficie'>): number | null {
  if (terrain.superficie === null || terrain.superficie <= 0) return null;
  const unite = (terrain.uniteSuperficie ?? 'm²').trim().toLowerCase().replace('²', '2');
  if (unite === 'm2' || unite === 'm') return terrain.superficie;
  if (unite === 'ha') return terrain.superficie * 10000;
  return null;
}

/**
 * Prix au mètre carré d'une parcelle nue : un repère de comparaison réel pour
 * l'acheteur. Pour un bien bâti, le prix rémunère aussi la construction : le
 * diviser par la parcelle n'aurait pas de sens, on n'affiche rien.
 */
export function prixAuM2(terrain: Terrain): number | null {
  if (estBienBati(terrain) || terrain.prixPublic === null) return null;
  const surface = enMetresCarres(terrain);
  return surface ? Math.round(terrain.prixPublic / surface) : null;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/**
 * « L'essentiel » en quatre repères maximum, ce qu'un acheteur regarde en
 * premier : pour un bien bâti, l'habitable, les pièces, les salles d'eau et la
 * parcelle ; pour une parcelle, sa surface, son statut juridique, son usage et
 * son prix au m². Un repère inconnu n'est pas affiché : aucun « — ».
 */
export function faitsEssentiels(terrain: Terrain): Fait[] {
  const faits: (Fait | null)[] = [];

  if (estBienBati(terrain)) {
    faits.push(
      terrain.surfaceHabitable !== null
        ? { key: 'habitable', label: 'Surface habitable', value: formatSuperficie(terrain.surfaceHabitable, terrain.uniteSuperficie), icone: 'surface' }
        : null,
      terrain.nombrePieces || terrain.nombreChambres !== null
        ? {
            key: 'pieces',
            label: terrain.nombrePieces ? 'Type' : 'Chambres',
            value: [terrain.nombrePieces, terrain.nombreChambres !== null ? pluriel(terrain.nombreChambres, 'chambre') : null]
              .filter(Boolean)
              .join(' · '),
            icone: 'pieces',
          }
        : null,
      terrain.nombreSallesEau !== null
        ? { key: 'eau', label: 'Salles d’eau', value: String(terrain.nombreSallesEau), icone: 'eau' }
        : null,
      terrain.superficie !== null
        ? { key: 'parcelle', label: 'Terrain', value: formatSuperficie(terrain.superficie, terrain.uniteSuperficie), icone: 'parcelle' }
        : null,
    );
  } else {
    const m2 = prixAuM2(terrain);
    faits.push(
      terrain.superficie !== null
        ? { key: 'superficie', label: 'Superficie', value: formatSuperficie(terrain.superficie, terrain.uniteSuperficie), icone: 'surface' }
        : null,
      terrain.vocation ? { key: 'vocation', label: 'Usage', value: vocationLabel(terrain.vocation), icone: 'vocation' } : null,
      m2 !== null ? { key: 'prixM2', label: 'Prix au m²', value: formatMoney(m2), icone: 'prix' } : null,
    );
  }

  return faits.filter((fait): fait is Fait => fait !== null && fait.value !== '').slice(0, 4);
}

const dispo = (valeur: boolean | null): LigneCaracteristique['etat'] | undefined =>
  valeur === null ? undefined : valeur ? 'oui' : 'non';

/**
 * Le détail des caractéristiques, regroupé, sans ligne vide : une information
 * absente n'est pas montrée plutôt qu'affichée « — ». Un groupe sans ligne
 * disparaît.
 */
export function caracteristiques(terrain: Terrain): GroupeCaracteristiques[] {
  const bati = estBienBati(terrain);
  const groupes: GroupeCaracteristiques[] = [];

  const ajouter = (titre: string, lignes: (LigneCaracteristique | null)[]) => {
    const utiles = lignes.filter((ligne): ligne is LigneCaracteristique => ligne !== null);
    if (utiles.length > 0) groupes.push({ titre, lignes: utiles });
  };

  if (bati) {
    ajouter('Le bien', [
      terrain.surfaceHabitable !== null ? { label: 'Surface habitable', value: formatSuperficie(terrain.surfaceHabitable, terrain.uniteSuperficie) } : null,
      terrain.nombrePieces ? { label: 'Type', value: terrain.nombrePieces } : null,
      terrain.nombreChambres !== null ? { label: 'Chambres', value: String(terrain.nombreChambres) } : null,
      terrain.nombreSallesEau !== null ? { label: 'Salles d’eau', value: String(terrain.nombreSallesEau) } : null,
      terrain.niveaux !== null ? { label: 'Niveaux', value: String(terrain.niveaux) } : null,
      terrain.anneeConstruction !== null ? { label: 'Année de construction', value: String(terrain.anneeConstruction) } : null,
    ]);
  }

  ajouter(bati ? 'Le terrain' : 'La parcelle', [
    terrain.superficie !== null ? { label: bati ? 'Superficie du terrain' : 'Superficie', value: formatSuperficie(terrain.superficie, terrain.uniteSuperficie) } : null,
    terrain.accesRoutier ? { label: 'Accès routier', value: terrain.accesRoutier } : null,
    terrain.voisinage ? { label: 'Voisinage', value: terrain.voisinage } : null,
    terrain.proximiteAxes ? { label: 'Proximité des axes', value: terrain.proximiteAxes } : null,
  ]);

  ajouter('Équipements', [
    terrain.eauDisponible !== null ? { label: 'Eau', value: terrain.eauDisponible ? 'Disponible' : 'Non disponible', etat: dispo(terrain.eauDisponible) } : null,
    terrain.electriciteDisponible !== null
      ? { label: 'Électricité', value: terrain.electriciteDisponible ? 'Disponible' : 'Non disponible', etat: dispo(terrain.electriciteDisponible) }
      : null,
  ]);

  return groupes;
}
