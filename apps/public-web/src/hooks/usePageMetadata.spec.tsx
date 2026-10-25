import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PAGE_METADATA_EVENT, usePageMetadata } from './usePageMetadata';

function Page(props: Parameters<typeof usePageMetadata>[0]) {
  usePageMetadata(props);
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

  it("pose l'adresse canonique sans paramètres et l'aperçu de partage", () => {
    window.history.pushState({}, '', '/terrains/abc/?utm=x#haut');
    render(<Page title="Villa" description="Belle villa" image="https://res.cloudinary.com/x/v.jpg" />);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.mtm-immobilier.com/terrains/abc',
    );
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://res.cloudinary.com/x/v.jpg',
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Villa · MTM Immobilier');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
  });

  it('demande de ne pas indexer une page privée', () => {
    render(<Page title="Mes favoris" noindex />);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('ajoute les données structurées puis les retire en quittant la page', () => {
    const { unmount } = render(<Page title="Bien" jsonLd={{ '@type': 'Product', name: 'Villa' }} />);
    expect(document.querySelector('script[data-page-jsonld]')?.textContent).toContain('"Product"');
    unmount();
    expect(document.querySelector('script[data-page-jsonld]')).toBeNull();
  });
});
