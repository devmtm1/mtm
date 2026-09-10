import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientPortalPage } from './ClientPortalPage';
import {
  getClientPortal,
  loginClient,
} from '../../services/client-portal-api';

vi.mock('../../services/client-portal-api', () => ({
  loginClient: vi.fn(),
  getClientPortal: vi.fn(),
  logoutClient: vi.fn(),
  getStoredClientAccessToken: vi.fn(() => null),
  saveClientSession: vi.fn(),
  clearClientSession: vi.fn(),
}));

describe('ClientPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('connects the client and shows their dossiers', async () => {
    vi.mocked(loginClient).mockResolvedValue({
      accessToken: 'token-123',
      user: {
        id: 'user-1',
        email: 'client@mtm.sn',
        firstName: 'Awa',
        lastName: 'Diop',
        roles: ['client'],
        permissions: ['clients:consulter'],
        mustChangePassword: false,
        twoFactorEnabled: false,
      },
    });
    vi.mocked(getClientPortal).mockResolvedValue([
      {
        id: 'dossier-1',
        referenceInterne: 'DV-001',
        statut: 'en_cours',
        prixVente: 25000000,
        createdAt: '2026-09-01T00:00:00.000Z',
        montantPaye: 500000,
        terrain: { referenceInterne: 'T-100', nom: 'Villa Almadies', region: 'Dakar', commune: 'Almadies' },
        reservations: [{ reference: 'RES-001', montantAcompte: 500000, dateExpiration: '2026-09-15T00:00:00.000Z', statut: 'active' }],
        paiements: [{ montant: 500000, datePaiement: '2026-09-02T00:00:00.000Z', mode: 'virement', reference: 'PAY-001' }],
        documents: [{ id: 'doc-1', type: 'contrat', title: 'Contrat de réservation', version: 1, createdAt: '2026-09-01T00:00:00.000Z' }],
      },
    ]);

    render(<ClientPortalPage onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'client@mtm.sn' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText(/suivi de vos projets immobiliers/i)).toBeInTheDocument();
    expect(screen.getByText('DV-001')).toBeInTheDocument();
    expect(screen.getByText('Villa Almadies')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voir tous les dossiers/i })).toBeInTheDocument();
  });
});
