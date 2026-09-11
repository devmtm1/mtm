import { Skeleton } from '../ui/Skeleton';

/**
 * Affichage d'attente pendant le chargement du code d'une page différée.
 *
 * Il réserve une hauteur proche de celle d'une page réelle : le pied de page
 * ne remonte donc pas brutalement pendant le téléchargement du module, et la
 * position de scroll n'est pas recadrée par le navigateur.
 */
export function PageFallback() {
  return (
    <div className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
      <span className="sr-only">Chargement de la page...</span>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-2/3 max-w-md" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <Skeleton className="mt-10 h-32 w-full" />
      <Skeleton className="mt-6 h-64 w-full" />
    </div>
  );
}
