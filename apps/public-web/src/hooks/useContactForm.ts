import { useState } from 'react';
import { sendContact, sendReservationRequest } from '../services/public-api';

type ContactFormValues = {
  nom: string;
  email: string;
  telephone?: string;
  sujet?: string;
  message?: string;
  terrainId?: string;
  reservation?: boolean;
};

function buildDefaultPublicMessage(sujet?: string): string {
  switch (sujet?.trim()) {
    case 'Acquérir un terrain':
      return 'Je souhaite acquérir un terrain et recevoir un accompagnement MTM pour la réservation.';
    case 'Demander une visite':
      return 'Je souhaite planifier une visite du terrain et obtenir un rendez-vous avec un conseiller MTM.';
    case 'Demander une vérification':
      return 'Je souhaite demander une vérification foncière et un accompagnement MTM sur ce projet.';
    case 'Parler de gestion locative':
      return 'Je souhaite échanger sur une gestion locative ou un accompagnement MTM associé à ce terrain.';
    default:
      return 'Demande depuis le site public';
  }
}

export function useContactForm(onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function submit(values: ContactFormValues): Promise<boolean> {
    setIsSubmitting(true);
    setError(null);
    setIsSuccess(false);

    try {
      const { reservation, sujet, ...requestValues } = values;
      const message =
        (values.message && values.message.trim()) ||
        buildDefaultPublicMessage(values.sujet);
      const payload = {
        ...requestValues,
        sujet,
        message,
      };
      const reservationPayload = {
        ...requestValues,
        message:
          message,
      };
      if (reservation && values.terrainId) {
        await sendReservationRequest(reservationPayload);
      } else {
        await sendContact(payload);
      }
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
