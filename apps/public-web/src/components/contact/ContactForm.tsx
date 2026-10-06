import { CheckCircle2 } from 'lucide-react';
import { useContactForm } from '../../hooks/useContactForm';
import { ClientIdentityNotice } from './ClientIdentityNotice';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';

interface ContactFormProps {
  terrainId?: string;
  bienLocatifId?: string;
  initialSujet?: string;
  /**
   * Sujets proposés au lieu d'un champ libre. La page « Démarches » y passe
   * les prestations qu'elle annonce : le visiteur dit ce qu'il veut dès la
   * première ligne, et le conseiller sait à quoi il a affaire sans avoir à
   * décoder le message.
   */
  sujetOptions?: string[];
  /** Nature de la demande (client connecté) : « visite » depuis une fiche terrain. */
  demandeType?: 'information' | 'visite';
  onSuccess?: () => void;
}

export function ContactForm({
  terrainId,
  bienLocatifId,
  initialSujet,
  sujetOptions,
  demandeType,
  onSuccess,
}: ContactFormProps) {
  const { values, setValue, errors, submitting, submitted, submitError, submit, client } = useContactForm({
    terrainId,
    bienLocatifId,
    initialSujet,
    demandeType,
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
      {client ? (
        <ClientIdentityNotice client={client} dansEspaceClient={!bienLocatifId} />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!client && (
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
        )}

        <FormField label="Sujet" htmlFor="contact-sujet">
          {sujetOptions?.length ? (
            <select
              id="contact-sujet"
              className={fieldInputClass}
              value={values.sujet}
              onChange={(event) => setValue('sujet', event.target.value)}
            >
              {/* Le sujet initial peut ne pas figurer dans la liste (demande
                  venue d'une fiche terrain) : on l'ajoute plutôt que de le
                  perdre silencieusement au premier rendu. */}
              {values.sujet && !sujetOptions.includes(values.sujet) && (
                <option value={values.sujet}>{values.sujet}</option>
              )}
              {sujetOptions.map((sujet) => (
                <option key={sujet} value={sujet}>
                  {sujet}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="contact-sujet"
              type="text"
              className={fieldInputClass}
              value={values.sujet}
              onChange={(event) => setValue('sujet', event.target.value)}
            />
          )}
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
