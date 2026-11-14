import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FlipCard } from './FlipCard';

function Exemple({ surAction = () => undefined }: { surAction?: () => void }) {
  const [retournee, setRetournee] = useState(false);
  return (
    <FlipCard
      titre="Recherche de locataires"
      retournee={retournee}
      onBasculer={setRetournee}
      recto={<span>Résumé du recto</span>}
      verso={<p>Détail complet</p>}
      actions={
        <button type="button" onClick={surAction}>
          Confier mon bien
        </button>
      }
    />
  );
}

describe('FlipCard', () => {
  it('commence sur le recto : le verso est retiré du clavier et des lecteurs d’écran', () => {
    render(<Exemple />);
    const recto = screen.getByRole('button', { name: 'Recherche de locataires : voir les détails' });
    expect(recto.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Confier mon bien' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull();
  });

  it('se retourne au clic, donne le focus à « Retour », et « Retour » ramène au recto', async () => {
    render(<Exemple />);
    await userEvent.click(screen.getByRole('button', { name: /voir les détails/ }));
    const retour = screen.getByRole('button', { name: 'Retour' });
    expect(document.activeElement).toBe(retour);
    expect(screen.getByRole('region', { name: 'Détails : Recherche de locataires' })).toBeTruthy();
    await userEvent.click(retour);
    expect(screen.getByRole('button', { name: /voir les détails/ }).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /voir les détails/ }));
  });

  it('se retourne aussi au clavier, et Échap revient au recto', async () => {
    render(<Exemple />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Retour' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull();
  });

  it('un bouton d’action du verso agit sans retourner la carte', async () => {
    const surAction = vi.fn();
    render(<Exemple surAction={surAction} />);
    await userEvent.click(screen.getByRole('button', { name: /voir les détails/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confier mon bien' }));
    expect(surAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Retour' })).toBeTruthy();
  });
});
