import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePoles } from '../../hooks/usePoles';
import type { Pole } from '../../types/poles';
import { iconePole } from './pole-icones';

/** Un lien du site se navigue sans recharger la page ; une adresse https s'ouvre dans un nouvel onglet. */
function LienCarte({ pole, children, className }: { pole: Pole; children: React.ReactNode; className: string }) {
  const cible = pole.lienUrl ?? `/nos-services#${pole.slug}`;
  return cible.startsWith('/') ? (
    <Link to={cible} className={className}>
      {children}
    </Link>
  ) : (
    <a href={cible} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/**
 * « Vous aimerez aussi » : les services de MTM qui complètent celui de la page (ceux que le back-office a liés à ce pôle),
 * en une rangée de liens compacts. Un propriétaire qui confie son bien pense à son entretien, un client qui construit pense
 * à ses démarches : la page le lui propose au bon moment sans l'allonger. Rien ne s'affiche sans pôle lié.
 */
export function ServicesComplementaires({ pole }: { pole: string }) {
  const { data: poles } = usePoles();
  const courant = poles?.find((p) => p.slug === pole);
  const lies = (courant?.lies ?? []).map((slug) => poles?.find((p) => p.slug === slug)).filter((p): p is Pole => Boolean(p));
  if (lies.length === 0) return null;

  return (
    <section aria-label="Services complémentaires" className="bg-white pb-14 pt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-lg font-bold text-mtm-text">Vous aimerez aussi</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {lies.map((lie) => {
            const Icone = iconePole(lie.slug);
            return (
              <li key={lie.id} className="min-w-[15rem] flex-1 basis-[15rem]">
                <LienCarte
                  pole={lie}
                  className="group flex h-full items-center gap-3 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-3 shadow-card transition-all duration-150 hover:border-mtm-primary-light hover:shadow-card-hover active:scale-[0.98]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary transition-colors group-hover:bg-mtm-primary group-hover:text-white">
                    <Icone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-bold text-mtm-text">{lie.nom}</span>
                    {lie.accroche && <span className="block truncate text-xs text-mtm-muted">{lie.accroche}</span>}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-mtm-accent transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </LienCarte>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
