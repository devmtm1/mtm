import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { LotPublic, ProgrammePublic } from '../../api/programmes';
import { LotsExplorer } from './LotsExplorer';
import { ProgrammeCard } from './ProgrammeCard';

const programme: ProgrammePublic = {
  id: 'p1',
  reference: 'P-2026-0001',
  nom: 'Cité des Jardins',
  region: 'Thiès',
  commune: 'Thiès',
  localisationDetail: null,
  description: null,
  statutJuridique: 'Titre foncier',
  niveauVerification: 'Vérifié',
  couverture: null,
  lotsTotal: 6,
  lotsDisponibles: 4,
  lotsReserves: 1,
  lotsVendus: 1,
  prixMin: 10_000_000,
  prixMax: 12_000_000,
  superficieMin: 250,
  superficieMax: 300,
  uniteSuperficie: 'm²',
};

const lot = (surcharge: Partial<LotPublic>): LotPublic => ({
  id: 'l',
  numeroLot: 'A-01',
  statut: 'Disponible',
  superficie: 250,
  uniteSuperficie: 'm²',
  categorieLot: null,
  prixPublic: 10_000_000,
  modalitePaiement: null,
  dureeMoratoireMois: null,
  acompteMontant: null,
  photo: null,
  ...surcharge,
});

describe('ProgrammeCard', () => {
  const rendu = (p: ProgrammePublic) =>
    render(
      <MemoryRouter>
        <ProgrammeCard programme={p} />
      </MemoryRouter>,
    );

  it('renvoie à la page du lotissement et dit ce qu’il reste', () => {
    rendu(programme);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/lotissements/p1');
    expect(screen.getByRole('heading', { name: 'Cité des Jardins' })).toBeInTheDocument();
    expect(screen.getByText('4 lots disponibles sur 6')).toBeInTheDocument();
    expect(screen.getByText('Titre foncier')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '33 % des lots déjà réservés ou vendus' })).toBeInTheDocument();
  });

  it('annonce le dernier lot', () => {
    rendu({ ...programme, lotsDisponibles: 1, lotsReserves: 3, lotsVendus: 2 });
    expect(screen.getByText('Dernier lot')).toBeInTheDocument();
    expect(screen.getByText('Dernier lot disponible')).toBeInTheDocument();
  });
});

describe('LotsExplorer', () => {
  const lots = [
    lot({ id: 'a', numeroLot: 'A-01', categorieLot: { nom: 'Angle' }, prixPublic: 12_000_000 }),
    lot({ id: 'b', numeroLot: 'A-02' }),
    lot({ id: 'c', numeroLot: 'A-03', statut: 'Réservé', prixPublic: null }),
    lot({ id: 'd', numeroLot: 'A-04', statut: 'Vendu', prixPublic: null }),
  ];
  const categories = [{ nom: 'Angle', lotsDisponibles: 1, prixMin: 12_000_000, prixMax: 12_000_000 }];
  // La vue par défaut est celle des tuiles ; la plupart des cas se vérifient en liste, où chaque lot a ses actions.
  const rendu = (onVisite = vi.fn(), vue: 'liste' | 'tuiles' = 'liste') => {
    render(
      <MemoryRouter>
        <LotsExplorer lots={lots} categories={categories} onVisite={onVisite} />
      </MemoryRouter>,
    );
    if (vue === 'liste') fireEvent.click(screen.getByRole('button', { name: 'Afficher les lots en liste' }));
  };

  it('montre d’abord les lots à vendre, et propose de voir les autres', () => {
    rendu();
    expect(screen.getByText('Lot A-01')).toBeInTheDocument();
    expect(screen.getByText('Lot A-02')).toBeInTheDocument();
    expect(screen.queryByText('Lot A-03')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Voir aussi les 2 lots réservés ou vendus/ }));
    expect(screen.getByText('Lot A-03')).toBeInTheDocument();
    expect(screen.getByText('Vendu')).toBeInTheDocument();
    expect(screen.getByText('Réservé')).toBeInTheDocument();
  });

  it('un lot réservé ou vendu n’a ni prix ni action', () => {
    rendu();
    fireEvent.click(screen.getByRole('button', { name: /Voir aussi/ }));
    const reserve = screen.getByText('Lot A-03').closest('li') as HTMLElement;
    expect(within(reserve).queryByRole('button')).not.toBeInTheDocument();
    expect(within(reserve).queryByText(/FCFA/)).not.toBeInTheDocument();
  });

  it('filtre par catégorie', () => {
    rendu();
    fireEvent.click(screen.getByRole('button', { name: /Angle/ }));
    expect(screen.getByText('Lot A-01')).toBeInTheDocument();
    expect(screen.queryByText('Lot A-02')).not.toBeInTheDocument();
  });

  it('demande une visite du lot choisi', () => {
    const onVisite = vi.fn();
    rendu(onVisite);
    const carte = screen.getByText('Lot A-02').closest('li') as HTMLElement;
    fireEvent.click(within(carte).getByRole('button', { name: /Visiter/ }));
    expect(onVisite).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });

  it('bascule en tuiles régulières : les lots libres mènent à leur fiche, les autres sont grisés', () => {
    rendu(vi.fn(), 'tuiles');
    expect(screen.getByRole('link', { name: /Lot A-02/ })).toHaveAttribute('href', '/terrains/b');
    expect(screen.queryByRole('link', { name: /Lot A-03/ })).not.toBeInTheDocument();
  });
});
