import { useCallback, useState } from 'react';
import { sendReservationRequest } from '../api/reservations';
import { createClientDemande } from '../api/clientPortal';
import { ApiError } from '../api/client';
import { useClientSession } from '../contexts/auth-context-store';
import {
  hasErrors,
  validateReservationForm,
  type FieldErrors,
  type ReservationFormValues,
} from '../utils/validation';

const EMPTY_VALUES: ReservationFormValues = { nom: '', email: '', telephone: '', message: '' };

/** Message par défaut d'un client connecté qui réserve sans rien écrire. */
const DEFAULT_CLIENT_MESSAGE = 'Je souhaite réserver ce terrain.';

export function useReservationRequest(terrainId: string) {
  const client = useClientSession();
  const [values, setValues] = useState<ReservationFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setValue = useCallback((field: keyof ReservationFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    const fieldErrors = client ? {} : validateReservationForm(values);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (client) {
        await createClientDemande(client.token, {
          type: 'reservation',
          terrainId,
          message: values.message.trim() || DEFAULT_CLIENT_MESSAGE,
        });
        setSubmitted(true);
        return;
      }
      await sendReservationRequest({
        terrainId,
        nom: values.nom.trim(),
        email: values.email.trim(),
        telephone: values.telephone.trim() || undefined,
        message: values.message.trim() || undefined,
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "La demande n'a pas pu être envoyée.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [values, terrainId, client]);

  return { values, setValue, errors, submitting, submitted, submitError, submit, client };
}
