import { useState } from 'react';
import { sendContact } from '../services/public-api';

type ContactFormValues = {
  nom: string;
  email: string;
  telephone?: string;
  sujet?: string;
  message?: string;
  terrainId?: string;
};

export function useContactForm(onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function submit(values: ContactFormValues): Promise<boolean> {
    setIsSubmitting(true);
    setError(null);
    setIsSuccess(false);

    try {
      await sendContact({
        ...values,
        message: values.message || 'Demande depuis le site public',
      });
      setIsSuccess(true);
      onSuccess?.();
      return true;
    } catch {
      setError('Impossible d’envoyer le message. Veuillez réessayer.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { submit, isSubmitting, error, isSuccess };
}
