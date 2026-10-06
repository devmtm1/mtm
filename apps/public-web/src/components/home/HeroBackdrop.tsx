import { useEffect, useRef, useState } from 'react';

/**
 * Connexions sur lesquelles 18 Mo ne passeront pas, quoi qu'on fasse.
 *
 * `3g` en est volontairement absent : `effectiveType` est une mesure de
 * latence et de débit, pas le type de radio. Un téléphone en vraie 4G se
 * déclare couramment « 3g » dès que le réseau est un peu chargé — l'y inclure
 * écartait la vidéo chez la plupart des visiteurs, sans que rien ne le dise.
 */
const RESEAUX_LENTS = ['slow-2g', '2g'];

/**
 * La vidéo de fond joue désormais sur mobile aussi : s'en priver donnait un
 * accueil immobile précisément là où la clientèle regarde le site.
 *
 * Elle reste soumise à trois réserves, parce que le fichier pèse ~18 Mo :
 *
 * - « mouvement réduit » : on respecte la préférence système ;
 * - mode économie de données explicitement activé, ou réseau mesuré en 2G :
 *   l'image fixe suffit, 18 Mo de forfait pour un décor serait une facture
 *   imposée au visiteur ;
 * - montage différé : la vidéo n'est ajoutée qu'une fois la page au repos,
 *   pour qu'elle ne dispute pas la bande passante au premier affichage ni au
 *   catalogue.
 *
 * L'image fixe est affichée dans tous les cas, donc personne ne voit un fond
 * vide pendant que la vidéo arrive.
 */
function useShouldPlayBackgroundVideo(): boolean {
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // `connection` n'existe pas partout (Safari notamment) : son absence ne
    // doit pas priver de vidéo, seule une information explicite le fait.
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && RESEAUX_LENTS.includes(connection.effectiveType)) return;

    const demarrer = () => setShouldPlay(true);
    const planifier = (
      window as Window & { requestIdleCallback?: (cb: () => void) => number }
    ).requestIdleCallback;
    if (planifier) {
      const id = planifier(demarrer);
      return () => {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }
    const minuteur = window.setTimeout(demarrer, 1200);
    return () => window.clearTimeout(minuteur);
  }, []);

  return shouldPlay;
}

/**
 * Fond du hero : l'image fixe tout de suite, puis la vidéo de MTM par-dessus
 * quand les réserves ci-dessus le permettent. Partagé par le hero ordinateur et
 * la carte d'accueil mobile : les deux montrent la même vidéo.
 */
export function HeroBackdrop() {
  const playVideo = useShouldPlayBackgroundVideo();
  const videoRef = useRef<HTMLVideoElement>(null);

  // `autoPlay` seul ne suffit pas : plusieurs navigateurs mobiles ignorent
  // l'attribut et n'en disent rien. On demande la lecture explicitement, et
  // un refus (économie d'énergie sur iOS, par exemple) laisse l'image fixe.
  useEffect(() => {
    if (!playVideo) return;
    void videoRef.current?.play().catch(() => undefined);
  }, [playVideo]);

  return (
    <>
        {/* Image fixe extraite de la vidéo : fond immédiat sur tous les écrans,
            pendant que la vidéo se charge et quand elle est écartée (économie
            de données, réseau lent, mouvement réduit). */}
        <img
          src="/hero-poster.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        {playVideo && (
          <video
            className="absolute inset-0 h-full w-full object-cover motion-safe:animate-fade-in"
            ref={videoRef}
            src="/video.mp4"
            poster="/hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        )}
    </>
  );
}
