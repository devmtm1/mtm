import { Building2, ConciergeBell, FileSearch, Handshake, HardHat, House, SprayCan, Wrench, type LucideIcon } from 'lucide-react';

/** Pictogramme de chaque pôle, d'après son identifiant ; un pôle ajouté plus tard reçoit un bâtiment. */
const ICONES: Record<string, LucideIcon> = {
  transaction: Handshake,
  gestion: House,
  controle: FileSearch,
  clean: SprayCan,
  conciergerie: ConciergeBell,
  maintenance: Wrench,
  btp: HardHat,
};

export function iconePole(slug: string): LucideIcon {
  return ICONES[slug] ?? Building2;
}
