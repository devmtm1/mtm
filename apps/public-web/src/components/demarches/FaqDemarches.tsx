import { ChevronDown } from 'lucide-react';

interface QuestionReponse {
  title: string;
  description?: string;
}

/**
 * Questions fréquentes : une liste dépliante (éléments `details`, accessibles au clavier et sans JavaScript).
 * Les questions viennent du back-office ; la première est ouverte pour montrer qu'on peut déplier.
 */
export function FaqDemarches({ questions }: { questions: QuestionReponse[] }) {
  return (
    <ul className="divide-y divide-[#E1E9F2] overflow-hidden rounded-2xl border border-[#E1E9F2] bg-white">
      {questions.map((question, index) => (
        <li key={question.title}>
          <details className="group" open={index === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[16px] font-semibold text-[#12365A] transition-colors hover:bg-[#F5F8FB] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C8102E] sm:px-6 [&::-webkit-details-marker]:hidden">
              {question.title}
              <ChevronDown
                className="h-5 w-5 shrink-0 text-[#C8102E] transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            {question.description && (
              <p className="px-5 pb-5 pr-12 text-[15px] leading-relaxed text-[#34465A] sm:px-6 sm:pr-14">{question.description}</p>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}
