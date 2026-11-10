import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoutonRecu } from './BoutonRecu';

const telechargerRecu = vi.fn();
const afficher = vi.fn();

vi.mock('../../api/clientPortal', () => ({ telechargerRecu: (...args: unknown[]) => telechargerRecu(...args) }));
vi.mock('../../contexts/auth-context-store', () => ({ useAuth: () => ({ accessToken: 'jeton' }) }));
vi.mock('../ui/toast-store', () => ({ useToast: () => ({ show: afficher }) }));

describe('BoutonRecu', () => {
  beforeEach(() => {
    telechargerRecu.mockReset();
    afficher.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:recu');
    URL.revokeObjectURL = vi.fn();
  });

  it('télécharge le reçu du paiement avec le jeton du client', async () => {
    telechargerRecu.mockResolvedValue(new Blob(['%PDF']));
    render(<BoutonRecu nature="vente" paiementId="p-1" />);
    await userEvent.click(screen.getByRole('button', { name: /télécharger le reçu/i }));
    await waitFor(() => expect(telechargerRecu).toHaveBeenCalledWith('jeton', 'vente', 'p-1'));
    expect(afficher).not.toHaveBeenCalled();
  });

  it('prévient le client quand le téléchargement échoue', async () => {
    telechargerRecu.mockRejectedValue(new Error('x'));
    render(<BoutonRecu nature="loyer" paiementId="p-2" />);
    await userEvent.click(screen.getByRole('button', { name: /télécharger le reçu/i }));
    await waitFor(() => expect(afficher).toHaveBeenCalledWith(expect.stringContaining('reçu')));
  });
});
