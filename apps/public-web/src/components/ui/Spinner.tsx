export function Spinner({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-mtm-muted">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-mtm-border border-t-mtm-primary"
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
