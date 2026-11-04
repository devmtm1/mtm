import type { ReactNode } from 'react';
import { BookmarkCheck, CalendarCheck, Globe2, Handshake, MessageSquare, ShieldCheck } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { Button } from '../ui/Button';
import { Silhouette } from '../programmes/CarteAchat';

interface CartePrixBienProps {
  prix: number | null;
  onVisite: () => void;
  onReservation: () => void;
  onInfos: () => void;
  /** Une phrase de contexte sous le prix (ex. le lot et son lotissement), facultative. */
  contexte?: ReactNode;
}

const GARANTIES = [
  { icone: ShieldCheck, texte: 'Terrain contrôlé par nos équipes avant publication' },
  { icone: Globe2, texte: 'Suivi à distance pour la diaspora' },
  { icone: Handshake, texte: 'Un interlocuteur dédié jusqu’à la signature' },
];

/** Une vague carmin entre l'en-tête bleu nuit et le corps blanc de la carte : le même trait que sous les mentions des bandeaux. */
function Vague() {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 28" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-px h-6 w-full">
      <path d="M0,14 C70,30 140,0 220,14 S350,26 400,8 V28 H0 Z" className="fill-mtm-surface" />
      <path d="M0,14 C70,30 140,0 220,14 S350,26 400,8" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-mtm-accent" />
    </svg>
  );
}

/**
 * La carte de prix d'un bien à vendre, à droite sur ordinateur : un en-tête bleu nuit avec le prix public, une seule
 * action principale (la visite), la réservation avec ce qu'elle engage, un lien discret pour les questions, puis ce qui
 * rassure. Même famille visuelle que la carte d'achat d'un lotissement.
 */
export function CartePrixBien({ prix, onVisite, onReservation, onInfos, contexte }: CartePrixBienProps) {
  return (
    <aside className="h-fit rounded-3xl bg-mtm-surface shadow-[0_20px_50px_-24px_rgba(10,33,66,0.45)] ring-1 ring-mtm-border lg:sticky lg:top-24">
      <div className="relative rounded-t-3xl bg-mtm-primary-dark px-6 pb-10 pt-6 text-white">
        {/* Mobile : le prix se lit déjà sous le nom et dans la barre du bas ; l'en-tête invite à agir. */}
        <h2 className="font-display text-xl font-bold lg:hidden">Intéressé par ce bien&nbsp;?</h2>
        <div className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Prix public</p>
          <p className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-[2rem]">{prix === null ? 'Prix sur demande' : formatMoney(prix)}</p>
          {contexte && <p className="mt-1.5 text-sm text-white/80">{contexte}</p>}
        </div>
        <Vague />
      </div>

      <div className="relative overflow-hidden rounded-b-3xl px-6 pb-20 pt-6">
        <div className="grid gap-2.5">
          {/* Mobile : la barre fixe du bas propose déjà « Visiter » ; le bouton n'est repris ici que sur ordinateur. */}
          <Button onClick={onVisite} className="hidden min-h-12 w-full justify-center rounded-xl text-[15px] lg:inline-flex">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Demander une visite
          </Button>
          <Button variant="secondary" onClick={onReservation} className="min-h-12 w-full justify-center rounded-xl text-[15px]">
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
            Réserver ce terrain
          </Button>
          <p className="text-center text-xs text-mtm-muted">Sans engagement : un conseiller vous rappelle pour l’acompte.</p>
          <button
            type="button"
            onClick={onInfos}
            className="inline-flex items-center justify-center gap-1.5 self-center rounded-md px-2 py-1 text-sm font-semibold text-mtm-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-mtm-primary"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Demander des informations
          </button>
        </div>
        <ul className="mt-5 space-y-3.5 border-t border-mtm-border pt-5">
          {GARANTIES.map(({ icone: Icone, texte }) => (
            <li key={texte} className="flex items-center gap-3 text-sm text-mtm-text">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mtm-primary-subtle text-mtm-primary">
                <Icone className="h-5 w-5" />
              </span>
              {texte}
            </li>
          ))}
        </ul>
        <Silhouette />
      </div>
    </aside>
  );
}
