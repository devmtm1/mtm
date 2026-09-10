export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onDark' | 'onDarkOutline';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-mtm-primary text-white hover:bg-mtm-primary-dark focus-visible:outline-mtm-primary',
  secondary:
    'bg-white text-mtm-primary border border-mtm-primary hover:bg-mtm-primary/5 focus-visible:outline-mtm-primary',
  ghost: 'text-mtm-text hover:bg-mtm-bg focus-visible:outline-mtm-primary',
  // Variantes dédiées aux fonds sombres (ex. hero) : évite de "surcharger" un
  // variant clair via des classes ajoutées en JSX, dont l'ordre ne détermine
  // pas la priorité CSS réelle (celle-ci dépend de l'ordre généré par
  // Tailwind, pas de l'ordre des classes dans le className).
  onDark: 'bg-white text-mtm-primary hover:bg-white/90 focus-visible:outline-white',
  onDarkOutline:
    'border border-white text-white hover:bg-white/10 focus-visible:outline-white',
};

export function buttonClassName(variant: ButtonVariant = 'primary', className = ''): string {
  return `inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANT_CLASSES[variant]} ${className}`;
}
