import { useId, useState } from 'react';

/**
 * Texte long replié sur mobile (cinq lignes) avec « Lire la suite » ; entier
 * dès lg. Évite qu'une longue description repousse tout le reste de la fiche
 * hors de l'écran.
 */
export function ExpandableText({ text, className = '' }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // En dessous de ce seuil, tout tient sur cinq lignes : pas de bouton inutile.
  const long = text.length > 280 || text.split('\n').length > 5;

  return (
    <div>
      <p id={id} className={`whitespace-pre-line ${open ? '' : 'line-clamp-5 lg:line-clamp-none'} ${className}`}>
        {text}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="mt-2 text-sm font-semibold text-mtm-primary active:opacity-70 lg:hidden"
        >
          {open ? 'Réduire' : 'Lire la suite'}
        </button>
      )}
    </div>
  );
}
