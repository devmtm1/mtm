import { ChevronDown } from 'lucide-react';

interface QuestionReponse {
  title: string;
  description?: string;
}

/**
 * Questions fréquentes : une liste dépliante (éléments `details`, accessibles au clavier et sans JavaScript).
 * Les questions viennent du back-office ; elles sont toutes repliées au départ, pour que la liste tienne en peu de place.
 * Partagée par les pages Démarches, Gestion locative et Construction.
 */
export function FaqDemarches({ questions }: { questions: QuestionReponse[] }) {
  return (
    <ul className="divide-y divide-mtm-border overflow-hidden rounded-2xl border border-mtm-border/70 bg-white shadow-card">
      {questions.map((question) => (
        <li key={question.title}>
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-mtm-text transition-colors hover:bg-mtm-bg focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mtm-accent sm:px-6 [&::-webkit-details-marker]:hidden">
              {question.title}
              <ChevronDown
                className="h-5 w-5 shrink-0 text-mtm-accent transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            {question.description && (
              <p className="px-5 pb-5 pr-12 text-[15px] leading-relaxed text-mtm-muted sm:px-6 sm:pr-14">{question.description}</p>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}
