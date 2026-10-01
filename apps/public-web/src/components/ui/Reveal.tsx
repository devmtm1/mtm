import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /**
   * Décalage en millisecondes, pour qu'une rangée d'éléments arrive l'un après
   * l'autre plutôt que d'un bloc. À garder court : au-delà de ~150 ms par
   * élément, le visiteur attend au lieu de regarder.
   */
  delay?: number;
  className?: string;
}

/** Au-delà, on considère que l'observateur ne se déclenchera pas. */
const FILET_DE_SECURITE_MS = 2000;

/**
 * Révèle son contenu quand il entre dans l'écran : le mouvement accompagne le
 * défilement au lieu de tout présenter d'un coup.
 *
 * Deux garde-fous tiennent la promesse « le contenu s'affiche, quoi qu'il
 * arrive » :
 *
 * - l'état de départ est *visible* dès qu'on ne peut pas animer proprement —
 *   navigateur sans IntersectionObserver, ou préférence « mouvement réduit ».
 *   Il est calculé au premier rendu, donc sans scintillement ;
 * - un filet de sécurité révèle le contenu après deux secondes si l'observateur
 *   n'a rien signalé. Un élément masqué par une animation qui ne part jamais
 *   serait pire que pas d'animation du tout.
 *
 * Seule l'opacité et un décalage vertical sont animés : un `transform` ne
 * déplace pas la mise en page, donc rien ne saute pendant le chargement.
 */
export function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const sansObservateur = typeof IntersectionObserver === 'undefined';
    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return sansObservateur || mouvementReduit;
  });

  useEffect(() => {
    if (visible) return;
    const element = ref.current;
    if (!element) return;

    const filet = window.setTimeout(() => setVisible(true), FILET_DE_SECURITE_MS);

    const observateur = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        // Une seule fois : réanimer en remontant donnerait un site agité.
        setVisible(true);
        observateur.disconnect();
      },
      // Déclenché un peu avant l'entrée réelle : le mouvement est terminé
      // quand l'élément arrive au centre du regard.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    observateur.observe(element);

    return () => {
      window.clearTimeout(filet);
      observateur.disconnect();
    };
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-500 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${className}`}
      style={visible && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
