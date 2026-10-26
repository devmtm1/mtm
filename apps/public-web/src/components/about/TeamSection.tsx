import { useState } from 'react';
import { Quote, Users } from 'lucide-react';
import type { TeamGroup, TeamPage, TeamPerson } from '../../types/team';
import { cloudinarySrcSet } from '../../utils/cloudinary';
import { initiales } from '../../utils/initiales';

/**
 * Portrait cadré en 4/5. Sans photo — ou si son URL est morte — on affiche les
 * initiales sur le dégradé de la charte plutôt qu'une image cassée.
 */
export function Portrait({
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

/** Met « MTM IMMOBILIER » en rouge dans l'accroche, sans toucher au reste du texte saisi au back-office. */
function AccrocheColoree({ texte }: { texte: string }) {
  const morceaux = texte.split(/(MTM\s+IMMOBILIER)/i);
  return (
    <>
      {morceaux.map((morceau, index) =>
        /^MTM\s+IMMOBILIER$/i.test(morceau) ? (
          <span key={index} className="text-mtm-accent">
            {morceau}
          </span>
        ) : (
          morceau
        ),
      )}
    </>
  );
}

function MotDuDirecteur({ directeur }: { directeur: TeamPerson }) {
  const paragraphes = (directeur.message ?? '')
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  // Une première ligne courte (« Bienvenue chez MTM IMMOBILIER ») sert de titre, pas de paragraphe.
  const [premier, ...suite] = paragraphes;
  const accroche = premier && premier.length <= 80 ? premier : null;
  const corps = accroche ? suite : paragraphes;

  return (
    <section
      aria-labelledby="mot-directeur"
      className="relative isolate overflow-x-clip bg-gradient-to-br from-white via-mtm-primary-subtle/50 to-mtm-primary-subtle"
    >
      {/* Décor : immeubles en filigrane, en bas à droite. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 320 300"
        className="pointer-events-none absolute -bottom-2 right-0 -z-10 hidden h-72 w-72 text-mtm-primary opacity-[0.07] lg:block"
        fill="currentColor"
      >
        <rect x="40" y="120" width="70" height="180" rx="4" />
        <rect x="120" y="40" width="80" height="260" rx="4" />
        <rect x="210" y="90" width="90" height="210" rx="4" />
      </svg>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,430px)_1fr] md:items-start lg:gap-20 lg:py-20">
        {/* Un long texte à côté d'une photo : la photo reste en haut de l'écran pendant la lecture. */}
        <figure className="mx-auto w-full max-w-[300px] sm:max-w-[400px] md:sticky md:top-28 md:mx-0 md:max-w-none">
          <div className="relative ml-6 mt-6">
            {/* Pan de couleur derrière la photo, qui dépasse en haut à gauche. */}
            <span
              aria-hidden="true"
              className="absolute -left-6 -top-6 h-[46%] w-[62%] rounded-tl-[2.5rem] bg-gradient-to-br from-mtm-primary-medium to-[#5EA8C7]"
            />
            {/* Grille de points, en bas à gauche. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-8 -left-10 h-28 w-28 bg-[radial-gradient(circle,#9DB9D4_2px,transparent_2.5px)] [background-size:18px_18px]"
            />
            <div className="relative rounded-[2rem] border-[6px] border-white bg-white shadow-card-hover">
              <Portrait
                src={directeur.imageUrl}
                nom={directeur.nom}
                sizes="(min-width: 768px) 430px, 300px"
                className="aspect-[4/5] w-full rounded-[1.5rem] object-[center_15%]"
              />
            </div>
          </div>
        </figure>

        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5 rounded-full bg-mtm-accent-subtle px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-mtm-accent">
            <span aria-hidden="true" className="h-4 w-[3px] rounded-full bg-mtm-accent" />
            Le mot du directeur
          </span>
          <h2 id="mot-directeur" className="sr-only">
            Le mot du directeur
          </h2>
          <Quote
            className="mt-6 h-10 w-10 text-mtm-primary-medium"
            fill="currentColor"
            aria-hidden="true"
          />
          {accroche && (
            <p className="mt-1 font-display text-3xl font-bold leading-tight text-mtm-primary-dark sm:text-[2.1rem]">
              <AccrocheColoree texte={accroche} />
            </p>
          )}
          {corps.length > 0 && (
            <blockquote className="mt-6 space-y-4 text-base leading-7 text-slate-700">
              {corps.map((paragraphe, index) => (
                <p key={index}>{paragraphe}</p>
              ))}
            </blockquote>
          )}
          <div className="mt-8">
            <span aria-hidden="true" className="block h-[3px] w-12 rounded-full bg-mtm-accent" />
            <p className="mt-4 font-display text-xl font-bold text-mtm-primary-dark">
              <span>{directeur.nom}</span>
            </p>
            {directeur.poste && (
              <p className="mt-0.5 text-sm uppercase tracking-wide text-mtm-muted">
                {directeur.poste}
              </p>
            )}
          </div>
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

/** Une teinte par poste, en alternance : lisible d'un coup d'œil sans rien coder en dur par métier. */
const TEINTES = [
  'bg-sky-50 text-sky-800 ring-sky-200',
  'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'bg-violet-50 text-violet-800 ring-violet-200',
  'bg-orange-50 text-orange-800 ring-orange-200',
  'bg-pink-50 text-pink-800 ring-pink-200',
  'bg-slate-100 text-slate-700 ring-slate-200',
];

/**
 * Carte d'un collaborateur : photo ronde, nom en gras, poste dans une pastille
 * colorée. Ni téléphone ni e-mail : ce sont des numéros personnels, la
 * personne à joindre est l'agence.
 */
function CarteMembre({ membre, index }: { membre: TeamPerson; index: number }) {
  return (
    <li className="group flex flex-col items-center rounded-2xl border border-mtm-border/70 bg-mtm-surface px-3 pb-5 pt-5 text-center shadow-card transition-all duration-200 sm:px-4 sm:pt-6 lg:hover:-translate-y-1 lg:hover:shadow-card-hover">
      <Portrait
        src={membre.imageUrl}
        nom={membre.nom}
        sizes="(min-width: 1024px) 144px, 112px"
        className="aspect-square w-24 rounded-full shadow-card ring-4 ring-mtm-surface sm:w-28 lg:w-32"
      />
      <p className="mt-3.5 font-display text-sm font-bold leading-snug text-mtm-text sm:text-base">
        {membre.nom}
      </p>
      {membre.poste && (
        <span
          className={`mt-2 inline-block max-w-full rounded-full px-3 py-1 text-[11px] font-semibold leading-snug ring-1 sm:text-xs ${TEINTES[index % TEINTES.length]}`}
        >
          {membre.poste}
        </span>
      )}
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
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-mtm-primary">
              MTM <span className="text-mtm-primary-medium">Immobilier</span>
            </span>
            <h2
              id="notre-equipe"
              className="mt-2 font-display text-3xl font-extrabold text-mtm-text sm:text-4xl"
            >
              Notre <span className="text-mtm-primary-medium">équipe</span>
            </h2>
            <span aria-hidden="true" className="mx-auto mt-3 block h-1 w-12 rounded-full bg-mtm-primary-medium" />
            <p className="mx-auto mt-4 max-w-2xl text-sm text-mtm-muted sm:text-base">
              Une équipe de professionnels passionnés, engagés à vous accompagner dans tous vos
              projets immobiliers.
            </p>
          </div>

          {groupe && (
            <div className="mt-10">
              <PhotoDeGroupe groupe={groupe} />
            </div>
          )}

          {membres.length > 0 && (
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
              {membres.map((membre, index) => (
                <CarteMembre key={membre.id} membre={membre} index={index} />
              ))}
            </ul>
          )}

          <p className="mt-10 flex items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-mtm-muted sm:text-xs">
            <span aria-hidden="true" className="h-px w-8 bg-mtm-border sm:w-14" />
            MTM Immobilier · Ensemble pour vos projets
            <span aria-hidden="true" className="h-px w-8 bg-mtm-border sm:w-14" />
          </p>
        </section>
      )}
    </div>
  );
}
