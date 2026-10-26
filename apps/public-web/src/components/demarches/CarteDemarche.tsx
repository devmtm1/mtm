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
    <li className="group flex flex-col rounded-2xl border border-[#E1E9F2] bg-white p-6 shadow-[0_1px_2px_rgba(18,54,90,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#C9D8E8] hover:shadow-[0_10px_28px_-12px_rgba(18,54,90,0.25)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF1F9] text-[#12365A] transition-colors group-hover:bg-[#12365A] group-hover:text-white">
        <Icone className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-[17px] font-semibold leading-snug text-[#12365A]">{titre}</h3>
      {description && <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-[#34465A]">{description}</p>}
      <button
        type="button"
        onClick={() => onDemande(titre)}
        aria-label={`Faire une demande : ${titre}`}
        className="mt-5 inline-flex items-center gap-1.5 self-start rounded text-[14px] font-semibold text-[#C8102E] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8102E]"
      >
        Faire une demande
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </button>
    </li>
  );
}
