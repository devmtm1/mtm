import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Promotion } from '../../types/promotion';

/** Une affiche reste à l'écran ce temps-là ; une vidéo se joue jusqu'au bout. */
const DUREE_AFFICHE_MS = 7000;

function usePrefersReducedMotion(): boolean {
  const [reduit, setReduit] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    setReduit(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  return reduit;
}

/** Mode économie de données : on ne lance pas de vidéo, l'image d'aperçu suffit. */
function useSaveData(): boolean {
  const [economie, setEconomie] = useState(false);
  useEffect(() => {
    const connexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setEconomie(Boolean(connexion?.saveData));
  }, []);
  return economie;
}

/** Enveloppe cliquable d'une diapositive : lien interne du site ou adresse externe en https. */
function Lien({ promotion, children }: { promotion: Promotion; children: ReactNode }) {
  const libelle = promotion.libelleLien || promotion.titre;
  const classe = 'absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white';
  if (!promotion.lienUrl) return <div className="absolute inset-0">{children}</div>;
  if (promotion.lienUrl.startsWith('/')) {
    return (
      <Link to={promotion.lienUrl} className={classe} aria-label={libelle}>
        {children}
      </Link>
    );
  }
  return (
    <a href={promotion.lienUrl} target="_blank" rel="noopener noreferrer" className={classe} aria-label={`${libelle} (nouvel onglet)`}>
      {children}
    </a>
  );
}

interface MediaProps {
  promotion: Promotion;
  /** Vidéo autorisée à se lancer (ni mouvement réduit, ni économie de données). */
  lectureVideo: boolean;
  seule: boolean;
  onTermine: () => void;
}

/**
 * Le média d'une diapositive. Une affiche est montrée en entier (`contain`)
 * devant une copie floutée d'elle-même, pour qu'un visuel au format portrait ou
 * carré ne soit jamais rogné dans un bandeau large. Une vidéo remplit le cadre.
 */
function Media({ promotion, lectureVideo, seule, onTermine }: MediaProps) {
  if (promotion.type === 'video' && lectureVideo && promotion.mediaUrl) {
    return (
      <video
        key={promotion.id}
        className="absolute inset-0 h-full w-full object-cover motion-safe:animate-fade-in"
        src={promotion.mediaUrl}
        poster={promotion.posterUrl ?? undefined}
        autoPlay
        muted
        playsInline
        loop={seule}
        onEnded={onTermine}
        // Une vidéo illisible ne doit pas bloquer le défilement des suivantes.
        onError={onTermine}
        aria-label={promotion.titre}
      />
    );
  }
  const source = promotion.type === 'video' ? promotion.posterUrl : promotion.mediaUrl;
  if (!source) return null;
  return (
    <>
      <img src={source} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
      <img
        key={promotion.id}
        src={source}
        alt={promotion.titre}
        className="absolute inset-0 h-full w-full object-contain motion-safe:animate-fade-in"
        fetchPriority="high"
      />
    </>
  );
}

interface PromoBannerProps {
  promotions: Promotion[];
  /** « hero » : bandeau large de l'accueil ordinateur ; « card » : carte basse de l'accueil mobile. */
  variant?: 'hero' | 'card';
}

/**
 * Publicités et promotions de MTM, montrées à la place de la vidéo du bandeau
 * d'accueil. Plusieurs défilent (affiche : quelques secondes ; vidéo : jusqu'à
 * la fin) ; le visiteur peut mettre en pause, avancer ou reculer. Mouvement
 * réduit ou économie de données : pas de lecture automatique, l'image fixe seule.
 */
export function PromoBanner({ promotions, variant = 'hero' }: PromoBannerProps) {
  const [index, setIndex] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const [survol, setSurvol] = useState(false);
  const mouvementReduit = usePrefersReducedMotion();
  const economieDonnees = useSaveData();

  const total = promotions.length;
  const courante = promotions[Math.min(index, total - 1)];
  const lectureVideo = !mouvementReduit && !economieDonnees;
  const defile = total > 1 && !mouvementReduit && !enPause && !survol;

  const suivante = useCallback(() => setIndex((actuel) => (actuel + 1) % total), [total]);
  const precedente = () => setIndex((actuel) => (actuel - 1 + total) % total);

  // Une affiche passe au bout de quelques secondes ; une vidéo, à sa fin
  // (`onEnded`) — sauf quand elle est écartée et remplacée par son aperçu.
  const estLueEnVideo = courante?.type === 'video' && lectureVideo;
  useEffect(() => {
    if (!defile || estLueEnVideo) return;
    const minuteur = window.setTimeout(suivante, DUREE_AFFICHE_MS);
    return () => window.clearTimeout(minuteur);
  }, [defile, estLueEnVideo, index, suivante]);

  // La liste peut raccourcir (promotion terminée entre deux rafraîchissements).
  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [index, total]);

  if (!courante) return null;

  const hauteur = variant === 'hero' ? 'h-[22rem] sm:h-[28rem]' : 'h-full';
  const aLeLegende = Boolean(courante.description || courante.lienUrl);

  return (
    <div
      className={`relative w-full overflow-hidden bg-mtm-primary-dark ${hauteur}`}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Publicités et promotions"
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
    >
      <Lien promotion={courante}>
        <Media promotion={courante} lectureVideo={lectureVideo} seule={total === 1} onTermine={suivante} />
        {aLeLegende && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent" aria-hidden="true" />
            <div
              className={`absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-3 ${
                variant === 'hero' ? 'mx-auto max-w-6xl px-6 pb-24' : 'px-4 pb-16'
              }`}
            >
              {courante.description && (
                <p
                  className={`font-display font-bold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] ${
                    variant === 'hero' ? 'max-w-2xl text-2xl sm:text-3xl' : 'line-clamp-2 text-base'
                  }`}
                >
                  {courante.description}
                </p>
              )}
              {courante.lienUrl && (
                <span className="inline-flex items-center rounded-lg bg-mtm-accent px-4 py-2 text-sm font-semibold text-white shadow-card">
                  {courante.libelleLien || 'En savoir plus'}
                </span>
              )}
            </div>
          </>
        )}
      </Lien>

      {total > 1 && (
        <>
          <div className={`absolute inset-x-0 z-10 flex items-center justify-center gap-2 ${variant === 'hero' ? 'bottom-14' : 'top-3'}`}>
            <button
              type="button"
              onClick={() => setEnPause((valeur) => !valeur)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label={enPause ? 'Reprendre le défilement des publicités' : 'Mettre en pause le défilement des publicités'}
            >
              {enPause ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
            <ul className="flex items-center gap-1.5">
              {promotions.map((promotion, position) => (
                <li key={promotion.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(position)}
                    aria-label={`Publicité ${position + 1} sur ${total}`}
                    aria-current={position === index ? 'true' : undefined}
                    className={`h-2 rounded-full transition-all ${position === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                  />
                </li>
              ))}
            </ul>
          </div>
          {variant === 'hero' && (
            <>
              <button
                type="button"
                onClick={precedente}
                className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:flex"
                aria-label="Publicité précédente"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={suivante}
                className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:flex"
                aria-label="Publicité suivante"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}
          {/* Annonce discrète du changement de diapositive aux lecteurs d'écran. */}
          <p className="sr-only" aria-live="polite">
            {courante.titre} — publicité {Math.min(index, total - 1) + 1} sur {total}
          </p>
        </>
      )}
    </div>
  );
}
