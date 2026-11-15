import { ChampTelephone } from '../ui/ChampTelephone';
import { CheckCircle2, ChevronDown, ChevronRight, Mail, MessageSquare, Phone, Send, User } from 'lucide-react';
import { useContactForm } from '../../hooks/useContactForm';
import { ClientIdentityNotice } from './ClientIdentityNotice';
import { Button } from '../ui/Button';
import { ChampAvecIcone, FormField, fieldInputClass } from '../ui/FormField';

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
  /**
   * Le sujet est imposé par la page (ex. la page d'un pôle) : il s'affiche en rappel au lieu d'un champ à remplir, et le
   * formulaire gagne une ligne.
   */
  sujetFige?: boolean;
  /** Texte du bouton d'envoi, quand « Envoyer le message » ne correspond pas à la demande. */
  libelleBouton?: string;
  /** Présentation de la page Contact : icônes dans les champs, exemples de saisie, sujet à choisir dans une liste. */
  avecIcones?: boolean;
  onSuccess?: () => void;
}

export function ContactForm({
  terrainId,
  bienLocatifId,
  initialSujet,
  sujetOptions,
  demandeType,
  sujetFige = false,
  libelleBouton = 'Envoyer le message',
  avecIcones = false,
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
      {sujetFige && (
        <p className="rounded-xl bg-mtm-primary-subtle px-3.5 py-2.5 text-sm text-mtm-primary-dark">
          <span className="font-semibold">Votre demande :</span> {values.sujet}
        </p>
      )}

      {client ? (
        <ClientIdentityNotice client={client} dansEspaceClient={!bienLocatifId} />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nom complet" htmlFor="contact-nom" error={errors.nom} required>
          <ChampAvecIcone icone={avecIcones ? <User /> : null}>
          <input
            id="contact-nom"
            type="text"
            placeholder={avecIcones ? 'Votre nom et prénom' : undefined}
            className={`${fieldInputClass} ${avecIcones ? 'pl-10 sm:pl-10' : ''}`}
            value={values.nom}
            onChange={(event) => setValue('nom', event.target.value)}
            autoComplete="name"
          />
          </ChampAvecIcone>
        </FormField>

        <FormField label="E-mail" htmlFor="contact-email" error={errors.email} hint={avecIcones ? undefined : 'Un e-mail ou un téléphone : l’un des deux suffit.'}>
          <ChampAvecIcone icone={avecIcones ? <Mail /> : null}>
          <input
            id="contact-email"
            type="email"
            placeholder={avecIcones ? 'votre@email.com' : undefined}
            className={`${fieldInputClass} ${avecIcones ? 'pl-10 sm:pl-10' : ''}`}
            value={values.email}
            onChange={(event) => setValue('email', event.target.value)}
            autoComplete="email"
          />
          </ChampAvecIcone>
        </FormField>
      </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!client && (
        <ChampTelephone label="Téléphone" id="contact-telephone" value={values.telephone} onChange={(valeur) => setValue('telephone', valeur)} error={errors.telephone} icone={avecIcones ? <Phone /> : undefined} placeholder={avecIcones ? '+221 77 123 45 67' : undefined} />
        )}

        {!sujetFige && (
        <FormField label="Sujet" htmlFor="contact-sujet">
          {sujetOptions?.length ? (
            <ChampAvecIcone icone={avecIcones ? <Mail /> : null}>
            <select
              id="contact-sujet"
              className={`${fieldInputClass} ${avecIcones ? 'appearance-none pl-10 pr-9 sm:pl-10 sm:pr-9' : ''}`}
              value={values.sujet}
              onChange={(event) => setValue('sujet', event.target.value)}
            >
              {avecIcones && <option value="">Choisissez un sujet</option>}
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
            {avecIcones && <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-[1.15rem] h-4 w-4 -translate-y-1/2 text-mtm-text" />}
            </ChampAvecIcone>
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
        )}
      </div>

      <FormField label="Votre message" htmlFor="contact-message" error={errors.message} required>
        <ChampAvecIcone icone={avecIcones ? <MessageSquare /> : null}>
        <textarea
          id="contact-message"
          rows={sujetFige ? 4 : avecIcones ? 3 : 5}
          placeholder={avecIcones ? 'Écrivez votre message ici...' : undefined}
          className={`${fieldInputClass} ${avecIcones ? 'pl-10 sm:pl-10' : ''}`}
          value={values.message}
          onChange={(event) => setValue('message', event.target.value)}
        />
        </ChampAvecIcone>
      </FormField>

      {submitError && (
        <p className="text-sm font-medium text-mtm-error" role="alert">
          {submitError}
        </p>
      )}

      <Button type="submit" variant={sujetFige ? 'accent' : 'primary'} disabled={submitting} className="w-full sm:w-auto sm:self-start">
        {submitting ? (
          'Envoi en cours...'
        ) : avecIcones ? (
          <span className="inline-flex items-center gap-2">
            <Send className="h-4 w-4" aria-hidden="true" />
            {libelleBouton}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          libelleBouton
        )}
      </Button>
    </form>
  );
}
