import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Un texte en plusieurs paragraphes dont seuls les premiers sont visibles, avec « Lire la suite » : le visiteur pressé a
 * l'essentiel, celui qui veut tout lire le déplie sans changer de page. Sans paragraphe en trop, aucun bouton.
 */
export function TexteReplie({
  paragraphes,
  visibles = 1,
  className = '',
  classeParagraphe = '',
}: {
  paragraphes: string[];
  /** Nombre de paragraphes montrés avant dépliage. */
  visibles?: number;
  className?: string;
  classeParagraphe?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const idSuite = useId();
  const debut = paragraphes.slice(0, visibles);
  const suite = paragraphes.slice(visibles);

  return (
    <div className={className}>
      <div className="space-y-4">
        {debut.map((paragraphe, index) => (
          <p key={index} className={classeParagraphe}>
            {paragraphe}
          </p>
        ))}
      </div>
      {suite.length > 0 && (
        <>
          <div id={idSuite} hidden={!ouvert} className="mt-4 space-y-4">
            {suite.map((paragraphe, index) => (
              <p key={index} className={classeParagraphe}>
                {paragraphe}
              </p>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={ouvert}
            aria-controls={idSuite}
            onClick={() => setOuvert((valeur) => !valeur)}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-mtm-accent hover:underline"
          >
            {ouvert ? 'Réduire' : 'Lire la suite'}
            <ChevronDown className={`h-4 w-4 transition-transform ${ouvert ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
