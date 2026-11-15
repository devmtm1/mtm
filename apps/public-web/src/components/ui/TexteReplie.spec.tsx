import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TexteReplie } from './TexteReplie';

const PARAGRAPHES = ['Premier paragraphe.', 'Deuxième paragraphe.', 'Troisième paragraphe.'];

describe('TexteReplie', () => {
  it('montre les premiers paragraphes et cache la suite derrière « Lire la suite »', () => {
    render(<TexteReplie paragraphes={PARAGRAPHES} visibles={1} />);
    expect(screen.getByText('Premier paragraphe.')).toBeVisible();
    expect(screen.getByText('Deuxième paragraphe.')).not.toBeVisible();
    expect(screen.getByRole('button', { name: /Lire la suite/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('déplie puis replie le texte', async () => {
    render(<TexteReplie paragraphes={PARAGRAPHES} visibles={1} />);
    await userEvent.click(screen.getByRole('button', { name: /Lire la suite/ }));
    expect(screen.getByText('Troisième paragraphe.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Réduire/ })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Réduire/ }));
    expect(screen.getByText('Troisième paragraphe.')).not.toBeVisible();
  });

  it('n’affiche aucun bouton quand tout est déjà visible', () => {
    render(<TexteReplie paragraphes={PARAGRAPHES} visibles={3} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
