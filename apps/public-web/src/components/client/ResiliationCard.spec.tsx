import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientBailLocataire, ClientResiliation } from '../../types/locatif';
import { ResiliationCard } from './ResiliationCard';

const api = vi.hoisted(() => ({ createLocataireResiliation: vi.fn(), cancelLocataireResiliation: vi.fn() }));
vi.mock('../../api/clientPortal', () => ({
  createLocataireResiliation: api.createLocataireResiliation,
  cancelLocataireResiliation: api.cancelLocataireResiliation,
}));
vi.mock('../../contexts/auth-context-store', () => ({ useAuth: () => ({ accessToken: 'jeton' }) }));

const bail = (statut = 'actif') => ({ id: 'bail-1', statut, referenceInterne: 'B-2026-0001' }) as unknown as ClientBailLocataire;

const demande = (extra: Partial<ClientResiliation> = {}): ClientResiliation => ({
  id: 'dem-1',
  bailLocatifId: 'bail-1',
  dateDemande: '2026-10-10T10:00:00.000Z',
  dateDepartSouhaitee: '2026-11-20T00:00:00.000Z',
  motif: 'demenagement',
  message: null,
  statut: 'en_attente',
  dateDepartRetenue: null,
  reponse: null,
  traiteeLe: null,
  ...extra,
});

function afficher(demandes: ClientResiliation[], statutBail = 'actif', onChanged = vi.fn()) {
  render(<ResiliationCard bail={bail(statutBail)} demandes={demandes} preavisJours={30} onChanged={onChanged} />);
  return onChanged;
}

describe('ResiliationCard (demande de résiliation du locataire)', () => {
  beforeEach(() => {
    api.createLocataireResiliation.mockReset().mockResolvedValue({});
    api.cancelLocataireResiliation.mockReset().mockResolvedValue({});
  });

  it('propose de demander la résiliation, en rappelant le préavis habituel', () => {
    afficher([]);
    expect(screen.getByText(/30 jours/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demander la résiliation' })).toBeInTheDocument();
  });

  it('envoie la demande avec la date, le motif et le message, puis prévient la page', async () => {
    const onChanged = afficher([]);
    fireEvent.click(screen.getByRole('button', { name: 'Demander la résiliation' }));

    fireEvent.change(screen.getByLabelText(/Date de départ souhaitée/), { target: { value: '2099-01-15' } });
    fireEvent.change(screen.getByLabelText(/Motif/), { target: { value: 'achat' } });
    fireEvent.change(screen.getByLabelText(/Un mot pour MTM/), { target: { value: 'Je pars en mars' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

    await waitFor(() =>
      expect(api.createLocataireResiliation).toHaveBeenCalledWith('jeton', 'bail-1', {
        dateDepartSouhaitee: '2099-01-15',
        motif: 'achat',
        message: 'Je pars en mars',
      }),
    );
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('prévient quand la date choisie est avant la fin du préavis habituel', () => {
    afficher([]);
    fireEvent.click(screen.getByRole('button', { name: 'Demander la résiliation' }));
    const aujourdHui = new Date().toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText(/Date de départ souhaitée/), { target: { value: aujourdHui } });
    expect(screen.getByText(/avant la fin du préavis habituel/)).toBeInTheDocument();
  });

  it('une demande en attente se retire, et empêche d’en déposer une seconde', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onChanged = afficher([demande()]);
    expect(screen.getByText('En cours d’étude')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander la résiliation' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retirer ma demande' }));
    await waitFor(() => expect(api.cancelLocataireResiliation).toHaveBeenCalledWith('jeton', 'dem-1'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('une demande acceptée annonce la date de départ retenue et la réponse de MTM', () => {
    afficher(
      [demande({ statut: 'acceptee', dateDepartRetenue: '2026-11-25T00:00:00.000Z', reponse: 'État des lieux le 24.' })],
      'preavis',
    );
    expect(screen.getByText('Acceptée')).toBeInTheDocument();
    expect(screen.getByText(/votre départ est fixé au/)).toBeInTheDocument();
    expect(screen.getByText(/État des lieux le 24\./)).toBeInTheDocument();
    // Le préavis est ouvert : rien de plus à demander.
    expect(screen.queryByRole('button', { name: 'Demander la résiliation' })).not.toBeInTheDocument();
  });

  it('une demande refusée donne la raison et permet d’en refaire une', () => {
    afficher([demande({ statut: 'refusee', reponse: 'Le bail court jusqu’en juin.' })]);
    expect(screen.getByText('Refusée')).toBeInTheDocument();
    expect(screen.getByText(/Le bail court jusqu’en juin\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demander la résiliation' })).toBeInTheDocument();
  });

  it('ne montre rien pour un bail terminé sans demande', () => {
    const { container } = render(
      <ResiliationCard bail={bail('termine')} demandes={[]} preavisJours={30} onChanged={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
