import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Briques communes de l'espace client. Mêmes coins arrondis, mêmes gestes
 * tactiles et mêmes couleurs que le site mobile : passer de la vitrine à son
 * espace ne change pas de monde.
 */

/** Titre d'écran dans le style du back-office : rubrique en petites capitales, grand titre, phrase d'aide, filet. */
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
    <div className="mb-5 flex flex-col gap-3 border-b border-mtm-border pb-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mtm-primary-medium">{eyebrow ?? 'Espace client'}</p>
        <h1 className="font-display text-[1.65rem] font-bold leading-tight text-mtm-text sm:text-[1.9rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mtm-muted">{description}</p>}
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
  subtitle,
}: {
  title?: string;
  to?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
  /** Phrase sous le titre, comme les cartes du tableau de bord du back-office. */
  subtitle?: string;
}) {
  return (
    <section className={`rounded-[14px] border border-mtm-border bg-mtm-surface shadow-card ${className}`}>
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-mtm-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-mtm-text">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-mtm-muted">{subtitle}</p>}
          </div>
          {to && (
            <Link to={to} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70 lg:text-sm lg:hover:underline">
              {linkLabel}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </header>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
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

/** Indicateur chiffré dans le style du back-office : icône à gauche, libellé en petites capitales, grande valeur, détail. */
export function StatTile({
  icon: Icon,
  value,
  label,
  tone = 'primary',
  to,
  detail,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone?: ClientTone;
  to?: string;
  /** Phrase sous la valeur : le contexte du chiffre. */
  detail?: string;
  /** Conservé pour compatibilité : tous les indicateurs ont désormais la même présentation. */
  compact?: boolean;
}) {
  const alerte = tone === 'warning' || tone === 'accent';
  const classes = `flex flex-col items-start gap-2.5 rounded-[14px] border p-3.5 shadow-card sm:flex-row sm:items-center sm:gap-3.5 sm:p-4 ${
    alerte ? 'border-mtm-accent/25 bg-mtm-accent-subtle/60' : 'border-mtm-border bg-mtm-surface'
  }`;
  const body = (
    <>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ICON_TONES[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-mtm-muted">{label}</span>
        <span className="block break-words font-display text-lg font-bold leading-tight text-mtm-text sm:text-xl">{value}</span>
        {detail && <span className="block text-xs text-mtm-muted">{detail}</span>}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className={`${classes} transition-transform active:scale-[0.98]`}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
