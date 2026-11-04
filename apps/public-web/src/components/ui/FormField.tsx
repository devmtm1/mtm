import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  /** Une précision sous le champ, tant qu'il n'a pas d'erreur. */
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, required, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-mtm-text">
        {label}
        {required && <span className="text-mtm-error"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-mtm-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-mtm-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// `text-base` (16px) sur mobile : en dessous, Safari iOS zoome automatiquement
// la page au focus d'un champ, ce qui donne l'impression que le formulaire
// déborde de l'écran tant qu'on n'a pas dézoomé à la main.
export const fieldInputClass =
  'w-full rounded-xl border border-mtm-border bg-white px-3.5 py-3 text-base text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary sm:rounded-md sm:px-3 sm:py-2 sm:text-sm';
