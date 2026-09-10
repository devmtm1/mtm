import { apiClient } from './client';
import type { AuthUser, LoginPayload, LoginResult, RefreshResult } from '../types/auth';

export function login(payload: LoginPayload): Promise<LoginResult> {
  return apiClient.post<LoginResult>('/auth/login', payload);
}

export function refresh(): Promise<RefreshResult> {
  return apiClient.post<RefreshResult>('/auth/refresh');
}

export function fetchMe(token: string): Promise<AuthUser> {
  return apiClient.get<AuthUser>('/auth/me', undefined, { token });
}

export function logout(token: string): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>('/auth/logout', undefined, { token });
}

export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>(
    '/auth/change-password',
    { currentPassword, newPassword },
    { token },
  );
}

export function requestPasswordReset(
  email: string,
): Promise<{ accepted: true; developmentToken?: string }> {
  return apiClient.post('/auth/password-reset/request', { email });
}

export function confirmPasswordReset(token: string, newPassword: string): Promise<{ success: true }> {
  return apiClient.post('/auth/password-reset/confirm', { token, newPassword });
}
