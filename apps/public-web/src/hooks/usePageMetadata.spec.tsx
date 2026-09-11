import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PAGE_METADATA_EVENT, usePageMetadata } from './usePageMetadata';

function Page({ title, description }: { title?: string; description?: string }) {
  usePageMetadata({ title, description });
  return null;
}

describe('usePageMetadata', () => {
  it('suffixe le titre avec le nom du site', () => {
    render(<Page title="Nos terrains" />);
    expect(document.title).toBe('Nos terrains · MTM Immobilier');
  });

  it('retombe sur le nom du site seul sans titre', () => {
    render(<Page />);
    expect(document.title).toBe('MTM Immobilier');
  });

  it('crée ou met à jour la méta-description', () => {
    render(<Page title="Contact" description="Première" />);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Première');

    render(<Page title="Contact" description="Seconde" />);
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Seconde');
  });

  it("émet l'événement de métadonnées une fois le titre posé", () => {
    const listener = vi.fn(() => document.title);
    window.addEventListener(PAGE_METADATA_EVENT, listener);

    render(<Page title="À propos" />);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveReturnedWith('À propos · MTM Immobilier');
    window.removeEventListener(PAGE_METADATA_EVENT, listener);
  });
});
