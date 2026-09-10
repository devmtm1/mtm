export type ClientPortalUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
};

export type ClientPortalLoginResponse = {
  requiresTwoFactor?: boolean;
  accessToken: string;
  user: ClientPortalUser;
};

export type ClientPortalDossier = {
  id: string;
  referenceInterne: string | null;
  statut: string;
  prixVente: number | null;
  createdAt: string;
  montantPaye: number;
  terrain: {
    referenceInterne: string | null;
    nom: string | null;
    region: string | null;
    commune: string | null;
  } | null;
  reservations: Array<{
    reference: string | null;
    montantAcompte: number | string;
    dateExpiration: string | null;
    statut: string;
  }>;
  paiements: Array<{
    montant: number | string;
    datePaiement: string;
    mode: string;
    reference: string | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    title: string;
    version: number;
    createdAt: string;
    secureUrl?: string;
  }>;
};

export const clientPortalApiUrl =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const CLIENT_SESSION_KEY = 'mtm_client_session';

export function saveClientSession(accessToken: string, user: ClientPortalUser): void {
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify({ accessToken, user }));
}

export function clearClientSession(): void {
  localStorage.removeItem(CLIENT_SESSION_KEY);
}

export function getStoredClientAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(CLIENT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accessToken?: string };
    return parsed.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function loginClient(payload: {
  email: string;
  password: string;
}): Promise<ClientPortalLoginResponse> {
  const response = await fetch(`${clientPortalApiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.message ?? 'Identifiants invalides');
  }

  const data = (await response.json()) as ClientPortalLoginResponse;
  if (!data.accessToken || !data.user) {
    throw new Error('Connexion client non disponible');
  }

  saveClientSession(data.accessToken, data.user);
  return data;
}

export async function getClientPortal(): Promise<ClientPortalDossier[]> {
  const token = getStoredClientAccessToken();
  if (!token) {
    throw new Error('Session client absente');
  }

  const response = await fetch(`${clientPortalApiUrl}/ventes/client/portal`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.message ?? 'Accès à l’espace client impossible');
  }

  return (await response.json()) as ClientPortalDossier[];
}

export async function logoutClient(): Promise<void> {
  const token = getStoredClientAccessToken();
  if (token) {
    await fetch(`${clientPortalApiUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      credentials: 'include',
    }).catch(() => undefined);
  }
  clearClientSession();
}
