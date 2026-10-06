import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Briques communes de l'espace client. Mêmes coins arrondis, mêmes gestes
 * tactiles et mêmes couleurs que le site mobile : passer de la vitrine à son
 * espace ne change pas de monde.
 */

/** Titre d'écran, avec action facultative à droite. */
export function ClientPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-wider text-mtm-primary">{eyebrow}</p>}
        <h1 className="font-display text-[1.65rem] font-bold leading-tight text-mtm-text sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm leading-relaxed text-mtm-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Carte standard : titre et lien « voir tout » facultatifs. */
export function ClientCard({
  title,
  to,
  linkLabel = 'Voir tout',
  children,
  className = '',
}: {
  title?: string;
  to?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-mtm-border/70 bg-mtm-surface shadow-card lg:rounded-lg lg:border-mtm-border ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5 lg:border-b lg:border-mtm-border lg:pb-3 lg:pt-3">
          <h2 className="font-display text-base font-bold text-mtm-text">{title}</h2>
          {to && (
            <Link to={to} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70 lg:text-sm lg:hover:underline">
              {linkLabel}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </header>
      )}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}

const ICON_TONES = {
  primary: 'bg-mtm-primary-subtle text-mtm-primary',
  success: 'bg-mtm-success/10 text-mtm-success',
  warning: 'bg-mtm-warning/10 text-mtm-warning',
  accent: 'bg-mtm-accent-subtle text-mtm-accent',
  neutral: 'bg-mtm-bg text-mtm-muted',
} as const;

export type ClientTone = keyof typeof ICON_TONES;

/** Pastille ronde ou arrondie portant une icône, teintée selon l'état qu'elle illustre. */
export function IconBadge({ icon: Icon, tone = 'primary', className = '' }: { icon: LucideIcon; tone?: ClientTone; className?: string }) {
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ICON_TONES[tone]} ${className}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

/** Ligne touchable d'une liste : icône, titre, détail, et à droite un état ou un chevron. */
export function ClientRow({
  to,
  href,
  icon,
  tone,
  title,
  subtitle,
  trailing,
}: {
  to?: string;
  href?: string;
  icon: LucideIcon;
  tone?: ClientTone;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <IconBadge icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-mtm-text">{title}</span>
        {subtitle && <span className="block truncate text-xs text-mtm-muted">{subtitle}</span>}
      </span>
      {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-mtm-muted" aria-hidden="true" />}
    </>
  );
  const classes = 'flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors active:scale-[0.99] active:bg-mtm-bg';
  if (to) return <Link to={to} className={classes}>{content}</Link>;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    );
  }
  return <div className={classes}>{content}</div>;
}

/** Barre d'avancement : le pourcentage est aussi lu par les lecteurs d'écran. */
export function ProgressBar({ value, label, tone = 'success', className = '' }: { value: number; label: string; tone?: 'success' | 'primary'; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-mtm-border/70 ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ${tone === 'success' ? 'bg-mtm-success' : 'bg-mtm-primary'}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Indicateur chiffré : une valeur, son libellé, une icône. */
export function StatTile({
  icon: Icon,
  value,
  label,
  tone = 'primary',
  to,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone?: ClientTone;
  to?: string;
}) {
  const body = (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${ICON_TONES[tone]}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="mt-2 block truncate font-display text-lg font-bold leading-tight text-mtm-text">{value}</span>
      <span className="block text-xs font-semibold text-mtm-muted">{label}</span>
    </>
  );
  const classes = 'block rounded-2xl border border-mtm-border/70 bg-mtm-surface p-3.5 shadow-card lg:rounded-lg lg:border-mtm-border';
  return to ? (
    <Link to={to} className={`${classes} transition-transform active:scale-[0.97]`}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
