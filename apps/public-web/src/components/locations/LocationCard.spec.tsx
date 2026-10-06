import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LocationCard } from './LocationCard';
import type { Location } from '../../types/location';

const base: Location = {
  id: 'loc-1',
  referenceInterne: 'LOC-2026-0001',
  type: 'appartement',
  titre: 'Appartement lumineux aux Almadies',
  description: null,
  commune: 'Ngor',
  region: 'Dakar',
  superficie: 85,
  loyerMensuel: 350000,
  charges: 25000,
  moisCaution: 2,
  montantCaution: 700000,
  nombrePieces: 4,
  nombreChambres: 3,
  nombreSallesEau: 2,
  meuble: true,
  equipements: [],
  latitude: null,
  longitude: null,
  disponibleLe: null,
  misEnAvant: true,
  publieLe: null,
  medias: [
    { id: 'm1', type: 'photo', title: null, secureUrl: 'https://img.test/1.jpg' },
    { id: 'm2', type: 'photo', title: null, secureUrl: 'https://img.test/2.jpg' },
  ],
};

function renderCard(location: Location) {
  return render(
    <MemoryRouter>
      <LocationCard location={location} />
    </MemoryRouter>,
  );
}

describe('LocationCard', () => {
  it('affiche le loyer, le titre, le lieu et les chiffres clés', () => {
    renderCard(base);
    expect(screen.getByText(/350\s000 FCFA/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Appartement lumineux aux Almadies' })).toBeInTheDocument();
    expect(screen.getByText('Ngor, Dakar')).toBeInTheDocument();
    expect(screen.getByText('3 chambres')).toBeInTheDocument();
    expect(screen.getByText('2 salles d’eau')).toBeInTheDocument();
    expect(screen.getByText('Disponible immédiatement')).toBeInTheDocument();
  });

  it('mène à la fiche de l’annonce', () => {
    renderCard(base);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/locations/loc-1');
  });

  it('signale « À la une », « Meublé » et le nombre de photos', () => {
    renderCard(base);
    expect(screen.getByText('À la une')).toBeInTheDocument();
    expect(screen.getByText('Meublé')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('reste lisible sans titre, sans photo et sans loyer', () => {
    renderCard({
      ...base,
      titre: null,
      medias: [],
      loyerMensuel: null,
      meuble: false,
      misEnAvant: false,
      nombreChambres: null,
      nombreSallesEau: null,
      superficie: null,
    });
    expect(screen.getByRole('heading', { name: 'Appartement à Ngor' })).toBeInTheDocument();
    expect(screen.getByText('Loyer sur demande')).toBeInTheDocument();
    expect(screen.queryByText('À la une')).not.toBeInTheDocument();
    expect(screen.queryByText('Meublé')).not.toBeInTheDocument();
  });
});
