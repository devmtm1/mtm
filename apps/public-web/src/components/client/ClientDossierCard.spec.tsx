import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ClientDossierCard } from './ClientDossierCard';
import type { ClientDossier, ClientDossierProtocole } from '../../types/clientPortal';

vi.mock('../../api/clientPortal', () => ({ telechargerRecu: vi.fn() }));
vi.mock('../../contexts/auth-context-store', () => ({ useAuth: () => ({ accessToken: 'jeton' }) }));
vi.mock('../ui/toast-store', () => ({ useToast: () => ({ show: vi.fn() }) }));
vi.mock('./ClientEchanges', () => ({ ClientEchanges: () => null }));

const base = {
  id: 'd1',
  referenceInterne: 'DV-1',
  statut: 'reserve',
  prixVente: 10_000_000,
  createdAt: '2026-11-01T00:00:00Z',
  terrain: null,
  reservations: [],
  paiements: [],
  echeances: [],
  documents: [],
  montantPaye: 0,
} as unknown as ClientDossier;

const protocole = (surcharge: Partial<ClientDossierProtocole>): ClientDossierProtocole => ({
  id: 'pr1',
  titre: 'Protocole lot 12',
  type: 'protocole_accord',
  etape: 'a_signer',
  libelle: 'À signer',
  aide: 'Votre protocole vous a été envoyé. Signez-le et rendez-le à votre conseiller.',
  dateEnvoi: null,
  dateReceptionSignee: null,
  ...surcharge,
});

const afficher = (dossier: ClientDossier) =>
  render(
    <MemoryRouter>
      <ClientDossierCard dossier={dossier} defaultOpen />
    </MemoryRouter>,
  );

describe('ClientDossierCard — protocole et signature', () => {
  it('montre au client l’étape de son protocole et ce qu’il doit faire', () => {
    afficher({ ...base, protocoles: [protocole({})] });
    expect(screen.getByText('Protocole et signature')).toBeInTheDocument();
    expect(screen.getByText('Protocole lot 12')).toBeInTheDocument();
    expect(screen.getByText('À signer')).toBeInTheDocument();
    expect(screen.getByText(/rendez-le à votre conseiller/)).toBeInTheDocument();
  });

  it('indique la date de réception de la copie signée', () => {
    afficher({
      ...base,
      protocoles: [protocole({ etape: 'signe', libelle: 'Signé, en cours de validation', aide: 'Votre copie signée est bien reçue.', dateReceptionSignee: '2026-11-15T00:00:00Z' })],
    });
    expect(screen.getByText('Signé, en cours de validation')).toBeInTheDocument();
    expect(screen.getByText(/Copie signée reçue le/)).toBeInTheDocument();
  });

  it('n’affiche aucune section quand le dossier n’a pas de protocole (ou que l’API n’en renvoie pas)', () => {
    afficher({ ...base, protocoles: [] });
    expect(screen.queryByText('Protocole et signature')).toBeNull();
    afficher({ ...base });
    expect(screen.queryByText('Protocole et signature')).toBeNull();
  });
});
