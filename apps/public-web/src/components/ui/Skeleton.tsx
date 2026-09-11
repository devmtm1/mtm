/**
 * Placeholders de chargement.
 *
 * Ils remplacent le spinner substitutif là où le contenu attendu a une forme
 * connue : le gabarit de la page reste alors stable pendant le chargement,
 * ce qui évite l'effondrement de la mise en page (et, par ricochet, le
 * recadrage erratique de la position de scroll lors des transitions).
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-mtm-border/60 ${className}`} aria-hidden="true" />;
}

/** Silhouette d'une carte terrain (image 4/3 + référence, titre, badges, prix). */
export function TerrainCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
    </div>
  );
}

/** Silhouette d'une carte réalisation / projet à venir. */
export function ShowcaseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/** Grille de silhouettes, calquée sur la grille réelle (3 colonnes en large). */
export function CardGridSkeleton({
  count = 6,
  variant = 'terrain',
}: {
  count?: number;
  variant?: 'terrain' | 'showcase';
}) {
  const Card = variant === 'terrain' ? TerrainCardSkeleton : ShowcaseCardSkeleton;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} />
      ))}
    </div>
  );
}

/** Silhouette de la fiche terrain (en-tête + galerie à gauche, encart prix à droite). */
export function TerrainDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
      <span className="sr-only">Chargement du terrain...</span>
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]" aria-hidden="true">
        <div className="flex flex-col gap-8">
          <div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-8 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/3" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-11/12" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-40" />
            <Skeleton className="mt-6 h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Silhouette d'une liste d'articles empilés (actualités, dossiers client). */
export function ArticleListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="mt-3 h-6 w-2/3" />
          <Skeleton className="mt-2 h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
