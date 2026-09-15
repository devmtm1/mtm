import { useCallback, useState } from 'react';
import { sendContactMessage } from '../api/contact';
import { createClientDemande, type ClientDemandeType } from '../api/clientPortal';
import { ApiError } from '../api/client';
import { useClientSession } from '../contexts/auth-context-store';
import { hasErrors, validateClientMessage, validateContactForm, type ContactFormValues, type FieldErrors } from '../utils/validation';

const EMPTY_VALUES: ContactFormValues = { nom: '', email: '', telephone: '', sujet: '', message: '' };

export interface UseContactFormOptions {
  terrainId?: string;
  initialSujet?: string;
  /** Nature de la demande quand elle part d'un client connecté. */
  demandeType?: Exclude<ClientDemandeType, 'reservation'>;
}

export function useContactForm({ terrainId, initialSujet, demandeType = 'information' }: UseContactFormOptions = {}) {
  // Client connecté : identité prise dans son compte, envoi authentifié pour
  // que la demande soit rattachée à son espace (et non à l'e-mail saisi).
  const client = useClientSession();
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
    const fieldErrors = client ? validateClientMessage(values.message) : validateContactForm(values);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (client) {
        await createClientDemande(client.token, {
          type: demandeType,
          message: values.message.trim(),
          sujet: values.sujet.trim() || undefined,
          terrainId,
        });
        setSubmitted(true);
        return;
      }
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
  }, [values, terrainId, client, demandeType]);

  return { values, setValue, errors, submitting, submitted, submitError, submit, reset, client };
}
