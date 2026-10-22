import { useState } from 'react';
import { SectionHeading } from '../ui/SectionHeading';
import { SeeAllLink } from '../ui/SeeAllLink';
import { VideoCarte } from '../actualites/VideoParts';
import { LecteurVideo } from '../actualites/LecteurVideo';
import { usePublications } from '../../hooks/usePublications';
import type { Publication } from '../../types/publication';
import { ROUTES } from '../../routes';

/** Nombre de vidéos montrées sur l'accueil : le reste est sur la page « Actualités et conseils ». */
const LIMITE = 4;

/**
 * Vidéos de « Actualités et conseils » sur l'accueil : la vidéo à la une d'abord (la liste arrive
 * triée). Un carrousel au doigt sur téléphone, une grille sur grand écran. La section disparaît
 * tant qu'aucune vidéo n'est publiée : pas de bloc vide sur la page d'accueil.
 */
export function VideosSection() {
  const { publications } = usePublications();
  const [enLecture, setEnLecture] = useState<Publication | null>(null);
  const videos = publications.slice(0, LIMITE);

  if (videos.length === 0) return null;

  return (
    <section className="py-6 lg:py-16" aria-label="Actualités et conseils en vidéo">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading app eyebrow="Vidéos" title="Actualités et conseils" />
          <SeeAllLink to={ROUTES.actualites} />
        </div>
      </div>

      <ul
        className="mt-3 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="Vidéos"
      >
        {videos.map((publication) => (
          <li key={publication.id} className="w-[78%] max-w-[19rem] shrink-0 snap-start">
            <VideoCarte vertical publication={publication} onPlay={() => setEnLecture(publication)} />
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-8 hidden max-w-6xl gap-6 px-6 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {videos.slice(0, 3).map((publication) => (
          <VideoCarte key={publication.id} vertical publication={publication} onPlay={() => setEnLecture(publication)} />
        ))}
      </div>

      {enLecture && <LecteurVideo publication={enLecture} autres={publications.filter((publication) => publication.id !== enLecture.id)} onChoisir={setEnLecture} onClose={() => setEnLecture(null)} />}
    </section>
  );
}
