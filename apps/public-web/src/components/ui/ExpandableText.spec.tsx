import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExpandableText } from './ExpandableText';

describe('ExpandableText', () => {
  it('n’ajoute aucun bouton à un texte court', () => {
    render(<ExpandableText text="Une courte description." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('replie un texte long et le déplie à la demande', () => {
    render(<ExpandableText text={'Une phrase assez longue. '.repeat(20)} />);
    const bouton = screen.getByRole('button', { name: 'Lire la suite' });
    expect(bouton).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('p')).toHaveClass('line-clamp-5');

    fireEvent.click(bouton);
    expect(screen.getByRole('button', { name: 'Réduire' })).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('p')).not.toHaveClass('line-clamp-5');
  });

  it('considère comme long un texte de nombreux paragraphes, même court', () => {
    render(<ExpandableText text={['a', 'b', 'c', 'd', 'e', 'f'].join('\n')} />);
    expect(screen.getByRole('button', { name: 'Lire la suite' })).toBeInTheDocument();
  });
});
