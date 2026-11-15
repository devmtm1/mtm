import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { AuthContext, type AuthContextValue } from '../contexts/auth-context-store';
import type { AuthUser, LoginResult } from '../types/auth';
import { ROUTES } from '../routes';
import { LoginPage } from './LoginPage';

const CLIENT: AuthUser = {
  id: 'c1',
  email: 'awa@exemple.sn',
  telephone: null,
  firstName: 'Awa',
  lastName: 'Diop',
  roles: ['client'],
  permissions: [],
  mustChangePassword: false,
  twoFactorEnabled: false,
};

/** Un contexte d'authentification de test : `login` fait ce que le test lui demande, et met l'utilisateur à jour en cas de succès. */
function Contexte({ login, children }: { login: (identifiant: string, mdp: string, code?: string) => Promise<LoginResult>; children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const valeur: AuthContextValue = {
    user,
    accessToken: user ? 'jeton' : null,
    bootstrapping: false,
    login: async (identifiant, mdp, code) => {
      const resultat = await login(identifiant, mdp, code);
      if (!resultat.requiresTwoFactor) setUser(CLIENT);
      return resultat;
    },
    logout: async () => undefined,
    refreshUser: async () => undefined,
  };
  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

function afficher(login: Parameters<typeof Contexte>[0]['login']) {
  return render(
    <Contexte login={login}>
      <MemoryRouter initialEntries={[ROUTES.clientLogin]}>
        <Routes>
          <Route path={ROUTES.clientLogin} element={<LoginPage />} />
          <Route path={ROUTES.clientPortal} element={<p>Portail du client</p>} />
        </Routes>
      </MemoryRouter>
    </Contexte>,
  );
}

const etatPorte = () => document.querySelector('.porte')?.getAttribute('data-etat');

async function saisirEtEnvoyer(utilisateur: ReturnType<typeof userEvent.setup>) {
  await utilisateur.type(screen.getByLabelText(/e-mail ou numéro/i), 'awa@exemple.sn');
  await utilisateur.type(screen.getByLabelText(/mot de passe/i, { selector: 'input' }), 'MotDePasse123!');
  await utilisateur.click(screen.getByRole('button', { name: 'Se connecter' }));
}

describe('LoginPage : la porte', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reste fermée tant que le serveur n’a pas répondu', async () => {
    const utilisateur = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    afficher(() => new Promise<LoginResult>(() => undefined));

    await saisirEtEnvoyer(utilisateur);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(etatPorte()).toBe('attente');
    expect(screen.queryByText('Portail du client')).toBeNull();
  });

  it('s’ouvre sur la confirmation du serveur, puis ouvre le portail', async () => {
    const utilisateur = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    afficher(async () => ({ requiresTwoFactor: false, accessToken: 't', user: CLIENT }));

    await saisirEtEnvoyer(utilisateur);
    // La page ne redirige pas tout de suite : la porte s'ouvre d'abord.
    expect(screen.queryByText('Portail du client')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(screen.getByText('Portail du client')).toBeTruthy();
  });

  it('reste fermée sur des identifiants refusés, avec les champs conservés', async () => {
    const utilisateur = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    afficher(async () => {
      throw new ApiError(401, 'Identifiants invalides.');
    });

    await saisirEtEnvoyer(utilisateur);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(etatPorte()).toBe('repos');
    expect(screen.getByText('Identifiants invalides.')).toBeTruthy();
    expect((screen.getByLabelText(/e-mail ou numéro/i) as HTMLInputElement).value).toBe('awa@exemple.sn');
    expect(screen.queryByText('Portail du client')).toBeNull();
  });

  it('ne s’ouvre pas sur une erreur réseau', async () => {
    const utilisateur = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    afficher(async () => {
      throw new Error('réseau');
    });

    await saisirEtEnvoyer(utilisateur);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(etatPorte()).toBe('repos');
    expect(screen.getByText('Connexion impossible pour le moment.')).toBeTruthy();
    expect(screen.queryByText('Portail du client')).toBeNull();
  });

  it('s’efface quand le serveur demande le code de double authentification', async () => {
    const utilisateur = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    afficher(async () => ({ requiresTwoFactor: true }));

    await saisirEtEnvoyer(utilisateur);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(etatPorte()).toBe('repos');
    expect(screen.getByLabelText(/code de vérification/i)).toBeTruthy();
  });
});
