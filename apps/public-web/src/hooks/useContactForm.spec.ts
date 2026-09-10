import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendContact, sendReservationRequest } from '../services/public-api';
import { useContactForm } from './useContactForm';

vi.mock('../services/public-api', () => ({
  sendContact: vi.fn(),
  sendReservationRequest: vi.fn(),
}));

const mockedSendContact = vi.mocked(sendContact);
const mockedSendReservationRequest = vi.mocked(sendReservationRequest);

describe('useContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the public request and reports success', async () => {
    mockedSendContact.mockResolvedValueOnce();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useContactForm(onSuccess));

    await act(async () => {
      await result.current.submit({ nom: 'Awa', email: 'awa@example.com' });
    });

    expect(mockedSendContact).toHaveBeenCalledWith({
      nom: 'Awa',
      email: 'awa@example.com',
      message: 'Demande depuis le site public',
    });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('keeps the error state when the API rejects the request', async () => {
    mockedSendContact.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => useContactForm());

    let submitted: boolean | undefined;
    await act(async () => {
      submitted = await result.current.submit({
        nom: 'Awa',
        email: 'awa@example.com',
      });
    });

    expect(submitted).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBe(
      'Impossible d’envoyer le message. Veuillez réessayer.',
    );
    expect(result.current.isSubmitting).toBe(false);
  });

  it('creates a specific default message when the public request is a reservation', async () => {
    mockedSendContact.mockResolvedValueOnce();
    const { result } = renderHook(() => useContactForm());

    await act(async () => {
      await result.current.submit({
        nom: 'Awa',
        email: 'awa@example.com',
        sujet: 'Acquérir un terrain',
      });
    });

    expect(mockedSendContact).toHaveBeenCalledWith({
      nom: 'Awa',
      email: 'awa@example.com',
      sujet: 'Acquérir un terrain',
      message:
        'Je souhaite acquérir un terrain et recevoir un accompagnement MTM pour la réservation.',
    });
  });

  it('sends a terrain reservation request to the dedicated public endpoint', async () => {
    mockedSendReservationRequest.mockResolvedValueOnce();
    const { result } = renderHook(() => useContactForm());

    await act(async () => {
      await result.current.submit({
        nom: 'Awa',
        email: 'awa@example.com',
        terrainId: 'terrain-id',
        sujet: 'Acquérir un terrain',
        reservation: true,
      });
    });

    expect(mockedSendReservationRequest).toHaveBeenCalledWith({
      nom: 'Awa',
      email: 'awa@example.com',
      terrainId: 'terrain-id',
      message:
        'Je souhaite acquérir un terrain et recevoir un accompagnement MTM pour la réservation.',
    });
    expect(mockedSendContact).not.toHaveBeenCalled();
  });
});