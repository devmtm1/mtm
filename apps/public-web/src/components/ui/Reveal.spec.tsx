import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from './Reveal';

/** Remplace matchMedia pour simuler la préférence « mouvement réduit ». */
function simulerMouvementReduit(reduit: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: reduit && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const matchMediaInitial = window.matchMedia;
const observerInitial = window.IntersectionObserver;

/**
 * Le contenu de ces sections est le fonds de commerce du site : une animation
 * qui ne part pas ne doit jamais le laisser invisible. Ces tests portent sur
 * les trois chemins où cela pourrait arriver.
 */
describe('Reveal', () => {
  beforeEach(() => {
    simulerMouvementReduit(false);
  });

  afterEach(() => {
    window.matchMedia = matchMediaInitial;
    window.IntersectionObserver = observerInitial;
    vi.useRealTimers();
  });

  it('affiche toujours son contenu dans le document', () => {
    render(
      <Reveal>
        <p>Nos biens disponibles</p>
      </Reveal>,
    );

    expect(screen.getByText('Nos biens disponibles')).toBeInTheDocument();
  });

  it('se montre d’emblée quand le visiteur a demandé moins de mouvement', () => {
    simulerMouvementReduit(true);

    render(
      <Reveal>
        <p>Contenu</p>
      </Reveal>,
    );

    expect(screen.getByText('Contenu').parentElement).toHaveClass('opacity-100');
  });

  it('se montre d’emblée si le navigateur ne sait pas observer le défilement', () => {
    // @ts-expect-error — on simule un navigateur sans IntersectionObserver.
    delete window.IntersectionObserver;

    render(
      <Reveal>
        <p>Contenu</p>
      </Reveal>,
    );

    expect(screen.getByText('Contenu').parentElement).toHaveClass('opacity-100');
  });

  it('se révèle au bout de deux secondes si l’observateur ne signale rien', () => {
    vi.useFakeTimers();
    // Un observateur muet : il n'appellera jamais son rappel.
    window.IntersectionObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    } as unknown as typeof IntersectionObserver;

    render(
      <Reveal>
        <p>Contenu</p>
      </Reveal>,
    );

    expect(screen.getByText('Contenu').parentElement).toHaveClass('opacity-0');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Contenu').parentElement).toHaveClass('opacity-100');
  });
});
