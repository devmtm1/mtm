import { ArrowRight, Quote } from 'lucide-react';
import { Portrait } from '../about/TeamSection';
import { LinkButton } from '../ui/LinkButton';
import { useTeam } from '../../hooks/useTeam';
import { ROUTES } from '../../routes';

/**
 * « À propos » sur l'accueil : le mot du directeur, sa photo, son texte (raccourci) et un bouton
 * vers la page complète. Tout vient de ce qui est publié au back-office (Site web › Équipe du
 * site) ; sans mot du directeur publié, la section n'apparaît pas.
 */
export function AboutPreviewSection() {
  const { data: team } = useTeam();
  const directeur = team?.directeur;
  if (!directeur) return null;

  const paragraphes = (directeur.message ?? '')
    .split(/\n+/)
    .map((paragraphe) => paragraphe.trim())
    .filter(Boolean);

  return (
    <section className="px-4 py-6 sm:px-6 lg:py-12" aria-labelledby="accueil-apropos-titre">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-mtm-primary-subtle p-5 sm:p-8 lg:grid lg:grid-cols-[minmax(0,240px)_1fr] lg:items-center lg:gap-10 lg:p-8">
        <figure className="flex items-center gap-4 lg:block">
          <div className="relative shrink-0">
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 -right-1.5 hidden h-full w-full rounded-3xl border-2 border-mtm-accent/40 lg:block lg:-bottom-3 lg:-right-3"
            />
            <Portrait
              src={directeur.imageUrl}
              nom={directeur.nom}
              sizes="(min-width: 1024px) 240px, 88px"
              className="relative aspect-square w-[5.5rem] rounded-full shadow-card ring-4 ring-white sm:w-28 lg:aspect-[4/5] lg:w-full lg:rounded-3xl lg:object-[center_15%] lg:shadow-card-hover lg:ring-0"
            />
          </div>
          <figcaption className="min-w-0 lg:hidden">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-mtm-accent">À propos</span>
            <span className="mt-0.5 block font-display text-lg font-bold leading-tight text-mtm-primary">{directeur.nom}</span>
            {directeur.poste && <span className="block text-sm text-mtm-muted">{directeur.poste}</span>}
          </figcaption>
        </figure>

        <div className="mt-5 lg:mt-0">
          <span className="hidden text-xs font-bold uppercase tracking-wider text-mtm-accent lg:block">À propos</span>
          <h2
            id="accueil-apropos-titre"
            className="font-display text-xl font-bold text-mtm-text lg:mt-2 lg:text-3xl"
          >
            Le mot du directeur
          </h2>
          <Quote className="mt-3 h-7 w-7 text-mtm-primary/25 lg:h-9 lg:w-9" fill="currentColor" aria-hidden="true" />
          {paragraphes.length > 0 && (
            <blockquote className="mt-1 space-y-3 text-[15px] leading-relaxed text-mtm-text lg:text-lg">
              {/* Quelques lignes seulement : le texte entier est sur la page À propos. */}
              <p className="line-clamp-6 lg:line-clamp-5">{paragraphes[0]}</p>
            </blockquote>
          )}
          <p className="mt-4 hidden items-center gap-3 lg:flex">
            <span aria-hidden="true" className="h-10 w-1 rounded-full bg-mtm-accent" />
            <span>
              <span className="block font-display text-lg font-bold text-mtm-primary">{directeur.nom}</span>
              {directeur.poste && <span className="block text-sm text-mtm-muted">{directeur.poste}</span>}
            </span>
          </p>
          <LinkButton to={ROUTES.about} className="mt-5 w-full sm:w-auto">
            Découvrir MTM Immobilier
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
