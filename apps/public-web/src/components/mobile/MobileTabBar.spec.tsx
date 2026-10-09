import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MobileTabBar } from './MobileTabBar';

function renderBar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar />
    </MemoryRouter>,
  );
}

describe('MobileTabBar', () => {
  it('reprend les activités de MTM : accueil, biens, locations, services, à propos', () => {
    renderBar();
    const barre = screen.getByRole('navigation', { name: /application/i });
    const onglets = Array.from(barre.querySelectorAll('li > a, li > button'));
    expect(onglets.map((onglet) => onglet.textContent)).toEqual([
      'Accueil',
      'Biens',
      'Locations',
      'Services',
      'À propos',
    ]);
  });

  it('mène aux bonnes pages', () => {
    renderBar();
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Biens' })).toHaveAttribute('href', '/terrains');
    expect(screen.getByRole('link', { name: 'Locations' })).toHaveAttribute('href', '/locations');
    expect(screen.getByRole('link', { name: 'À propos' })).toHaveAttribute('href', '/a-propos');
  });

  it('l’onglet À propos est actif sur sa page, et seulement là', () => {
    renderBar('/a-propos');
    expect(screen.getByRole('link', { name: 'À propos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute('aria-current');
  });

  it('marque l’onglet de l’écran courant, fiches de détail comprises', () => {
    renderBar('/locations');
    expect(screen.getByRole('link', { name: 'Locations' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Biens' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute('aria-current');
  });

  it('l’onglet Biens reste actif sur la fiche d’un bien', () => {
    renderBar('/terrains/abc');
    expect(screen.getByRole('link', { name: 'Biens' })).toHaveAttribute('aria-current', 'page');
  });

  describe('Services', () => {
    it('ouvre la liste des services, au lieu de mener à une seule page', () => {
      renderBar();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Services' }));

      const feuille = screen.getByRole('dialog', { name: 'Nos services' });
      expect(within(feuille).getByRole('link', { name: /Gestion locative/ })).toHaveAttribute('href', '/gestion-locative');
      expect(within(feuille).getByRole('link', { name: /Construction/ })).toHaveAttribute('href', '/construction');
      expect(within(feuille).getByRole('link', { name: /Démarches administratives/ })).toHaveAttribute(
        'href',
        '/demarches-administratives',
      );
    });

    it('se referme avec Échap', () => {
      renderBar();
      fireEvent.click(screen.getByRole('button', { name: 'Services' }));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('se referme après le choix d’un service', () => {
      renderBar();
      fireEvent.click(screen.getByRole('button', { name: 'Services' }));
      fireEvent.click(screen.getByRole('link', { name: /Construction/ }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('est marqué actif sur la page d’un service', () => {
      renderBar('/gestion-locative');
      const onglet = screen.getByRole('button', { name: 'Services' });
      // Le trait sous l'onglet est visible (pleine échelle) sur un service.
      expect(onglet.querySelector('span[aria-hidden="true"]')).toHaveClass('scale-x-100');
    });

    it('n’est pas actif sur une autre page', () => {
      renderBar('/locations');
      const onglet = screen.getByRole('button', { name: 'Services' });
      expect(onglet.querySelector('span[aria-hidden="true"]')).toHaveClass('scale-x-0');
    });
  });
});
