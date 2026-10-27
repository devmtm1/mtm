import { ArrowRight } from 'lucide-react';
import { iconeDemarche } from '../../utils/demarches';

interface CarteDemarcheProps {
  titre: string;
  description?: string;
  /** Ouvre la demande avec cette démarche déjà choisie : le visiteur n'a plus à la retrouver dans une liste. */
  onDemande: (titre: string) => void;
}

/** Une démarche proposée par MTM : icône, titre, description, et le chemin le plus court vers la demande. */
export function CarteDemarche({ titre, description, onDemande }: CarteDemarcheProps) {
  const Icone = iconeDemarche(titre);
  return (
    <li className="group flex flex-col rounded-2xl border border-mtm-border/70 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary transition-colors group-hover:bg-mtm-primary group-hover:text-white">
        <Icone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-display text-base font-bold leading-snug text-mtm-text">{titre}</h3>
      {description && <p className="mt-1.5 flex-1 text-sm leading-relaxed text-mtm-muted">{description}</p>}
      <button
        type="button"
        onClick={() => onDemande(titre)}
        aria-label={`Faire une demande : ${titre}`}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded text-sm font-semibold text-mtm-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mtm-accent"
      >
        Faire une demande
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </button>
    </li>
  );
}
