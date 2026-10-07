import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClientDemandesList } from './ClientDemandesSection';
import type { ClientDemandes } from '../../types/clientPortal';

const message = (extra: Record<string, unknown>) => ({
  id: 'm1',
  sujet: 'Titre foncier',
  message: 'Le titre est-il vérifié ?',
  createdAt: '2026-10-04T10:00:00Z',
  traite: false,
  reponse: null,
  reponduLe: null,
  terrain: null,
  ...extra,
});

const donnees = (messages: ReturnType<typeof message>[]): ClientDemandes =>
  ({ messages, reservations: [] }) as unknown as ClientDemandes;

describe('ClientDemandesList — réponse de MTM', () => {
  it('affiche la réponse de l’équipe sous le message, avec « Répondu »', () => {
    render(
      <ClientDemandesList
        data={donnees([message({ traite: true, reponse: 'Oui, le titre est vérifié.', reponduLe: '2026-10-06T08:00:00Z' })])}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByText('Répondu')).toBeInTheDocument();
    expect(screen.getByText(/Réponse de MTM/)).toBeInTheDocument();
    expect(screen.getByText('Oui, le titre est vérifié.')).toBeInTheDocument();
  });

  it('un message pris en charge sans réponse reste « Prise en charge »', () => {
    render(<ClientDemandesList data={donnees([message({ traite: true })])} loading={false} error={null} />);
    expect(screen.getByText('Prise en charge')).toBeInTheDocument();
    expect(screen.queryByText(/Réponse de MTM/)).not.toBeInTheDocument();
  });

  it('un message sans réponse est « En attente »', () => {
    render(<ClientDemandesList data={donnees([message({})])} loading={false} error={null} />);
    expect(screen.getByText('En attente')).toBeInTheDocument();
  });
});
