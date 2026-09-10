import { CheckCircle2 } from 'lucide-react';
import { useContactForm } from '../../hooks/useContactForm';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';

interface ContactFormProps {
  terrainId?: string;
  initialSujet?: string;
  onSuccess?: () => void;
}

export function ContactForm({ terrainId, initialSujet, onSuccess }: ContactFormProps) {
  const { values, setValue, errors, submitting, submitted, submitError, submit } = useContactForm({
    terrainId,
    initialSujet,
  });

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-mtm-success/30 bg-mtm-success/5 px-6 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-mtm-success" aria-hidden="true" />
        <p className="font-semibold text-mtm-text">Message envoyé avec succès</p>
        <p className="text-sm text-mtm-muted">
          Un membre de notre équipe vous recontactera très prochainement.
        </p>
        {onSuccess && (
          <Button variant="secondary" onClick={onSuccess}>
            Fermer
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nom complet" htmlFor="contact-nom" error={errors.nom} required>
          <input
            id="contact-nom"
            type="text"
            className={fieldInputClass}
            value={values.nom}
            onChange={(event) => setValue('nom', event.target.value)}
            autoComplete="name"
          />
        </FormField>

        <FormField label="E-mail" htmlFor="contact-email" error={errors.email} required>
          <input
            id="contact-email"
            type="email"
            className={fieldInputClass}
            value={values.email}
            onChange={(event) => setValue('email', event.target.value)}
            autoComplete="email"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Téléphone" htmlFor="contact-telephone" error={errors.telephone}>
          <input
            id="contact-telephone"
            type="tel"
            className={fieldInputClass}
            value={values.telephone}
            onChange={(event) => setValue('telephone', event.target.value)}
            autoComplete="tel"
          />
        </FormField>

        <FormField label="Sujet" htmlFor="contact-sujet">
          <input
            id="contact-sujet"
            type="text"
            className={fieldInputClass}
            value={values.sujet}
            onChange={(event) => setValue('sujet', event.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Votre message" htmlFor="contact-message" error={errors.message} required>
        <textarea
          id="contact-message"
          rows={5}
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
        {submitting ? 'Envoi en cours...' : 'Envoyer le message'}
      </Button>
    </form>
  );
}
