import type { ReactNode } from 'react';

type Tone = 'primary' | 'success' | 'warning' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  primary: 'bg-mtm-primary/10 text-mtm-primary',
  success: 'bg-mtm-success/10 text-mtm-success',
  warning: 'bg-mtm-warning/10 text-mtm-warning',
  neutral: 'bg-mtm-border/60 text-mtm-muted',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
