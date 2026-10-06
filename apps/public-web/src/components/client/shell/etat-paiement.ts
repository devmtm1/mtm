import { AlertTriangle, CalendarClock, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';
import type { ClientTone } from './ClientUi';

/** Icône et teinte d'une échéance ou d'un règlement selon son état : lisibles avant le texte. */
export function etatPaiementIcone(statut: string): { icon: LucideIcon; tone: ClientTone } {
  switch (statut) {
    case 'payee':
    case 'valide':
      return { icon: CheckCircle2, tone: 'success' };
    case 'en_retard':
    case 'impayee':
    case 'rejete':
      return { icon: AlertTriangle, tone: 'accent' };
    case 'partielle':
    case 'en_attente':
      return { icon: Clock, tone: 'warning' };
    default:
      return { icon: CalendarClock, tone: 'neutral' };
  }
}
