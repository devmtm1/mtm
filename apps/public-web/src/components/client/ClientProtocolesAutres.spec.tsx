import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientProtocolesAutres } from './ClientProtocolesAutres';
import { fetchMesAutresProtocoles } from '../../api/clientPortal';
import type { ClientProtocoleAutre } from '../../types/clientPortal';

vi.mock('../../api/clientPortal', () => ({
  fetchMesAutresProtocoles: vi.fn(),
  accepterProtocoleEnLigne: vi.fn(),
}));
vi.mock('../../contexts/auth-context-store', () => ({
  useAuth: () => ({ accessToken: 'jeton' }),
}));
vi.mock('../ui/toast-store', () => ({ useToast: () => ({ show: vi.fn() }) }));

const protocole: ClientProtocoleAutre = {
  id: 'p1',
  titre: 'Protocole de bail',
  type: 'protocole_accord',
  typeDossier: 'bail',
  reference: 'B-1',
  bien: 'Mermoz',
  etape: 'a_signer',
  libelle: 'À signer',
  aide: 'Votre protocole est prêt.',
  dateEnvoi: null,
  dateReceptionSignee: null,
  peutAccepterEnLigne: true,
  documentUrl: 'https://x.test/doc',
};

describe('ClientProtocolesAutres', () => {
  it('n’affiche rien quand le client n’a aucun protocole de bail ou de chantier', async () => {
    vi.mocked(fetchMesAutresProtocoles).mockResolvedValue([]);
    const { container } = render(<ClientProtocolesAutres />);
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });

  it('montre le protocole du bail avec son bouton d’acceptation en ligne', async () => {
    vi.mocked(fetchMesAutresProtocoles).mockResolvedValue([protocole]);
    render(<ClientProtocolesAutres />);
    expect(await screen.findByText('Protocole de bail')).toBeInTheDocument();
    expect(screen.getByText(/Bail B-1/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /accepter en ligne/i }),
    ).toBeInTheDocument();
  });
});
