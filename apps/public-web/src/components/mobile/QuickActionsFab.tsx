import { useCallback, useEffect, useState } from 'react';
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

/**
 * Décalage horizontal de chaque action par rapport au bouton : les actions
 * dessinent un arc, plus écarté au milieu qu'aux extrémités, quel que soit
 * leur nombre (les réseaux sociaux ne s'affichent que s'ils sont renseignés).
 */
function arcOffset(index: number, count: number): number {
  return count < 3 ? 0 : Math.round(Math.sin((index / (count - 1)) * Math.PI) * 22);
}

/**
 * Bouton d'actions rapides de l'application mobile. Au repos, un bouton
 * discret ; au toucher, les gestes qui comptent pour un visiteur — appeler,
 * écrire sur WhatsApp, suivre MTM sur Facebook et TikTok, situer l'agence sur la
 * carte — jaillissent en arc. Les coordonnées sont celles que MTM administre au
 * back-office.
 */
export function QuickActionsFab() {
  const contact = useSiteContact();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
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
    ...(contact.facebook
      ? [{ key: 'facebook', label: 'Facebook', icon: Facebook, tone: 'bg-mtm-primary-medium', href: contact.facebook, external: true }]
      : []),
    ...(contact.tiktok
      ? [{ key: 'tiktok', label: 'TikTok', icon: TikTokIcon, tone: 'bg-mtm-primary-dark', href: contact.tiktok, external: true }]
      : []),
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
    'flex items-center gap-2.5 rounded-full bg-mtm-surface py-1.5 pl-1.5 pr-4 text-[13px] font-semibold text-mtm-text shadow-[0_8px_24px_rgba(31,41,55,0.22)] active:scale-95';

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fermer les actions rapides"
          tabIndex={-1}
          onClick={close}
          className="fixed inset-0 z-[45] bg-mtm-primary-dark/55 backdrop-blur-[3px] motion-safe:animate-fade-in lg:hidden"
        />
      )}

      <div className="pointer-events-none fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.9rem)] right-4 z-[46] flex flex-col items-end lg:hidden">
        {open && (
          <ul className="pointer-events-auto mb-3 flex flex-col-reverse items-end gap-2.5" aria-label="Actions rapides">
            {[...actions].reverse().map((action, reversedIndex) => {
              const index = actions.length - 1 - reversedIndex;
              const Icon = action.icon;
              const content = (
                <>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${action.tone}`}>
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  {action.label}
                </>
              );
              const style = {
                marginRight: `${arcOffset(index, actions.length)}px`,
                // Les actions les plus proches du bouton apparaissent d'abord.
                animationDelay: `${reversedIndex * 45}ms`,
              } as React.CSSProperties;
              return (
                <li key={action.key} className="motion-safe:animate-pop-in" style={style}>
                  <a
                    href={action.href}
                    {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    onClick={() => {
                      if (action.toast) setToast(action.toast);
                      close();
                    }}
                    className={pillClass}
                  >
                    {content}
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Fermer les actions rapides' : 'Ouvrir les actions rapides'}
          className={`pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-mtm-primary-medium to-mtm-primary-dark text-white shadow-[0_10px_28px_rgba(26,73,116,0.45)] transition-transform duration-200 active:scale-90 ${
            open ? 'ring-4 ring-white/40' : ''
          }`}
        >
          <Plus
            className={`h-7 w-7 transition-transform duration-300 ease-out ${open ? 'rotate-[135deg]' : ''}`}
            aria-hidden="true"
          />
        </button>
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
