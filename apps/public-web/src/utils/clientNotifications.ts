import { AlertTriangle, FileText, MessageSquare, Receipt, Wallet, Bell, type LucideIcon } from 'lucide-react';
import type { ClientNotification } from '../types/notification';
import { formatDate } from './format';

export interface GroupeNotifications {
  titre: string;
  items: ClientNotification[];
}

const debutDeJournee = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const JOUR = 24 * 60 * 60 * 1000;

/** Regroupe par « Aujourd'hui », « Hier » et « Plus ancien », dans l'ordre reçu (le plus récent d'abord). */
export function groupeParJour(items: ClientNotification[], maintenant: Date = new Date()): GroupeNotifications[] {
  const aujourdhui = debutDeJournee(maintenant);
  const groupes: GroupeNotifications[] = [
    { titre: 'Aujourd’hui', items: [] },
    { titre: 'Hier', items: [] },
    { titre: 'Plus ancien', items: [] },
  ];
  for (const item of items) {
    const ecart = Math.round((aujourdhui - debutDeJournee(new Date(item.createdAt))) / JOUR);
    groupes[ecart <= 0 ? 0 : ecart === 1 ? 1 : 2].items.push(item);
  }
  return groupes.filter((groupe) => groupe.items.length > 0);
}

/** « À l'instant », « il y a 12 min », « il y a 3 h », « il y a 2 j », puis la date. */
export function depuisQuand(date: string, maintenant: Date = new Date()): string {
  const minutes = Math.floor((maintenant.getTime() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 7) return `il y a ${jours} j`;
  return formatDate(date);
}

/** Icône et teinte d'une notification selon son type. */
export function iconeNotification(type: string, niveau: string): { icon: LucideIcon; tone: 'primary' | 'success' | 'warning' | 'accent' } {
  if (niveau === 'alerte') return { icon: AlertTriangle, tone: 'accent' };
  if (type === 'paiement_valide') return { icon: Wallet, tone: 'success' };
  if (type === 'reglement_valide') return { icon: Receipt, tone: 'success' };
  if (type === 'reponse_demande' || type === 'incident_maj') return { icon: MessageSquare, tone: 'primary' };
  if (type === 'document_disponible') return { icon: FileText, tone: 'primary' };
  return { icon: Bell, tone: 'primary' };
}

/** Seules les routes de l'espace client sont ouvertes : un lien venu d'ailleurs est ignoré. */
export function lienSur(lien: string | null): string | null {
  return lien && /^\/espace-client(\/|$)/.test(lien) ? lien : null;
}
