const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  readonly status: number;
  /** Code d'erreur métier optionnel (ex. PASSWORD_CHANGE_REQUIRED), pour un branchement fiable côté UI. */
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type QueryValue = string | number | boolean | undefined;
export type QueryParams = Record<string, QueryValue>;

function buildQuery(params?: QueryParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function parseError(response: Response): Promise<{ message: string; code?: string }> {
  try {
    const body: unknown = await response.json();
    const record = body as { message?: unknown; code?: unknown } | null;
    const code = typeof record?.code === 'string' ? record.code : undefined;
    if (Array.isArray(record?.message)) return { message: record.message.join(' '), code };
    if (typeof record?.message === 'string' && record.message.trim()) {
      return { message: record.message, code };
    }
  } catch {
    // Le corps n'est pas du JSON exploitable : on retombe sur le message générique.
  }
  return { message: "Une erreur est survenue. Merci de réessayer dans quelques instants." };
}

interface RequestOptions {
  /** Jeton d'accès à joindre en en-tête Authorization (espace client). */
  token?: string;
}

async function request<T>(path: string, init?: RequestInit, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    // Nécessaire pour que le cookie httpOnly du refresh token (posé par
    // l'API sur /auth/login et /auth/refresh) transite entre l'origine du
    // site public (5173) et celle de l'API (3000) en développement.
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const { message, code } = await parseError(response);
    throw new ApiError(response.status, message, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  get<T>(path: string, params?: QueryParams, options?: RequestOptions): Promise<T> {
    return request<T>(`${path}${buildQuery(params)}`, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(
      path,
      { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined },
      options,
    );
  },
};
