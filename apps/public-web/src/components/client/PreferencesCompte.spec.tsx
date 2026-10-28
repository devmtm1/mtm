import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesCompte } from './PreferencesCompte';

const api = vi.hoisted(() => ({ fetchPreferences: vi.fn(), savePreferences: vi.fn(), show: vi.fn() }));

vi.mock('../../api/notifications', () => ({ fetchPreferences: api.fetchPreferences, savePreferences: api.savePreferences }));
vi.mock('../../contexts/auth-context-store', () => ({
  useAuth: () => ({ accessToken: 'jeton', user: { email: 'client@exemple.test' } }),
}));
vi.mock('../ui/toast-store', () => ({ useToast: () => ({ show: api.show }) }));

const preferences = (extra = {}) => ({
  email: true,
  sms: false,
  whatsapp: false,
  telephone: '',
  canaux: { email: true, sms: false, whatsapp: false },
  ...extra,
});

describe('PreferencesCompte', () => {
  beforeEach(() => {
    api.fetchPreferences.mockReset();
    api.savePreferences.mockReset();
    api.show.mockReset();
  });

  it('ne propose SMS et WhatsApp que si MTM les a activés', async () => {
    api.fetchPreferences.mockResolvedValue(preferences());
    render(<PreferencesCompte />);

    expect(await screen.findByRole('switch', { name: 'E-mail' })).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'SMS' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'WhatsApp' })).toBeNull();
  });

  it('montre l’adresse e-mail de connexion sans permettre de la modifier', async () => {
    api.fetchPreferences.mockResolvedValue(preferences());
    render(<PreferencesCompte />);

    expect(await screen.findByText('client@exemple.test')).toBeTruthy();
    expect(screen.queryByLabelText(/e-mail de connexion/i)).toBeNull();
  });

  it('enregistre le téléphone et les canaux choisis', async () => {
    api.fetchPreferences.mockResolvedValue(preferences({ canaux: { email: true, sms: true, whatsapp: true } }));
    api.savePreferences.mockResolvedValue(preferences({ telephone: '+221 77 123 45 67', whatsapp: true, canaux: { email: true, sms: true, whatsapp: true } }));
    render(<PreferencesCompte />);

    fireEvent.change(await screen.findByLabelText('Téléphone'), { target: { value: '+221 77 123 45 67' } });
    fireEvent.click(screen.getByRole('switch', { name: 'WhatsApp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(api.savePreferences).toHaveBeenCalledWith('jeton', { telephone: '+221 77 123 45 67', email: true, sms: false, whatsapp: true }),
    );
    expect(api.show).toHaveBeenCalledWith('Préférences enregistrées');
  });

  it('affiche le message du serveur quand l’enregistrement est refusé', async () => {
    const { ApiError } = await import('../../api/client');
    api.fetchPreferences.mockResolvedValue(preferences({ canaux: { email: true, sms: true, whatsapp: false } }));
    api.savePreferences.mockRejectedValue(new ApiError(400, 'Renseignez votre numéro de téléphone pour recevoir des SMS'));
    render(<PreferencesCompte />);

    fireEvent.click(await screen.findByRole('switch', { name: 'SMS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Renseignez votre numéro');
  });
});
