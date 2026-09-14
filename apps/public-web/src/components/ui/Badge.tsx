import type { ReactNode } from 'react';

type Tone = 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  primary: 'bg-mtm-primary-subtle text-mtm-primary',
  accent: 'bg-mtm-accent-subtle text-mtm-accent',
  info: 'bg-mtm-info-bg text-mtm-primary-medium',
  success: 'bg-mtm-success/10 text-mtm-success',
  warning: 'bg-mtm-warning/10 text-mtm-warning',
  neutral: 'bg-mtm-border/60 text-mtm-muted',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  /** Classes additionnelles (ex. masquage responsive). */
  className?: string;
}

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
