import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock } from 'lucide-react';
import type { EtatEtape } from '../../../utils/clientFrise';

export interface FriseItem {
  key: string | number;
  etat: EtatEtape;
  titre: ReactNode;
  detail?: ReactNode;
  /** Montant, à droite. */
  droite?: ReactNode;
}

const ETATS = {
  reglee: { icon: CheckCircle2, point: 'text-mtm-success', carte: '' },
  prochaine: { icon: Clock, point: 'text-mtm-primary', carte: 'rounded-xl bg-mtm-primary-subtle px-3 py-2.5' },
  retard: { icon: AlertTriangle, point: 'text-mtm-accent', carte: 'rounded-xl bg-mtm-accent-subtle px-3 py-2.5' },
  'plus-tard': { icon: Circle, point: 'text-mtm-border', carte: '' },
} as const;

/**
 * Frise verticale d'étapes : une pastille d'état à gauche reliée à la
 * suivante, le titre et le détail, le montant à droite. La prochaine
 * échéance, ou celle en retard, est encadrée pour se lire en premier.
 */
export function Frise({ items, label }: { items: FriseItem[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {items.map((item, index) => {
        const { icon: Icon, point, carte } = ETATS[item.etat];
        const dernier = index === items.length - 1;
        return (
          <li key={item.key} className="relative flex gap-3 pb-3 last:pb-0">
            {!dernier && <span className="absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px bg-mtm-border" aria-hidden="true" />}
            <Icon className={`relative z-10 mt-2.5 h-[22px] w-[22px] shrink-0 rounded-full bg-mtm-surface ${point}`} aria-hidden="true" />
            <div className={`flex min-w-0 flex-1 items-start justify-between gap-3 ${carte || 'py-2'}`}>
              <div className="min-w-0">
                <p className={`text-sm ${item.etat === 'plus-tard' ? 'text-mtm-muted' : 'font-semibold text-mtm-text'}`}>{item.titre}</p>
                {item.detail && <p className="mt-0.5 text-xs text-mtm-muted">{item.detail}</p>}
              </div>
              {item.droite && <div className="shrink-0 text-right text-sm font-semibold text-mtm-text">{item.droite}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
