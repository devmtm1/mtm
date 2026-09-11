import { useEffect, useRef, useState } from 'react';
import { PAGE_METADATA_EVENT } from '../../hooks/usePageMetadata';

/**
 * Accessibilité des transitions de page.
 *
 * Dans une application monopage, changer de route ne provoque aucun des
 * signaux qu'un navigateur émet normalement : le focus reste sur le lien
 * cliqué et les lecteurs d'écran n'annoncent rien. On replace donc le focus
 * sur le contenu principal et on annonce le titre de la nouvelle page dans
 * une région `aria-live`.
 *
 * Le déclencheur est l'événement émis par `usePageMetadata`, pas le
 * changement d'URL : pour une page chargée à la demande, le titre n'est posé
 * qu'une fois son code arrivé, bien après la navigation.
 */
export function RouteAnnouncer({ mainId }: { mainId: string }) {
  const [announcement, setAnnouncement] = useState('');
  const lastFocusedPath = useRef<string | null>(null);

  useEffect(() => {
    // Au premier affichage, le navigateur fait déjà le nécessaire : déplacer
    // le focus ici serait redondant et perturberait la lecture.
    lastFocusedPath.current = window.location.pathname;

    const handleMetadata = (): void => {
      setAnnouncement(document.title);

      // L'URL est déjà à jour quand la page pose son titre. Une même page
      // peut aussi mettre son titre à jour après coup (fiche terrain une fois
      // les données reçues) : on ne redéplace pas le focus pour ça.
      const path = window.location.pathname;
      if (lastFocusedPath.current === path) return;
      lastFocusedPath.current = path;
      document.getElementById(mainId)?.focus({ preventScroll: true });
    };

    window.addEventListener(PAGE_METADATA_EVENT, handleMetadata);
    return () => window.removeEventListener(PAGE_METADATA_EVENT, handleMetadata);
  }, [mainId]);

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </p>
  );
}
