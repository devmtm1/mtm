import { ArrowRight, X } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import { useContactForm } from '../../hooks/useContactForm';

type ContactModalProps = { terrainId: string | null; onClose: () => void };
type ContactForm = ReturnType<typeof useContactForm>;

export function ContactModal({
  terrainId,
  onClose,
}: Readonly<ContactModalProps>) {
  const formState: ContactForm = useContactForm(() =>
    setTimeout(onClose, 1500),
  );
  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const getText = (name: string) => {
      const value = values.get(name);
      return typeof value === 'string' ? value : '';
    };
    void formState
      .submit({
        nom: getText('nom'),
        email: getText('email'),
        telephone: getText('telephone') || undefined,
        sujet: getText('sujet') || undefined,
        message: getText('message') || undefined,
        terrainId: getText('terrainId') || undefined,
      })
      .then((success) => {
        if (success) form.reset();
      });
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/65 p-5 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl sm:p-9">
        <button
          type="button"
          className="absolute right-5 top-5 text-slate-400"
          aria-label="Fermer"
          onClick={onClose}
        >
          <X />
        </button>
        <p className="eyebrow">Parlons de votre projet</p>
        <h2 className="mt-2 font-display text-3xl">Nous vous rappelons.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Laissez-nous vos coordonnées, un conseiller MTM vous recontactera
          rapidement.
        </p>
        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <input
            className="input"
            name="nom"
            required
            placeholder="Nom complet"
          />
          <input
            className="input"
            name="email"
            required
            type="email"
            placeholder="Adresse e-mail"
          />
          <input className="input" name="telephone" placeholder="Téléphone" />
          <input type="hidden" name="terrainId" value={terrainId ?? ''} />
          <select className="input" name="sujet" defaultValue={terrainId ? 'Acquérir un terrain' : ''}>
            <option value="">Je souhaite...</option>
            <option value="Acquérir un terrain">Acquérir un terrain / Réserver</option>
            <option value="Demander une visite">Demander une visite</option>
            <option value="Demander une vérification">Demander une vérification foncière</option>
            <option value="Parler de gestion locative">Parler de gestion locative</option>
          </select>
          <textarea
            className="input min-h-[80px]"
            name="message"
            placeholder="Votre message..."
          />
          {formState.error && (
            <p className="text-sm text-red-600">{formState.error}</p>
          )}
          {formState.isSuccess && (
            <p className="text-sm text-green-600">
              Demande envoyée avec succès !
            </p>
          )}
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-coral py-3.5 font-bold text-white"
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? 'Envoi...' : 'Envoyer ma demande'}{' '}
            <ArrowRight className="ml-2 inline" size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
