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
