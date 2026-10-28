import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssuranceCard } from './AssuranceCard';
import type { ClientAssurance } from '../../types/locatif';

const mocks = vi.hoisted(() => ({ deposer: vi.fn(), refetch: vi.fn(), show: vi.fn() }));

vi.mock('../../api/clientPortal', () => ({ deposerAssurance: mocks.deposer }));
vi.mock('../../contexts/auth-context-store', () => ({ useAuth: () => ({ accessToken: 'jeton' }) }));
vi.mock('../../contexts/client-data-store', () => ({ useClientData: () => ({ refetchLocataireBaux: mocks.refetch }) }));
vi.mock('../ui/toast-store', () => ({ useToast: () => ({ show: mocks.show }) }));

const demain = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
const assurance = (extra: Partial<ClientAssurance> = {}): ClientAssurance => ({
  statut: 'valide',
  dateExpiration: new Date(Date.now() + 200 * 86_400_000).toISOString(),
  motifRejet: null,
  deposeLe: new Date().toISOString(),
  expiree: false,
  ...extra,
});

describe('AssuranceCard', () => {
  beforeEach(() => {
    mocks.deposer.mockReset();
    mocks.refetch.mockReset();
    mocks.show.mockReset();
  });

  it('invite à déposer l’attestation quand rien n’a été déposé', () => {
    render(<AssuranceCard assurance={null} />);

    expect(screen.getByText('À déposer')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Déposer mon attestation' })).toBeTruthy();
  });

  it('ne propose pas de nouveau dépôt pendant le contrôle ni quand elle est valide', () => {
    const { rerender } = render(<AssuranceCard assurance={assurance({ statut: 'en_attente' })} />);
    expect(screen.getByText('En cours de vérification')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<AssuranceCard assurance={assurance()} />);
    expect(screen.getByText('Valide')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('affiche le motif d’un refus et propose de redéposer', () => {
    render(<AssuranceCard assurance={assurance({ statut: 'rejete', motifRejet: 'Document illisible' })} />);

    expect(screen.getByText('Refusée')).toBeTruthy();
    expect(screen.getByText(/Document illisible/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Déposer une nouvelle attestation' })).toBeTruthy();
  });

  it('propose de renouveler une attestation expirée', () => {
    render(<AssuranceCard assurance={assurance({ expiree: true })} />);

    expect(screen.getByText('Expirée')).toBeTruthy();
  });

  it('envoie le fichier et la date, puis rafraîchit le bail', async () => {
    mocks.deposer.mockResolvedValue({});
    render(<AssuranceCard assurance={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Déposer mon attestation' }));
    const fichier = new File(['%PDF'], 'attestation.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Attestation d’assurance/), { target: { files: [fichier] } });
    fireEvent.change(screen.getByLabelText(/Valable jusqu’au/), { target: { value: demain } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer mon attestation' }));

    await waitFor(() => expect(mocks.deposer).toHaveBeenCalledWith('jeton', fichier, demain));
    expect(mocks.refetch).toHaveBeenCalled();
    expect(mocks.show).toHaveBeenCalledWith('Attestation envoyée : MTM la vérifie');
  });

  it('n’envoie rien sans fichier et dit pourquoi', async () => {
    render(<AssuranceCard assurance={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Déposer mon attestation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer mon attestation' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Choisissez le fichier/);
    expect(mocks.deposer).not.toHaveBeenCalled();
  });
});
