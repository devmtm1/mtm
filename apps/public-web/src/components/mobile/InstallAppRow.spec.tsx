import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallAppRow } from './InstallAppRow';

const pwa = vi.hoisted(() => ({ state: 'unavailable', install: vi.fn() }));
vi.mock('../../hooks/usePwaInstall', () => ({ usePwaInstall: () => pwa }));

describe('InstallAppRow', () => {
  beforeEach(() => {
    pwa.state = 'unavailable';
    pwa.install.mockReset();
  });

  it.each(['unavailable', 'installed'])('ne montre rien quand l’état est « %s »', (state) => {
    pwa.state = state;
    const { container } = render(<InstallAppRow />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lance l’installation quand le navigateur la propose', () => {
    pwa.state = 'available';
    render(<InstallAppRow />);
    fireEvent.click(screen.getByRole('button', { name: /Installer l’application/ }));
    expect(pwa.install).toHaveBeenCalledOnce();
  });

  it('explique la marche à suivre sur iPhone', () => {
    pwa.state = 'ios';
    render(<InstallAppRow />);
    expect(screen.queryByText(/Sur l’écran d’accueil/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Installer l’application/ }));
    expect(screen.getByText(/Sur l’écran d’accueil/)).toBeInTheDocument();
  });
});
