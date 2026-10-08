import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { niveauStatutJuridique } from '../../utils/statutJuridique';

const STYLES = {
  solide: 'bg-mtm-success/10 text-mtm-success ring-1 ring-mtm-success/30',
  standard: 'bg-mtm-primary-subtle text-mtm-primary ring-1 ring-mtm-primary/25',
  attention: 'bg-mtm-warning/10 text-mtm-warning ring-1 ring-mtm-warning/30',
} as const;

/**
 * Statut juridique d'un bien, en pastille bien visible : c'est le premier
 * critère de confiance d'un acheteur foncier. « Titre foncier » ressort en vert,
 * un statut à régulariser en orange.
 */
export function StatutJuridiqueChip({ statut, className = '' }: { statut: string; className?: string }) {
  if (!statut) return null;
  const niveau = niveauStatutJuridique(statut);
  const Icone = niveau === 'attention' ? TriangleAlert : ShieldCheck;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold leading-none ${STYLES[niveau]} ${className}`}
    >
      <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{statut}</span>
    </span>
  );
}
