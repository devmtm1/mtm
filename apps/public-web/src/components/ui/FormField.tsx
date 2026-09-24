import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-mtm-text">
        {label}
        {required && <span className="text-mtm-error"> *</span>}
      </label>
      {children}
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
  'w-full rounded-md border border-mtm-border bg-white px-3 py-2 text-base text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:outline-none focus:ring-1 focus:ring-mtm-primary sm:text-sm';
