import { ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEditableContent } from '../../hooks/useEditableContent';
import { usePoles } from '../../hooks/usePoles';
import { ROUTES } from '../../routes';
import { extraireIdYoutube } from '../../utils/youtube';
import { iconePole } from '../services/pole-icones';
import { SectionHeading } from '../ui/SectionHeading';
import { Skeleton } from '../ui/Skeleton';
import { VideoPresentation } from './VideoPresentation';

/** Plafond de pôles montrés sur l'accueil : ceux que le back-office marque « sur l'accueil » (à défaut, les premiers de la liste). */
const POLES_A_LA_UNE = 4;

/**
 * « Nos services » sur l'accueil. Quand une vidéo de présentation est renseignée (Contenus du site › Nos services), c'est elle
 * qui occupe la place, avec la liste des services en liens à côté. Sans vidéo, la section garde ses cartes, une par pôle.
 * Dans les deux cas, un bouton mène à la page « Nos services », où chaque pôle est présenté en détail. La liste vient du
 * back-office (Site web → Pôles et services).
 */
export function ServicesSection() {
  const { data: poles, loading, error } = usePoles();
  const { text } = useEditableContent();
  const videoId = extraireIdYoutube(text('services.video', ''));
  const liste = poles ?? [];
  const choisis = liste.filter((pole) => pole.surAccueil);
  const misEnAvant = (choisis.length > 0 ? choisis : liste).slice(0, POLES_A_LA_UNE);

  // Pas de section vide : sans pôle publié (ou si le chargement échoue), l'accueil n'affiche rien plutôt qu'un cadre vide.
  if (!loading && (error || liste.length === 0)) return null;

  const bouton = (
    <Link
      to={ROUTES.services}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-mtm-primary px-6 text-sm font-semibold text-white shadow-card transition-colors hover:bg-mtm-primary-dark active:scale-[0.98]"
    >
      Voir tous nos services
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-16">
      <SectionHeading
        app
        eyebrow="Nos services"
        title="Un accompagnement complet"
        description="De l'acquisition à la gestion, MTM Immobilier couvre l'ensemble de votre projet."
        align="center"
      />

      {videoId ? (
        <div className="mt-4 grid items-center gap-6 lg:mt-10 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
          <VideoPresentation videoId={videoId} titre="Découvrez MTM Immobilier en vidéo" />
          <div>
            <ul className="flex flex-col gap-2.5" aria-label="Nos services">
              {loading
                ? [0, 1, 2, 3].map((index) => (
                    <li key={index}>
                      <Skeleton className="h-16 rounded-2xl" />
                    </li>
                  ))
                : misEnAvant.map((pole) => {
                    const Icone = iconePole(pole.slug);
                    return (
                      <li key={pole.id}>
                        <Link
                          to={`${ROUTES.services}#${pole.slug}`}
                          className="group flex items-center gap-3.5 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-3 shadow-card transition-all duration-150 hover:border-mtm-primary-light hover:shadow-card-hover active:scale-[0.98]"
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary transition-colors group-hover:bg-mtm-primary group-hover:text-white">
                            <Icone className="h-6 w-6" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-[15px] font-bold leading-snug text-mtm-text">{pole.nom}</span>
                            {pole.accroche && <span className="block truncate text-xs text-mtm-muted">{pole.accroche}</span>}
                          </span>
                          <ChevronRight className="h-5 w-5 shrink-0 text-mtm-primary" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
            </ul>
            <div className="mt-5 flex justify-center lg:justify-start">{bouton}</div>
          </div>
        </div>
      ) : (
        <>
          {/* Quatre cartes : une rangée sur ordinateur, deux fois deux sur mobile. */}
          <ul className="mt-3 flex flex-wrap justify-center gap-3 sm:gap-4 lg:mt-10 lg:gap-6">
            {loading
              ? [0, 1, 2, 3].map((index) => (
                  <li key={index} className="w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-1.125rem)]">
                    <Skeleton className="h-36 rounded-2xl" />
                  </li>
                ))
              : misEnAvant.map((pole) => {
                  const Icone = iconePole(pole.slug);
                  return (
                    <li key={pole.id} className="w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-1.125rem)]">
                      <Link
                        to={`${ROUTES.services}#${pole.slug}`}
                        className="group flex h-full flex-col gap-2 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-4 shadow-card transition-all duration-150 active:scale-[0.97] sm:gap-3 sm:p-5 lg:rounded-lg lg:border-mtm-border lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:border-mtm-primary-light lg:hover:shadow-card-hover"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary transition-colors group-hover:bg-mtm-primary group-hover:text-white sm:h-11 sm:w-11 lg:rounded-md">
                          <Icone className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <h3 className="font-display text-sm font-bold text-mtm-text sm:text-base">{pole.nom}</h3>
                        {pole.description && <p className="line-clamp-3 text-xs text-mtm-muted sm:text-sm lg:line-clamp-4">{pole.description}</p>}
                      </Link>
                    </li>
                  );
                })}
          </ul>
          <div className="mt-6 flex justify-center lg:mt-10">{bouton}</div>
        </>
      )}
    </section>
  );
}
