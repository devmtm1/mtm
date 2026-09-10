import { useCallback, useState } from 'react';
import { sendContactMessage } from '../api/contact';
import { ApiError } from '../api/client';
import { hasErrors, validateContactForm, type ContactFormValues, type FieldErrors } from '../utils/validation';

const EMPTY_VALUES: ContactFormValues = { nom: '', email: '', telephone: '', sujet: '', message: '' };

export interface UseContactFormOptions {
  terrainId?: string;
  initialSujet?: string;
}

export function useContactForm({ terrainId, initialSujet }: UseContactFormOptions = {}) {
  const [values, setValues] = useState<ContactFormValues>({
    ...EMPTY_VALUES,
    sujet: initialSujet ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setValue = useCallback((field: keyof ContactFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues({ ...EMPTY_VALUES, sujet: initialSujet ?? '' });
    setErrors({});
    setSubmitted(false);
    setSubmitError(null);
  }, [initialSujet]);

  const submit = useCallback(async () => {
    const fieldErrors = validateContactForm(values);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await sendContactMessage({
        nom: values.nom.trim(),
        email: values.email.trim(),
        telephone: values.telephone.trim() || undefined,
        sujet: values.sujet.trim() || undefined,
        message: values.message.trim(),
        terrainId,
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "L'envoi a échoué. Merci de réessayer.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [values, terrainId]);

  return { values, setValue, errors, submitting, submitted, submitError, submit, reset };
}
