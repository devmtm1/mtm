import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { Location } from '../../types/location';
import { SejourBooking } from './SejourBooking';

const api = vi.hoisted(() => ({ fetchDisponibilites: vi.fn(), postDemandeSejour: vi.fn() }));
vi.mock('../../api/locations', () => ({
  fetchDisponibilites: api.fetchDisponibilites,
  postDemandeSejour: api.postDemandeSejour,
}));

const location = {
  id: 'loc-1',
  modeLocation: 'courte_duree',
  prixNuit: 45000,
  fraisMenage: 10000,
  montantCaution: 100000,
  nuitsMinimum: 2,
  capaciteVoyageurs: 4,
  heureArrivee: '15:00',
  heureDepart: '11:00',
} as unknown as Location;

/** Un jour décalé de `jours` par rapport à aujourd'hui, au format AAAA-MM-JJ. */
const jour = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);

function choisirDates(arrivee: string, depart: string) {
  fireEvent.change(screen.getByLabelText('Arrivée'), { target: { value: arrivee } });
  fireEvent.change(screen.getByLabelText('Départ'), { target: { value: depart } });
}

describe('SejourBooking (demande de séjour de courte durée)', () => {
  beforeEach(() => {
    api.fetchDisponibilites.mockReset().mockResolvedValue([{ debut: jour(20), fin: jour(23) }]);
    api.postDemandeSejour.mockReset();
  });

  it('montre les nuits déjà prises', async () => {
    render(<SejourBooking location={location} />);
    expect(await screen.findByText('Déjà réservé')).toBeInTheDocument();
  });

  it('estime le séjour dès que les dates sont valables, et révèle les coordonnées', async () => {
    render(<SejourBooking location={location} />);
    await screen.findByText('Déjà réservé');
    expect(screen.queryByLabelText(/Téléphone/)).not.toBeInTheDocument();

    choisirDates(jour(5), jour(8));
    expect(screen.getByText(/Total du séjour/)).toBeInTheDocument();
    expect(screen.getByText(/145\s000 FCFA/)).toBeInTheDocument();
    expect(screen.getByText(/Caution de 100\s000 FCFA/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Téléphone/)).toBeInTheDocument();
  });

  it('refuse des dates qui recouvrent une période prise, sans rien envoyer', async () => {
    render(<SejourBooking location={location} />);
    await screen.findByText('Déjà réservé');
    choisirDates(jour(21), jour(25));
    expect(screen.getByRole('alert')).toHaveTextContent(/Ces dates ne sont pas libres/);
    expect(screen.queryByRole('button', { name: 'Envoyer ma demande' })).not.toBeInTheDocument();
    expect(api.postDemandeSejour).not.toHaveBeenCalled();
  });

  it('refuse une durée trop courte', async () => {
    render(<SejourBooking location={location} />);
    await screen.findByText('Déjà réservé');
    choisirDates(jour(5), jour(6));
    expect(screen.getByRole('alert')).toHaveTextContent('2 nuits minimum');
  });

  it('exige un nom et un téléphone, puis confirme l’envoi avec la référence', async () => {
    api.postDemandeSejour.mockResolvedValue({
      reference: 'SJ-2026-0007',
      nuits: 3,
      prixNuit: 45000,
      fraisMenage: 10000,
      montantTotal: 145000,
      cautionMontant: 100000,
    });
    render(<SejourBooking location={location} />);
    await screen.findByText('Déjà réservé');
    choisirDates(jour(5), jour(8));

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(screen.getByRole('alert')).toHaveTextContent('prénom et votre nom');

    fireEvent.change(screen.getByLabelText(/Prénom/), { target: { value: 'Marc' } });
    fireEvent.change(screen.getByLabelText(/^Nom\s*\*?$/), { target: { value: 'Dupont' } });
    fireEvent.change(screen.getByLabelText(/Téléphone/), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(screen.getByRole('alert')).toHaveTextContent('numéro de téléphone');

    fireEvent.change(screen.getByLabelText(/Téléphone/), { target: { value: '+33 6 99 88 77 66' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

    expect(await screen.findByText('Demande envoyée')).toBeInTheDocument();
    expect(screen.getByText('SJ-2026-0007')).toBeInTheDocument();
    expect(screen.getByText(/Aucun paiement ne vous a été demandé/)).toBeInTheDocument();
    expect(api.postDemandeSejour).toHaveBeenCalledWith(
      'loc-1',
      expect.objectContaining({ prenom: 'Marc', nom: 'Dupont', dateArrivee: jour(5), dateDepart: jour(8), nombreVoyageurs: 1 }),
    );
  });

  it('affiche l’erreur du serveur et relit le calendrier quand les dates ont été prises entre-temps', async () => {
    api.postDemandeSejour.mockRejectedValue(new ApiError(409, 'Ces dates ne sont plus disponibles : choisissez-en d’autres.'));
    render(<SejourBooking location={location} />);
    await screen.findByText('Déjà réservé');
    choisirDates(jour(5), jour(8));
    fireEvent.change(screen.getByLabelText(/Prénom/), { target: { value: 'Marc' } });
    fireEvent.change(screen.getByLabelText(/^Nom\s*\*?$/), { target: { value: 'Dupont' } });
    fireEvent.change(screen.getByLabelText(/Téléphone/), { target: { value: '+33699887766' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('ne sont plus disponibles'));
    expect(api.fetchDisponibilites).toHaveBeenCalledTimes(2);
  });
});
