/** Badge rouge « Vendu » : la couleur d'accent de MTM, qui ne se confond avec aucun autre état. */
export function SoldBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg bg-mtm-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-card ${className}`}
    >
      Vendu
    </span>
  );
}
