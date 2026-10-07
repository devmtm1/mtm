import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommentRegler } from './CommentRegler';

const contenus = vi.hoisted(() => ({ blocs: [] as { key: string; content: string }[] }));

vi.mock('../../hooks/useContentBlocks', () => ({ useContentBlocks: () => ({ data: contenus.blocs }) }));
vi.mock('../../hooks/useSiteContact', () => ({
  toTelHref: (telephone: string) => `tel:${telephone.replace(/\s/g, '')}`,
  useSiteContact: () => ({ whatsapp: '221780000000', telephone: '+221 78 000 00 00' }),
}));

describe('CommentRegler', () => {
  it('sans texte administré, donne des consignes génériques sans inventer de coordonnées', () => {
    contenus.blocs = [];
    render(<CommentRegler reference="mon bail BAIL-1" montant={325000} />);
    expect(screen.getByText(/Votre conseiller vous communique les coordonnées de règlement/)).toBeInTheDocument();
  });

  it('affiche les consignes saisies au back-office, une par ligne', () => {
    contenus.blocs = [{ key: 'client.paiement', content: 'Orange Money : 77 000 00 00\nVirement : SN08 0000\n' }];
    render(<CommentRegler reference="mon dossier VTE-1" />);
    expect(screen.getByText('Orange Money : 77 000 00 00')).toBeInTheDocument();
    expect(screen.getByText('Virement : SN08 0000')).toBeInTheDocument();
    expect(screen.queryByText(/Votre conseiller vous communique/)).not.toBeInTheDocument();
  });

  it('le bouton prévient MTM sur WhatsApp avec le montant et la référence déjà écrits', () => {
    contenus.blocs = [];
    render(<CommentRegler reference="mon bail BAIL-1" montant={325000} />);
    const lien = screen.getByRole('link', { name: /prévenir MTM/ });
    const href = lien.getAttribute('href') ?? '';
    expect(href.startsWith('https://wa.me/221780000000?text=')).toBe(true);
    const texte = decodeURIComponent(href.split('text=')[1]);
    expect(texte).toContain('325 000 FCFA');
    expect(texte).toContain('mon bail BAIL-1');
    expect(screen.getByRole('link', { name: /Appeler mon conseiller/ })).toHaveAttribute('href', 'tel:+221780000000');
  });
});
