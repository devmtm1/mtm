import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientNotificationsPage } from './ClientNotificationsPage';
import type { ClientNotification } from '../../types/notification';

const donnees = vi.hoisted(() => ({
  valeur: {
    notifications: null as ClientNotification[] | null,
    notificationsNonLues: 0,
    marquerNotificationLue: vi.fn().mockResolvedValue(undefined),
    toutMarquerNotificationsLues: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../contexts/client-data-store', () => ({ useClientData: () => donnees.valeur }));

const maintenant = new Date().toISOString();
const notif = (id: string, extra: Partial<ClientNotification> = {}): ClientNotification => ({
  id,
  type: 'paiement_valide',
  niveau: 'info',
  titre: `Titre ${id}`,
  message: `Message ${id}`,
  lien: '/espace-client/dossiers',
  readAt: null,
  createdAt: maintenant,
  ...extra,
});

function afficher() {
  return render(
    <MemoryRouter initialEntries={['/espace-client/notifications']}>
      <Routes>
        <Route path="/espace-client/notifications" element={<ClientNotificationsPage />} />
        <Route path="/espace-client/dossiers" element={<p>Écran des dossiers</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClientNotificationsPage', () => {
  beforeEach(() => {
    donnees.valeur.marquerNotificationLue.mockClear();
    donnees.valeur.toutMarquerNotificationsLues.mockClear();
  });

  it('explique ce que l’on y trouvera quand il n’y a rien', () => {
    donnees.valeur.notifications = [];
    donnees.valeur.notificationsNonLues = 0;
    afficher();
    expect(screen.getByText('Rien de nouveau pour le moment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tout marquer comme lu/ })).not.toBeInTheDocument();
  });

  it('signale les non lues et regroupe par jour', () => {
    donnees.valeur.notifications = [notif('a'), notif('b', { readAt: maintenant })];
    donnees.valeur.notificationsNonLues = 1;
    afficher();
    expect(screen.getByRole('region', { name: 'Aujourd’hui' })).toBeInTheDocument();
    expect(screen.getByText('1 non lue')).toBeInTheDocument();
    expect(screen.getAllByText('Non lue')).toHaveLength(1);
  });

  it('un toucher marque la notification comme lue et ouvre l’écran concerné', () => {
    donnees.valeur.notifications = [notif('a')];
    donnees.valeur.notificationsNonLues = 1;
    afficher();
    fireEvent.click(screen.getByRole('button', { name: /Titre a/ }));
    expect(donnees.valeur.marquerNotificationLue).toHaveBeenCalledWith('a');
    expect(screen.getByText('Écran des dossiers')).toBeInTheDocument();
  });

  it('ne marque pas à nouveau une notification déjà lue, et ignore un lien étranger à l’espace client', () => {
    donnees.valeur.notifications = [notif('a', { readAt: maintenant, lien: '/ventes/abc' })];
    donnees.valeur.notificationsNonLues = 0;
    afficher();
    fireEvent.click(screen.getByRole('button', { name: /Titre a/ }));
    expect(donnees.valeur.marquerNotificationLue).not.toHaveBeenCalled();
    expect(screen.queryByText('Écran des dossiers')).not.toBeInTheDocument();
  });

  it('« Tout marquer comme lu »', () => {
    donnees.valeur.notifications = [notif('a'), notif('b')];
    donnees.valeur.notificationsNonLues = 2;
    afficher();
    fireEvent.click(screen.getByRole('button', { name: /Tout marquer comme lu/ }));
    expect(donnees.valeur.toutMarquerNotificationsLues).toHaveBeenCalled();
  });
});
