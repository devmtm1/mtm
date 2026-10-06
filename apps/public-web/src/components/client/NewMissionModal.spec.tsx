import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewMissionModal } from './NewMissionModal';

const api = vi.hoisted(() => ({ createClientMission: vi.fn() }));

vi.mock('../../api/clientPortal', () => ({ createClientMission: api.createClientMission }));
vi.mock('../../contexts/auth-context-store', () => ({ useAuth: () => ({ accessToken: 'jeton' }) }));
// La recherche de bien n'est pas l'objet de ces tests : un champ simple suffit.
vi.mock('./TerrainPicker', () => ({ TerrainPicker: () => <input aria-label="Recherche de bien" readOnly /> }));

function ouvrir() {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  render(<NewMissionModal onClose={onClose} onCreated={onCreated} />);
  return { onClose, onCreated };
}

describe('NewMissionModal (assistant en trois étapes)', () => {
  beforeEach(() => api.createClientMission.mockReset());

  it('commence par le besoin, et avance étape par étape', () => {
    ouvrir();
    expect(screen.getByText(/Étape 1 sur 3 · Votre besoin/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByText(/Étape 2 sur 3 · Le bien/)).toBeInTheDocument();
  });

  it('exige de situer le bien avant de continuer', () => {
    ouvrir();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Indiquez le bien concerné');
    expect(screen.getByText(/Étape 2 sur 3/)).toBeInTheDocument();
  });

  it('permet de revenir en arrière sans perdre la saisie', () => {
    ouvrir();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.change(screen.getByLabelText('Où se trouve le bien ?'), { target: { value: 'Saly, près du rond-point' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByLabelText('Où se trouve le bien ?')).toHaveValue('Saly, près du rond-point');
  });

  it('envoie la demande à la dernière étape, puis se referme', async () => {
    api.createClientMission.mockResolvedValue({});
    const { onClose, onCreated } = ouvrir();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.change(screen.getByLabelText('Où se trouve le bien ?'), { target: { value: 'Saly' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.change(screen.getByLabelText(/Ce que vous voulez vérifier/), {
      target: { value: 'Vérifier que le titre est authentique.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.createClientMission).toHaveBeenCalledWith(
      'jeton',
      expect.objectContaining({ typeVerification: 'verification_fonciere', localisation: 'Saly' }),
    );
    expect(onCreated).toHaveBeenCalled();
  });

  it('refuse un objectif trop court', () => {
    ouvrir();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.change(screen.getByLabelText('Où se trouve le bien ?'), { target: { value: 'Saly' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.change(screen.getByLabelText(/Ce que vous voulez vérifier/), { target: { value: 'court' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(screen.getByRole('alert')).toHaveTextContent('10 caractères minimum');
    expect(api.createClientMission).not.toHaveBeenCalled();
  });
});
