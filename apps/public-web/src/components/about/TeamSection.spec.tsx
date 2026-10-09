import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeamSection } from './TeamSection';
import { initiales } from '../../utils/initiales';
import type { TeamPage } from '../../types/team';

const equipe: TeamPage = {
  directeur: {
    id: 'd',
    nom: 'Awa Diop',
    poste: 'Directrice générale',
    message: 'Première ligne.\n\nSeconde ligne.',
    imageUrl: null,
  },
  groupe: { id: 'g', legende: 'L’équipe MTM', imageUrl: null },
  membres: [
    { id: 'm1', nom: 'Cheikh Ba', poste: 'Conseiller commercial', message: null, imageUrl: null },
    {
      id: 'm2',
      nom: 'Fatou Sow',
      poste: null,
      message: null,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/mtm/equipe/fatou.jpg',
    },
  ],
};

describe('initiales', () => {
  it.each([
    ['Awa Diop', 'AD'],
    ['Prénom NOM', 'PN'],
    ['Cheikh Ahmadou Bamba Mbacké', 'CM'],
    ['Madonna', 'M'],
    ['  ', ''],
  ])('« %s » donne « %s »', (nom, attendu) => {
    expect(initiales(nom)).toBe(attendu);
  });
});

describe('TeamSection', () => {
  it('ne rend rien tant que rien n’est publié', () => {
    const { container, rerender } = render(<TeamSection team={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<TeamSection team={{ directeur: null, groupe: null, membres: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('affiche le mot du directeur, un paragraphe par ligne, avec son nom et son poste', () => {
    render(<TeamSection team={equipe} />);
    expect(screen.getByRole('heading', { name: 'Le mot du directeur' })).toBeInTheDocument();
    expect(screen.getByText('Première ligne.')).toBeInTheDocument();
    expect(screen.getByText('Seconde ligne.')).toBeInTheDocument();
    expect(screen.getByText('Awa Diop', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Directrice générale')).toBeInTheDocument();
  });

  it('montre les initiales quand une photo manque, et la photo quand elle existe', () => {
    render(<TeamSection team={equipe} />);
    expect(screen.getByText('CB')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Cheikh Ba' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Fatou Sow' })).toHaveAttribute(
      'src',
      expect.stringContaining('fatou.jpg'),
    );
  });

  it('présente la photo de groupe avec sa légende et la liste des membres', () => {
    render(<TeamSection team={equipe} />);
    expect(screen.getByRole('heading', { name: 'Notre équipe' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'L’équipe MTM' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('omet les blocs absents sans casser la page', () => {
    render(<TeamSection team={{ ...equipe, directeur: null, groupe: null }} />);
    expect(screen.queryByText('Le mot du directeur', { selector: 'span' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'L’équipe MTM' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Notre équipe' })).toBeInTheDocument();
  });
});
