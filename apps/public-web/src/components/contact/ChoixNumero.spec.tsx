import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChoixNumero } from './ChoixNumero';
import { fermerChoixNumero, ouvrirChoixNumero, surClicAppel } from './choix-numero-store';

vi.mock('../../hooks/useContentBlocks', () => ({ useContentBlocks: () => ({ data: null, loading: false, error: null }) }));

describe('ChoixNumero', () => {
  afterEach(() => act(() => fermerChoixNumero()));

  it('ne montre rien tant qu’aucun bouton d’appel n’a été touché', () => {
    render(<ChoixNumero />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('propose les trois numéros, dans l’ordre, chacun avec son lien d’appel', () => {
    render(<ChoixNumero />);
    act(() => ouvrirChoixNumero());
    const liens = screen.getAllByRole('link');
    expect(liens.map((lien) => lien.getAttribute('href'))).toEqual(['tel:+221785226565', 'tel:+221774900202', 'tel:+221783662651']);
    expect(liens[0]).toHaveTextContent('+221 78 522 65 65');
    expect(screen.getByRole('dialog', { name: 'Quel numéro appeler ?' })).toBeTruthy();
  });

  it('se referme avec la croix', async () => {
    const utilisateur = userEvent.setup();
    render(<ChoixNumero />);
    act(() => ouvrirChoixNumero());
    await utilisateur.click(screen.getAllByRole('button', { name: 'Fermer' })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un bouton « Appeler » n’appelle pas tout de suite : il ouvre le choix', () => {
    render(<ChoixNumero />);
    const evenement = { preventDefault: vi.fn() };
    act(() => surClicAppel(evenement));
    expect(evenement.preventDefault).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
