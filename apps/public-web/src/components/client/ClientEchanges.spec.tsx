import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { ClientEchanges } from './ClientEchanges';

const api = vi.hoisted(() => ({
  fetchEchanges: vi.fn(),
  sendEchange: vi.fn(),
}));
vi.mock('../../api/messages', () => ({
  fetchEchanges: api.fetchEchanges,
  sendEchange: api.sendEchange,
}));
vi.mock('../../contexts/auth-context-store', () => ({
  useAuth: () => ({ accessToken: 'jeton' }),
}));
const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../ui/toast-store', () => ({ useToast: () => toast }));

const message = (extra = {}) => ({
  id: 'm1',
  corps: 'Votre contrat est prêt.',
  createdAt: '2026-10-12T10:00:00.000Z',
  deClient: false,
  auteur: 'Awa',
  ...extra,
});

describe('ClientEchanges (fil du dossier, côté client)', () => {
  beforeEach(() => {
    api.fetchEchanges.mockReset().mockResolvedValue({ items: [] });
    api.sendEchange.mockReset();
    toast.show.mockReset();
  });

  it('invite à écrire quand il n’y a encore aucun message', async () => {
    render(<ClientEchanges type="vente" dossierId="v1" chargerDirectement />);
    expect(
      await screen.findByText(/Aucun message pour l’instant/),
    ).toBeInTheDocument();
    expect(api.fetchEchanges).toHaveBeenCalledWith('jeton', 'vente', 'v1');
  });

  it('montre le message de MTM avec le prénom de l’auteur', async () => {
    api.fetchEchanges.mockResolvedValue({ items: [message()] });
    render(<ClientEchanges type="mission" dossierId="m1" chargerDirectement />);
    expect(
      await screen.findByText('Votre contrat est prêt.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Awa · MTM/)).toBeInTheDocument();
  });

  it('envoie la réponse du client et l’ajoute au fil', async () => {
    api.sendEchange.mockResolvedValue(
      message({
        id: 'm2',
        corps: 'Merci, je passe demain.',
        deClient: true,
        auteur: 'Vous',
      }),
    );
    render(<ClientEchanges type="vente" dossierId="v1" chargerDirectement />);
    await screen.findByText(/Aucun message/);

    const bouton = screen.getByRole('button', { name: /Envoyer/ });
    expect(bouton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Votre message à MTM'), {
      target: { value: '  Merci, je passe demain.  ' },
    });
    fireEvent.click(bouton);

    await waitFor(() =>
      expect(api.sendEchange).toHaveBeenCalledWith(
        'jeton',
        'vente',
        'v1',
        'Merci, je passe demain.',
      ),
    );
    expect(
      await screen.findByText('Merci, je passe demain.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Votre message à MTM')).toHaveValue('');
    expect(toast.show).toHaveBeenCalledWith('Message envoyé à MTM');
  });

  it('garde le texte et prévient quand l’envoi échoue', async () => {
    api.sendEchange.mockRejectedValue(
      new ApiError(429, 'Trop de messages envoyés : patientez une minute'),
    );
    render(<ClientEchanges type="vente" dossierId="v1" chargerDirectement />);
    await screen.findByText(/Aucun message/);
    fireEvent.change(screen.getByLabelText('Votre message à MTM'), {
      target: { value: 'Bonjour' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer/ }));

    await waitFor(() =>
      expect(toast.show).toHaveBeenCalledWith(
        'Trop de messages envoyés : patientez une minute',
      ),
    );
    expect(screen.getByLabelText('Votre message à MTM')).toHaveValue('Bonjour');
  });

  it('n’appelle pas le serveur avant le clic quand le fil n’est pas chargé d’emblée', async () => {
    api.fetchEchanges.mockResolvedValue({ items: [message()] });
    render(<ClientEchanges type="vente" dossierId="v1" />);
    expect(api.fetchEchanges).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Voir les messages' }));
    expect(
      await screen.findByText('Votre contrat est prêt.'),
    ).toBeInTheDocument();
    expect(api.fetchEchanges).toHaveBeenCalledTimes(1);
  });

  it('dit quand les échanges ne se chargent pas', async () => {
    api.fetchEchanges.mockRejectedValue(
      new ApiError(404, 'Dossier introuvable'),
    );
    render(<ClientEchanges type="vente" dossierId="v1" chargerDirectement />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dossier introuvable',
    );
  });
});
