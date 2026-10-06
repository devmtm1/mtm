import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** « Voir tout » d'une section : un lien discret sur mobile, un bouton à partir de lg. */
export function SeeAllLink({ to, label = 'Voir tout' }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70 lg:rounded-md lg:border lg:border-mtm-primary lg:bg-white lg:px-5 lg:py-2.5 lg:text-sm lg:transition-colors lg:hover:bg-mtm-primary-subtle"
    >
      {label}
      <ChevronRight className="h-4 w-4 lg:hidden" aria-hidden="true" />
    </Link>
  );
}
