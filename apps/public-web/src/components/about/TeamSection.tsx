import { useState } from 'react';
import { Quote, Users } from 'lucide-react';
import type { TeamGroup, TeamPage, TeamPerson } from '../../types/team';
import { cloudinarySrcSet } from '../../utils/cloudinary';
import { initiales } from '../../utils/initiales';

/**
 * Portrait cadré en 4/5. Sans photo — ou si son URL est morte — on affiche les
 * initiales sur le dégradé de la charte plutôt qu'une image cassée.
 */
function Portrait({
  src,
  nom,
  sizes,
  className = '',
}: {
  src: string | null;
  nom: string;
  sizes: string;
  className?: string;
}) {
  const [echec, setEchec] = useState(false);
  const srcSet = src ? cloudinarySrcSet(src) : '';

  if (!src || echec) {
    return (
      <div
        role="img"
        aria-label={nom}
        className={`flex items-center justify-center bg-gradient-to-br from-mtm-primary to-mtm-primary-dark text-white ${className}`}
      >
        <span className="font-display text-4xl font-bold tracking-wide opacity-90 sm:text-5xl">
          {initiales(nom)}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={nom}
      loading="lazy"
      decoding="async"
      onError={() => setEchec(true)}
      className={`object-cover ${className}`}
    />
  );
}

function MotDuDirecteur({ directeur }: { directeur: TeamPerson }) {
  const paragraphes = (directeur.message ?? '')
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section aria-labelledby="mot-directeur" className="bg-mtm-primary-subtle">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,280px)_1fr] md:items-center lg:gap-14 lg:py-16">
        <figure className="mx-auto w-full max-w-[210px] sm:max-w-[280px] md:mx-0">
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute -bottom-3 -right-3 h-full w-full rounded-3xl border-2 border-mtm-accent/40"
            />
            <Portrait
              src={directeur.imageUrl}
              nom={directeur.nom}
              sizes="280px"
              className="relative aspect-[4/5] w-full rounded-3xl shadow-card-hover"
            />
          </div>
        </figure>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-mtm-accent">
            Le mot du directeur
          </span>
          <h2 id="mot-directeur" className="sr-only">
            Le mot du directeur
          </h2>
          <Quote
            className="mt-3 h-9 w-9 text-mtm-primary/25"
            fill="currentColor"
            aria-hidden="true"
          />
          {paragraphes.length > 0 && (
            <blockquote className="mt-2 space-y-4 text-base leading-relaxed text-mtm-text sm:text-lg">
              {paragraphes.map((paragraphe, index) => (
                <p key={index}>{paragraphe}</p>
              ))}
            </blockquote>
          )}
          <p className="mt-6 flex items-center gap-3">
            <span aria-hidden="true" className="h-10 w-1 rounded-full bg-mtm-accent" />
            <span>
              <span className="block font-display text-lg font-bold text-mtm-primary">
                {directeur.nom}
              </span>
              {directeur.poste && (
                <span className="block text-sm text-mtm-muted">{directeur.poste}</span>
              )}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

function PhotoDeGroupe({ groupe }: { groupe: TeamGroup }) {
  const [echec, setEchec] = useState(false);
  const srcSet = groupe.imageUrl ? cloudinarySrcSet(groupe.imageUrl) : '';
  const photo = groupe.imageUrl && !echec;

  return (
    <figure className="relative overflow-hidden rounded-3xl shadow-card">
      {photo ? (
        <img
          src={groupe.imageUrl ?? undefined}
          srcSet={srcSet || undefined}
          sizes={srcSet ? '(min-width: 1024px) 1024px, 100vw' : undefined}
          alt={groupe.legende}
          loading="lazy"
          decoding="async"
          onError={() => setEchec(true)}
          className="aspect-[16/10] w-full object-cover sm:aspect-[16/9] lg:aspect-[2/1]"
        />
      ) : (
        <div
          role="img"
          aria-label={groupe.legende}
          className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-mtm-primary via-mtm-primary-medium to-mtm-primary-dark sm:aspect-[16/9] lg:aspect-[2/1]"
        >
          <Users className="h-16 w-16 text-white/30" aria-hidden="true" />
        </div>
      )}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-5 pb-4 pt-12 sm:px-8 sm:pb-6">
        <span className="font-display text-base font-bold text-white sm:text-xl">
          {groupe.legende}
        </span>
      </figcaption>
    </figure>
  );
}

function CarteMembre({ membre }: { membre: TeamPerson }) {
  return (
    <li className="group">
      <Portrait
        src={membre.imageUrl}
        nom={membre.nom}
        sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
        className="aspect-square w-full rounded-2xl shadow-card transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-card-hover sm:aspect-[4/5]"
      />
      <p className="mt-3 font-display text-sm font-bold leading-snug text-mtm-text sm:text-base">
        {membre.nom}
      </p>
      {membre.poste && <p className="mt-0.5 text-xs text-mtm-muted sm:text-sm">{membre.poste}</p>}
    </li>
  );
}

/**
 * Section « Notre équipe » de la page À propos : mot du directeur, photo de
 * groupe, puis un portrait par collaborateur. Chaque bloc n'apparaît que s'il
 * est publié ; sans rien de publié, la section disparaît entièrement.
 */
export function TeamSection({ team }: { team: TeamPage | null }) {
  if (!team) return null;
  const { directeur, groupe, membres } = team;
  if (!directeur && !groupe && membres.length === 0) return null;

  return (
    <div>
      {directeur && <MotDuDirecteur directeur={directeur} />}

      {(groupe || membres.length > 0) && (
        <section aria-labelledby="notre-equipe" className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-mtm-primary">
              Les visages de MTM
            </span>
            <h2
              id="notre-equipe"
              className="mt-2 font-display text-2xl font-bold text-mtm-text sm:text-3xl"
            >
              Notre équipe
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-mtm-muted sm:text-base">
              Des professionnels à votre écoute, au Sénégal comme à distance, pour vous accompagner
              à chaque étape de votre projet.
            </p>
          </div>

          {groupe && (
            <div className="mt-10">
              <PhotoDeGroupe groupe={groupe} />
            </div>
          )}

          {membres.length > 0 && (
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {membres.map((membre) => (
                <CarteMembre key={membre.id} membre={membre} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
