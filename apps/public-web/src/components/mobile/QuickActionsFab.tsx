import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Facebook, MapPin, MessageCircle, Phone, Plus, type LucideIcon } from 'lucide-react';
import { toMapsHref, toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { TikTokIcon } from '../ui/TikTokIcon';

interface Action {
  key: string;
  /** Nom complet, lu par les lecteurs d'écran. */
  label: string;
  /** Légende courte, sous l'icône. */
  short: string;
  icon: LucideIcon | (({ className }: { className?: string }) => React.JSX.Element);
  /** Couleur du rond : la palette de MTM, jamais une couleur étrangère. */
  tone: string;
  href?: string;
  external?: boolean;
  /** Message affiché un instant après le toucher (ex. « Ouverture de WhatsApp… »). */
  toast?: string;
}

/** Durée de la fermeture : assez longue pour se voir, assez courte pour ne jamais gêner. */
const CLOSE_MS = 300;
/** Écart entre deux actions à l'ouverture : elles apparaissent une par une. */
const STAGGER_MS = 140;
/** Rayon de l'arc, en pixels : de quoi laisser place aux légendes entre deux ronds de 48 px. */
const RADIUS_PX = 140;
/**
 * Le bouton est dans le coin bas droit : l'arc part de la verticale (au-dessus
 * du bouton), passe à sa gauche et descend un peu au-delà de l'horizontale
 * (le dessous du bouton reste libre jusqu'à la barre d'onglets). Plus d'un
 * quart de cercle, pour laisser de l'air aux actions et à leurs légendes.
 */
const ANGLE_START = 90;
const ANGLE_END = 210;
/** Marge du dessin de l'arc autour du bouton, en pixels. */
const TRACK_PAD = 6;

/** Position d'une action sur l'arc, par rapport au centre du bouton (x vers la droite, y vers le bas). */
function positionOnArc(index: number, count: number): { x: number; y: number } {
  const angle = count < 2 ? (ANGLE_START + ANGLE_END) / 2 : ANGLE_START + ((ANGLE_END - ANGLE_START) * index) / (count - 1);
  const rad = (angle * Math.PI) / 180;
  return { x: Math.round(RADIUS_PX * Math.cos(rad)), y: Math.round(-RADIUS_PX * Math.sin(rad)) };
}

/** Sans animation (préférence du système, ou environnement de test), tout est immédiat. */
function reduceMotion(): boolean {
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Phase = 'closed' | 'open' | 'closing';

/**
 * Bouton d'actions rapides de l'application mobile. Au repos, un bouton
 * discret qui laisse deviner sa présence (un halo, deux fois seulement). Au
 * toucher : une onde part du bouton, qui se transforme en croix aux couleurs
 * de la marque, un arc se dessine autour de lui, et les actions — appeler,
 * WhatsApp, Facebook, TikTok, la carte — jaillissent du bouton l'une après
 * l'autre pour se ranger sur l'arc, avec un léger dépassement, leur légende
 * apparaissant ensuite. La fermeture rejoue le mouvement à l'envers, plus
 * vite. Les coordonnées sont celles que MTM administre au back-office.
 */
export function QuickActionsFab() {
  const contact = useSiteContact();
  const { pathname } = useLocation();
  const [phase, setPhase] = useState<Phase>('closed');
  const [ouvertures, setOuvertures] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const open = phase === 'open';
  const visible = phase !== 'closed';

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    if (reduceMotion()) {
      setPhase('closed');
      return;
    }
    setPhase((courant) => (courant === 'open' ? 'closing' : courant));
    timer.current = window.setTimeout(() => setPhase('closed'), CLOSE_MS);
  }, []);

  const ouvrir = useCallback(() => {
    window.clearTimeout(timer.current);
    setPhase('open');
    setOuvertures((nombre) => nombre + 1);
    // Un léger retour tactile, là où le téléphone le permet.
    try {
      navigator.vibrate?.(10);
    } catch {
      /* non pris en charge : sans importance */
    }
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Un changement d'écran referme le bouton aussitôt, sans animation.
  useEffect(() => {
    window.clearTimeout(timer.current);
    setPhase('closed');
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!toast) return;
    const delai = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(delai);
  }, [toast]);

  const actions: Action[] = [
    { key: 'call', label: 'Appeler', short: 'Appeler', icon: Phone, tone: 'bg-mtm-success', href: toTelHref(contact.telephone) },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      short: 'WhatsApp',
      icon: MessageCircle,
      tone: 'bg-mtm-success',
      href: `https://wa.me/${contact.whatsapp}`,
      external: true,
      toast: 'Ouverture de WhatsApp…',
    },
    { key: 'facebook', label: 'Facebook', short: 'Facebook', icon: Facebook, tone: 'bg-mtm-primary-medium', href: contact.facebook, external: true },
    { key: 'tiktok', label: 'TikTok', short: 'TikTok', icon: TikTokIcon, tone: 'bg-mtm-primary-dark', href: contact.tiktok, external: true },
    {
      key: 'map',
      label: 'Voir sur la carte',
      short: 'Carte',
      icon: MapPin,
      tone: 'bg-mtm-accent',
      href: toMapsHref(contact),
      external: true,
    },
  ];

  const piste = RADIUS_PX + TRACK_PAD;
  // Longueur de l'arc, pour qu'il se dessine progressivement.
  const longueurArc = Math.ceil(RADIUS_PX * (((ANGLE_END - ANGLE_START) * Math.PI) / 180));
  const finArc = positionOnArc(1, 2);

  return (
    <>
      {visible && (
        <>
          <button
            type="button"
            aria-label="Fermer les actions rapides"
            tabIndex={-1}
            onClick={close}
            className={`fixed inset-0 z-[45] bg-mtm-primary-dark/60 backdrop-blur-[4px] transition-opacity duration-300 lg:hidden ${open ? 'opacity-100' : 'opacity-0'}`}
          />
          {/* Lueur aux couleurs de la marque, au coin du bouton. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none fixed inset-0 z-[45] bg-[radial-gradient(circle_at_88%_92%,rgba(181,44,54,0.45),transparent_52%)] transition-opacity duration-500 lg:hidden ${open ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      )}

      <div className="pointer-events-none fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.9rem)] right-4 z-[46] lg:hidden">
        <div className="relative h-14 w-14">
          {visible && (
            <>
              {/* L'arc qui se dessine autour du bouton, sur lequel les actions viennent se ranger. */}
              <svg
                aria-hidden="true"
                width={piste}
                height={piste}
                viewBox={`0 0 ${piste} ${piste}`}
                className="absolute bottom-1/2 right-1/2 max-w-none overflow-visible"
              >
                <path
                  d={`M ${piste} ${piste - RADIUS_PX} A ${RADIUS_PX} ${RADIUS_PX} 0 0 0 ${piste + finArc.x} ${piste + finArc.y}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={longueurArc}
                  strokeDashoffset={open ? 0 : longueurArc}
                  className={open ? 'motion-safe:animate-fab-draw' : 'opacity-0 transition-opacity duration-200'}
                  style={{ ['--fab-arc' as string]: longueurArc }}
                />
              </svg>

              <ul className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0" aria-label="Actions rapides">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  const { x, y } = positionOnArc(index, actions.length);
                  const delaiOuverture = index * STAGGER_MS;
                  const delaiFermeture = (actions.length - 1 - index) * 35;
                  const style = {
                    '--bx': `${x}px`,
                    '--by': `${y}px`,
                    animationDelay: `${open ? delaiOuverture : delaiFermeture}ms`,
                    // Sans animation (préférence du système), l'action est déjà à sa place.
                    transform: `translate(${x}px, ${y}px)`,
                  } as React.CSSProperties;
                  return (
                    <li
                      key={action.key}
                      className={`pointer-events-auto absolute -left-6 -top-6 h-12 w-12 ${
                        open ? 'motion-safe:animate-fab-burst' : 'motion-safe:animate-fab-burst-out'
                      }`}
                      style={style}
                    >
                      <a
                        href={action.href}
                        aria-label={action.label}
                        {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        onClick={() => {
                          if (action.toast) setToast(action.toast);
                          close();
                        }}
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_8px_22px_rgba(0,0,0,0.35)] ring-2 ring-white/70 transition-transform active:scale-90 ${action.tone}`}
                      >
                        <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                      </a>
                      {/* La légende apparaît une fois l'action en place, côté extérieur de l'arc : au-dessus pour l'action du haut, à gauche pour les autres. */}
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute whitespace-nowrap text-[11px] font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.65)] ${
                          index === 0 ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2' : 'right-full top-1/2 mr-2 -translate-y-1/2'
                        } ${
                          open ? 'motion-safe:animate-fab-caption' : 'opacity-0'
                        }`}
                        style={open ? { animationDelay: `${delaiOuverture + 300}ms` } : undefined}
                      >
                        {action.short}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Au repos : un halo qui attire l'œil, deux fois seulement, puis plus rien. */}
          {!visible && ouvertures === 0 && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-mtm-primary-medium opacity-0 motion-safe:animate-fab-halo"
            />
          )}
          {/* À l'ouverture : deux ondes successives partent du bouton. */}
          {open && (
            <>
              <span
                key={`onde-a-${ouvertures}`}
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-white/80 opacity-0 motion-safe:animate-fab-ring"
              />
              <span
                key={`onde-b-${ouvertures}`}
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-white/60 opacity-0 motion-safe:animate-fab-ring"
                style={{ animationDelay: '160ms' }}
              />
            </>
          )}
          <button
            type="button"
            onClick={() => (open ? close() : ouvrir())}
            aria-expanded={open}
            aria-label={open ? 'Fermer les actions rapides' : 'Ouvrir les actions rapides'}
            className="pointer-events-auto relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-mtm-primary-medium to-mtm-primary-dark text-white shadow-[0_10px_28px_rgba(26,73,116,0.45)] transition-transform duration-200 active:scale-90"
          >
            {/* Le bouton vire à l'accent de la marque quand il est ouvert. */}
            <span
              aria-hidden="true"
              className={`absolute inset-0 bg-gradient-to-br from-mtm-accent to-mtm-accent-dark transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
            />
            <Plus
              className={`relative h-7 w-7 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${open ? 'rotate-[135deg] scale-110' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom)+5.2rem)] right-4 z-[47] flex items-center gap-2 rounded-full bg-mtm-primary-dark px-3.5 py-2 text-xs font-semibold text-white shadow-card motion-safe:animate-scale-in lg:hidden"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-mtm-success">
            <Check className="h-3 w-3" aria-hidden="true" />
          </span>
          {toast}
        </div>
      )}
    </>
  );
}
