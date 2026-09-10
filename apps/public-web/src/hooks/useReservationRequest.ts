import { useCallback, useState } from 'react';
import { sendReservationRequest } from '../api/reservations';
import { ApiError } from '../api/client';
import {
  hasErrors,
  validateReservationForm,
  type FieldErrors,
  type ReservationFormValues,
} from '../utils/validation';

const EMPTY_VALUES: ReservationFormValues = { nom: '', email: '', telephone: '', message: '' };

export function useReservationRequest(terrainId: string) {
  const [values, setValues] = useState<ReservationFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setValue = useCallback((field: keyof ReservationFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    const fieldErrors = validateReservationForm(values);
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
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
  }, [values, terrainId]);

  return { values, setValue, errors, submitting, submitted, submitError, submit };
}
