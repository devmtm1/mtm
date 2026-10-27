import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Location } from '../../types/location';
import { FeaturedLocationsSection } from './FeaturedLocationsSection';

const etat = vi.hoisted(() => ({
  items: [] as unknown[],
  filtres: undefined as unknown,
}));

vi.mock('../../hooks/useLocations', () => ({
  useLocationsCatalog: (filtres: unknown) => {
    etat.filtres = filtres;
    return { data: { items: etat.items, total: etat.items.length, page: 1, pageSize: 6 }, loading: false, error: null };
  },
}));
vi.mock('../mobile/FavoriteButton', () => ({ FavoriteButton: () => null }));

function annonce(numero: number): Location {
  return {
    id: `loc-${numero}`,
    referenceInterne: `L-2026-000${numero}`,
    type: 'appartement',
    titre: `Annonce ${numero}`,
    description: null,
    commune: 'Dakar',
    region: 'Dakar',
    superficie: 60,
    loyerMensuel: 250000,
    charges: null,
    moisCaution: null,
    montantCaution: null,
    nombrePieces: 3,
    nombreChambres: 2,
    nombreSallesEau: 1,
    meuble: false,
    equipements: [],
    latitude: null,
    longitude: null,
    disponibleLe: null,
    misEnAvant: true,
    publieLe: null,
    medias: [],
    modeLocation: 'longue_duree',
    prixNuit: null,
    fraisMenage: null,
    nuitsMinimum: 1,
    capaciteVoyageurs: null,
    heureArrivee: null,
    heureDepart: null,
  };
}

function afficher() {
  render(
    <MemoryRouter>
      <FeaturedLocationsSection />
    </MemoryRouter>,
  );
}

describe('FeaturedLocationsSection', () => {
  beforeEach(() => {
    etat.items = [];
    etat.filtres = undefined;
  });

  it('ne demande que les annonces mises à la une', () => {
    etat.items = [annonce(1), annonce(2), annonce(3)];
    afficher();
    expect(etat.filtres).toMatchObject({ misEnAvant: true });
    expect(screen.getByRole('heading', { name: 'Locations à la une' })).toBeTruthy();
  });

  it('n’affiche que des rangées complètes de trois, sans étiquette « À la une » redondante', () => {
    etat.items = [annonce(1), annonce(2), annonce(3), annonce(4)];
    afficher();
    expect(screen.getAllByRole('link', { name: /Annonce/ })).toHaveLength(3);
    // Un seul « À la une » : le titre de la section, pas une étiquette sur chaque carte.
    expect(screen.getAllByText('À la une')).toHaveLength(1);
  });

  it('disparaît quand aucune annonce n’est à la une', () => {
    etat.items = [];
    afficher();
    expect(screen.queryByRole('heading', { name: 'Locations à la une' })).toBeNull();
  });
});
