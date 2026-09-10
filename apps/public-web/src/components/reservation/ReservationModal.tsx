import { CheckCircle2 } from 'lucide-react';
import { useReservationRequest } from '../../hooks/useReservationRequest';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';

interface ReservationModalProps {
  terrainId: string;
  terrainNom: string;
  onClose: () => void;
}

export function ReservationModal({ terrainId, terrainNom, onClose }: ReservationModalProps) {
  const { values, setValue, errors, submitting, submitted, submitError, submit } =
    useReservationRequest(terrainId);

  return (
    <Modal title={`Réserver « ${terrainNom} »`} onClose={onClose}>
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-mtm-success" aria-hidden="true" />
          <p className="font-semibold text-mtm-text">Demande de réservation envoyée</p>
          <p className="text-sm text-mtm-muted">
            Un commercial MTM vous contactera pour confirmer les modalités et l'acompte.
          </p>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className="text-sm text-mtm-muted">
            Laissez-nous vos coordonnées : nous revenons vers vous pour finaliser votre
            réservation et les modalités d'acompte.
          </p>

          <FormField label="Nom complet" htmlFor="reservation-nom" error={errors.nom} required>
            <input
              id="reservation-nom"
              type="text"
              className={fieldInputClass}
              value={values.nom}
              onChange={(event) => setValue('nom', event.target.value)}
              autoComplete="name"
            />
          </FormField>

          <FormField label="E-mail" htmlFor="reservation-email" error={errors.email} required>
            <input
              id="reservation-email"
              type="email"
              className={fieldInputClass}
              value={values.email}
              onChange={(event) => setValue('email', event.target.value)}
              autoComplete="email"
            />
          </FormField>

          <FormField label="Téléphone" htmlFor="reservation-telephone" error={errors.telephone}>
            <input
              id="reservation-telephone"
              type="tel"
              className={fieldInputClass}
              value={values.telephone}
              onChange={(event) => setValue('telephone', event.target.value)}
              autoComplete="tel"
            />
          </FormField>

          <FormField label="Message (optionnel)" htmlFor="reservation-message">
            <textarea
              id="reservation-message"
              rows={3}
              className={fieldInputClass}
              value={values.message}
              onChange={(event) => setValue('message', event.target.value)}
            />
          </FormField>

          {submitError && (
            <p className="text-sm font-medium text-mtm-error" role="alert">
              {submitError}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Button>
        </form>
      )}
    </Modal>
  );
}
