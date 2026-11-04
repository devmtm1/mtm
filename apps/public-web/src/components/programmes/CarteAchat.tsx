import { CalendarCheck, Handshake, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import type { ProgrammePublic } from '../../api/programmes';
import { formatMoney } from '../../utils/format';
import { Button } from '../ui/Button';

interface CarteAchatProps {
  programme: Pick<ProgrammePublic, 'prixMin' | 'lotsDisponibles' | 'lotsTotal'>;
  onRappel: () => void;
}

const GARANTIES = [
  { icone: ShieldCheck, texte: 'Titres contrôlés par nos équipes avant publication' },
  { icone: MapPin, texte: 'Suivi à distance pour la diaspora' },
  { icone: Handshake, texte: 'Un interlocuteur dédié jusqu’à la signature' },
];

/** Une silhouette de ville très claire, au pied de la carte : de la chaleur, sans image à charger. */
export function Silhouette() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 70" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-mtm-primary-subtle" fill="currentColor">
      <path d="M0,70 V48 h14 V34 h18 V52 h10 V26 h16 V44 h12 V38 h8 V16 h14 V40 h12 V30 h20 V50 h10 V22 h16 V42 h14 V34 h12 V12 h10 V30 h16 V46 h12 V28 h18 V44 h14 V36 h16 V52 h12 V40 h14 V70 Z" />
    </svg>
  );
}

/**
 * La carte d'achat du lotissement, à droite sur ordinateur : un bloc bleu nuit avec le prix de départ et ce qu'il reste,
 * les deux actions, puis ce qui rassure. Elle reste sous la main pendant le défilement.
 */
export function CarteAchat({ programme, onRappel }: CarteAchatProps) {
  return (
    <div className="relative rounded-3xl bg-mtm-surface shadow-[0_20px_50px_-24px_rgba(10,33,66,0.45)] ring-1 ring-mtm-border">
      <div className="relative rounded-t-3xl bg-mtm-primary-dark px-6 pb-9 pt-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">À partir de</p>
        <p className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-[2rem]">
          {programme.prixMin === null ? 'Prix sur demande' : formatMoney(programme.prixMin)}
        </p>
        <span className="absolute -bottom-3.5 left-6 inline-flex items-center rounded-full bg-mtm-accent px-4 py-1.5 text-sm font-bold text-white shadow-card">
          {programme.lotsDisponibles} lot{programme.lotsDisponibles > 1 ? 's' : ''} disponible{programme.lotsDisponibles > 1 ? 's' : ''}
          {programme.lotsTotal > programme.lotsDisponibles && ` sur ${programme.lotsTotal}`}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-b-3xl px-6 pb-20 pt-9">
        <div className="grid gap-2.5">
          <Button onClick={onRappel} className="min-h-12 w-full justify-center rounded-xl text-[15px]">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Être rappelé par un conseiller
          </Button>
          <a
            href="#lots"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-mtm-primary bg-mtm-surface px-4 text-[15px] font-semibold text-mtm-primary transition-colors hover:bg-mtm-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
          >
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Choisir un lot à visiter
          </a>
        </div>
        <ul className="mt-6 space-y-3.5 border-t border-mtm-border pt-5">
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
    </div>
  );
}
