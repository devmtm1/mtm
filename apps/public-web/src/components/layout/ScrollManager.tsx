import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Gestion de la position de scroll entre les pages.
 *
 * `BrowserRouter` ne fait rien par lui-même : sans ce composant, la position
 * de scroll de la page quittée était conservée, et l'utilisateur atterrissait
 * au milieu de la page suivante (voire à une position arbitraire, résidu du
 * recadrage effectué par le navigateur quand la nouvelle page est plus
 * courte). On applique donc la règle attendue :
 *
 * - nouvelle navigation (PUSH/REPLACE) → haut de page ;
 * - retour / avance du navigateur (POP)  → position mémorisée ;
 * - lien avec ancre (#...)               → élément ciblé.
 */

/** Positions mémorisées par entrée d'historique (`location.key`). */
const positions = new Map<string, number>();

/**
 * Délai pendant lequel on retente la restauration : au retour, le contenu est
 * rechargé de façon asynchrone et la page n'a pas encore sa hauteur finale,
 * donc un scroll immédiat serait tronqué par le navigateur.
 */
const RESTORE_TIMEOUT_MS = 1500;

/**
 * `html { scroll-behavior: smooth }` (index.css) est voulu pour les ancres,
 * mais un changement de page doit être instantané : sinon l'utilisateur voit
 * la nouvelle page défiler depuis l'ancienne position, et toute interaction
 * (dont le déplacement du focus) interrompt l'animation à mi-course.
 */
function jumpTo(top: number): void {
  window.scrollTo({ top, behavior: 'instant' });
}

export function ScrollManager() {
  const { key, hash } = useLocation();
  const navigationType = useNavigationType();

  // On mémorise nous-mêmes les positions : la restauration native du
  // navigateur se déclenche trop tôt sur une application monopage.
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // Suit la position de l'entrée d'historique courante au fil du défilement.
  //
  // On ne relit surtout pas `window.scrollY` au moment de quitter la page :
  // React a déjà remplacé le DOM par la page suivante quand ce nettoyage
  // s'exécute, et si elle est plus courte le navigateur a déjà recadré le
  // scroll — on mémoriserait une valeur tronquée. Les événements `scroll`
  // étant dispatchés de façon asynchrone, l'écouteur détient encore la
  // dernière position réelle de l'utilisateur.
  useEffect(() => {
    const remember = (): void => {
      positions.set(key, window.scrollY);
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [key]);

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    if (navigationType !== 'POP') {
      jumpTo(0);
      return;
    }

    const target = positions.get(key) ?? 0;
    jumpTo(target);
    if (target === 0) return;

    // Le contenu arrive après coup : on retente tant que la page grandit,
    // jusqu'à atteindre la position voulue ou expiration du délai.
    let done = false;
    const settle = (): void => {
      if (done) return;
      if (Math.abs(window.scrollY - target) < 2) {
        done = true;
        return;
      }
      if (document.documentElement.scrollHeight - window.innerHeight >= target) {
        jumpTo(target);
        done = true;
      }
    };

    const observer = new ResizeObserver(settle);
    observer.observe(document.documentElement);
    const timeout = window.setTimeout(() => observer.disconnect(), RESTORE_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [key, hash, navigationType]);

  return null;
}
