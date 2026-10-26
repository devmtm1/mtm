import {
  ArrowLeftRight,
  FileDown,
  FileSignature,
  FileText,
  HardHat,
  MapPinned,
  PencilRuler,
  Ruler,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

/** Photo du bandeau quand aucune image n'a été choisie dans le back-office. */
export const IMAGE_BANDEAU_DEMARCHES = '/bandeaux/demarches-banniere.jpg';

/**
 * Coupe un engagement en deux lignes, comme sur la maquette : « Réponse sous / 24 à 48h »,
 * « Devis gratuit, / sans engagement ». La seconde ligne passe en rouge quand elle porte
 * l'information forte (un délai, une gratuité) ; sinon, c'est un complément en petit gris
 * (« Tarif adapté / à la nature et à l'urgence… »). Le texte saisi n'est jamais modifié.
 */
export function decouperEngagement(texte: string): { haut: string; bas: string | null; rouge: boolean } {
  const propre = texte.trim();
  const virgule = propre.indexOf(',');
  if (virgule > 0 && virgule < propre.length - 1) {
    return { haut: propre.slice(0, virgule + 1), bas: propre.slice(virgule + 1).trim(), rouge: true };
  }
  const chiffre = propre.search(/\d/);
  if (chiffre > 0) {
    return { haut: propre.slice(0, chiffre).trim(), bas: propre.slice(chiffre).trim(), rouge: true };
  }
  const mots = propre.split(/\s+/);
  if (mots.length > 3) {
    return { haut: mots.slice(0, 2).join(' '), bas: mots.slice(2).join(' '), rouge: false };
  }
  return { haut: propre, bas: null, rouge: false };
}

/**
 * Icône d'une prestation, choisie d'après son titre : la liste des prestations s'édite au back-office, une
 * nouvelle ligne reçoit une icône sensée (un document par défaut) sans qu'il faille toucher au code.
 */
export function iconeDemarche(titre: string): LucideIcon {
  const t = titre.toLowerCase();
  if (t.includes('vérif') || t.includes('verif')) return ShieldCheck;
  if (t.includes('mutation')) return ArrowLeftRight;
  if (t.includes('bail')) return FileSignature;
  if (t.includes('construire') || t.includes('chantier')) return HardHat;
  if (t.includes('retrait')) return FileDown;
  if (t.includes('architect')) return PencilRuler;
  if (t.includes('géomètre') || t.includes('geometre') || t.includes('bornage')) return Ruler;
  if (t.includes('foncier') || t.includes('terrain')) return MapPinned;
  return FileText;
}
