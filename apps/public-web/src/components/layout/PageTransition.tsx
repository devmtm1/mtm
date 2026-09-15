import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Animation d'entrée d'une page (fondu + léger glissement), retirée dès
 * qu'elle est terminée. Tant qu'un `transform` reste posé sur ce conteneur
 * (ce que ferait un fill-mode), il devient le référent de tous les éléments
 * `position: fixed` de la page — barres d'action et fenêtres se retrouvent
 * alors calées sur la page entière, hors écran sur mobile.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const [entering, setEntering] = useState(true);

  return (
    <div
      className={entering ? 'motion-safe:animate-page-in' : undefined}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setEntering(false);
      }}
    >
      {children}
    </div>
  );
}
