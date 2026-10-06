import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Facebook, MapPin, MessageCircle, Phone, Plus, type LucideIcon } from 'lucide-react';
import { toMapsHref, toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { TikTokIcon } from '../ui/TikTokIcon';

interface Action {
  key: string;
  label: string;
  icon: LucideIcon | (({ className }: { className?: string }) => React.JSX.Element);
  /** Couleur du pastille : la palette de MTM, jamais une couleur étrangère. */
  tone: string;
  href?: string;
  external?: boolean;
  /** Message affiché un instant après le toucher (ex. « Ouverture de WhatsApp… »). */
  toast?: string;
}

/** Durée de la fermeture : assez longue pour se voir, assez courte pour ne jamais gêner. */
const CLOSE_MS = 260;
/** Écart entre deux actions, à l'ouverture, en millisecondes. */
const STAGGER_MS = 60;
/** Distance entre deux actions empilées, pour calculer d'où elles jaillissent. */
const ITEM_SPACING_PX = 56;

/**
 * Décalage horizontal de chaque action par rapport au bouton : les actions
 * dessinent un arc, plus écarté au milieu qu'aux extrémités, quel que soit
 * leur nombre.
 */
function arcOffset(index: number, count: number): number {
  return count < 3 ? 0 : Math.round(Math.sin((index / (count - 1)) * Math.PI) * 22);
}

/** Sans animation (préférence du système, ou environnement de test), tout est immédiat. */
function reduceMotion(): boolean {
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Phase = 'closed' | 'open' | 'closing';

/**
 * Bouton d'actions rapides de l'application mobile. Au repos, un bouton
 * discret qui laisse deviner sa présence (un halo, deux fois seulement). Au
 * toucher : une onde part du bouton, qui se transforme en croix et vire à
 * l'accent de la marque, pendant que les actions — appeler, WhatsApp,
 * Facebook, TikTok, la carte — jaillissent sur une trajectoire courbe avec un
 * léger dépassement, icônes d'abord, libellés ensuite. La fermeture rejoue le
 * mouvement à l'envers, plus vite. Les coordonnées sont celles que MTM
 * administre au back-office.
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
    { key: 'call', label: 'Appeler', icon: Phone, tone: 'bg-mtm-success', href: toTelHref(contact.telephone) },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      tone: 'bg-mtm-success',
      href: `https://wa.me/${contact.whatsapp}`,
      external: true,
      toast: 'Ouverture de WhatsApp…',
    },
    { key: 'facebook', label: 'Facebook', icon: Facebook, tone: 'bg-mtm-primary-medium', href: contact.facebook, external: true },
    { key: 'tiktok', label: 'TikTok', icon: TikTokIcon, tone: 'bg-mtm-primary-dark', href: contact.tiktok, external: true },
    {
      key: 'map',
      label: 'Voir sur la carte',
      icon: MapPin,
      tone: 'bg-mtm-accent',
      href: toMapsHref(contact),
      external: true,
    },
  ];

  const pillClass =
    'flex items-center rounded-full bg-mtm-surface py-1.5 pl-1.5 text-[13px] font-semibold text-mtm-text shadow-[0_8px_24px_rgba(31,41,55,0.28)] active:scale-95';

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

      <div className="pointer-events-none fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.9rem)] right-4 z-[46] flex flex-col items-end lg:hidden">
        {visible && (
          <ul className="pointer-events-auto mb-3 flex flex-col-reverse items-end gap-2.5" aria-label="Actions rapides">
            {[...actions].reverse().map((action, ordre) => {
              const index = actions.length - 1 - ordre;
              const Icon = action.icon;
              const delaiOuverture = ordre * STAGGER_MS;
              const delaiFermeture = (actions.length - 1 - ordre) * 30;
              const style = {
                marginRight: `${arcOffset(index, actions.length)}px`,
                // D'où l'action jaillit : le bouton, plus bas et plus à droite.
                '--fab-x0': '34px',
                '--fab-y0': `${(ordre + 1) * ITEM_SPACING_PX}px`,
                '--fab-d': `${open ? delaiOuverture : delaiFermeture}ms`,
              } as React.CSSProperties;
              // Deux couches, deux courbes d'accélération : le déplacement
              // horizontal et vertical ne vont pas à la même vitesse, la
              // trajectoire s'incurve — et l'action dépasse un peu avant de se caler.
              const couche = open
                ? 'motion-safe:animate-fab-x [animation-delay:var(--fab-d)]'
                : 'motion-safe:animate-fab-x-out [animation-delay:var(--fab-d)]';
              const coucheY = open
                ? 'motion-safe:animate-fab-y [animation-delay:var(--fab-d)]'
                : 'motion-safe:animate-fab-y-out [animation-delay:var(--fab-d)]';
              return (
                <li key={action.key} className={couche} style={style}>
                  <div className={coucheY}>
                    <a
                      href={action.href}
                      {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      onClick={() => {
                        if (action.toast) setToast(action.toast);
                        close();
                      }}
                      className={pillClass}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${action.tone}`}>
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      {/* Le libellé se déploie une fois l'icône en place. */}
                      <span
                        className={`block max-w-[12rem] overflow-hidden whitespace-nowrap pl-2.5 pr-4 ${
                          open ? 'motion-safe:animate-fab-label [animation-delay:calc(var(--fab-d)+190ms)]' : ''
                        }`}
                      >
                        {action.label}
                      </span>
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="pointer-events-none relative h-14 w-14">
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
                className="absolute inset-0 rounded-full border-2 border-white/60 opacity-0 motion-safe:animate-fab-ring [animation-delay:140ms]"
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
