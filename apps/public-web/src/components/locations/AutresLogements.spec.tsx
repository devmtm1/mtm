import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AutresLogements } from './AutresLogements';

const logement = {
  id: 'b2',
  titre: null,
  type: 'appartement',
  numeroLot: 'A2',
  modeLocation: 'longue_duree' as const,
  nombreChambres: 2,
  loyerMensuel: 250000,
  prixNuit: null,
};

describe('AutresLogements', () => {
  it('propose les logements voisins, chacun vers sa propre annonce', () => {
    render(
      <MemoryRouter>
        <AutresLogements
          immeuble={{
            nom: 'Villa Fall',
            type: 'villa',
            autresLogements: [logement],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Villa Fall/ })).toBeTruthy();
    const lien = screen.getByRole('link', { name: /A2/ });
    expect(lien.getAttribute('href')).toContain('b2');
    expect(lien.textContent).toContain('2 chambres');
  });

  it('n’affiche rien quand il ne reste aucun autre logement libre', () => {
    const { container } = render(
      <MemoryRouter>
        <AutresLogements
          immeuble={{ nom: 'Villa Fall', type: 'villa', autresLogements: [] }}
        />
      </MemoryRouter>,
    );
    expect(container.textContent).toBe('');
  });
});
