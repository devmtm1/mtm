import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendContact } from '../services/public-api';
import { useContactForm } from './useContactForm';

vi.mock('../services/public-api', () => ({
  sendContact: vi.fn(),
}));

const mockedSendContact = vi.mocked(sendContact);

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
});