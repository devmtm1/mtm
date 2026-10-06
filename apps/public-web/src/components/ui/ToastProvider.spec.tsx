import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast } from './toast-store';

function Declencheur({ message, tone }: { message: string; tone?: 'success' | 'error' }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show(message, tone)}>
      go
    </button>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('annonce la confirmation puis la retire d’elle-même', () => {
    render(
      <ToastProvider>
        <Declencheur message="Demande envoyée" />
      </ToastProvider>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByRole('status')).toHaveTextContent('Demande envoyée');
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('une erreur est annoncée comme une alerte', () => {
    render(
      <ToastProvider>
        <Declencheur message="Envoi impossible" tone="error" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByRole('alert')).toHaveTextContent('Envoi impossible');
  });

  it('la nouvelle confirmation remplace l’ancienne', () => {
    render(
      <ToastProvider>
        <Declencheur message="Une seule à la fois" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    fireEvent.click(screen.getByText('go'));
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('sans fournisseur, l’appel ne plante pas', () => {
    render(<Declencheur message="x" />);
    expect(() => fireEvent.click(screen.getByText('go'))).not.toThrow();
  });
});
