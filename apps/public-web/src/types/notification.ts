/** Notification affichée dans l'espace client (cloche et écran « Notifications »). */
export interface ClientNotification {
  id: string;
  type: string;
  niveau: 'info' | 'alerte' | string;
  titre: string;
  message: string | null;
  /** Route de l'espace client à ouvrir au toucher (ex. /espace-client/dossiers). */
  lien: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ClientNotifications {
  items: ClientNotification[];
  nonLues: number;
}
