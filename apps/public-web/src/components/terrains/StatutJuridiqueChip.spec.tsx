import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatutJuridiqueChip } from './StatutJuridiqueChip';
import { TerrainStatutJuridique } from './TerrainFacts';
import type { Terrain } from '../../types/terrain';

const terrain = (statutJuridique: string, niveauVerification = 'Vérifié') => ({ statutJuridique, niveauVerification }) as unknown as Terrain;

describe('StatutJuridiqueChip', () => {
  it('le titre foncier ressort en vert', () => {
    render(<StatutJuridiqueChip statut="Titre foncier" />);
    expect(screen.getByText('Titre foncier').parentElement).toHaveClass('text-mtm-success');
  });

  it('un autre titre reconnu reste en bleu, une régularisation en cours en orange', () => {
    const { rerender } = render(<StatutJuridiqueChip statut="Bail" />);
    expect(screen.getByText('Bail').parentElement).toHaveClass('text-mtm-primary');
    rerender(<StatutJuridiqueChip statut="Régularisation en cours" />);
    expect(screen.getByText('Régularisation en cours').parentElement).toHaveClass('text-mtm-warning');
  });

  it('n’affiche rien quand le statut est vide', () => {
    const { container } = render(<StatutJuridiqueChip statut="" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TerrainStatutJuridique (encart de la fiche)', () => {
  it('donne le statut en toutes lettres, avec la vérification MTM', () => {
    render(<TerrainStatutJuridique terrain={terrain('Titre foncier', 'Vérifié')} />);
    const encart = screen.getByRole('region', { name: 'Statut juridique' });
    expect(encart).toHaveTextContent('Titre foncier');
    expect(encart).toHaveTextContent('Vérification MTM : Vérifié');
  });

  it('prend la teinte du niveau de statut', () => {
    render(<TerrainStatutJuridique terrain={terrain('Régularisation en cours', 'En cours')} />);
    expect(screen.getByRole('region', { name: 'Statut juridique' })).toHaveClass('bg-mtm-warning/5');
  });
});
