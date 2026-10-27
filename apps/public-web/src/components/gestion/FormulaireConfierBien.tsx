import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { sendConfierBien } from '../../api/contact';
import { ApiError } from '../../api/client';
import { SITUATIONS_BIEN_CONFIE, TYPES_BIEN_CONFIE } from '../../types/contact';
import { hasErrors, validateConfierBien, type ConfierBienValues, type FieldErrors } from '../../utils/validation';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';

const VIDE: ConfierBienValues = {
  nom: '',
  email: '',
  telephone: '',
  pays: '',
  typeBien: '',
  commune: '',
  region: '',
  nombreLogements: '',
  situation: '',
  loyerSouhaite: '',
  precisions: '',
  consentement: false,
};

/**
 * Le propriétaire décrit son bien : qui il est, ce qu'il possède, où, et dans quel état. L'équipe reçoit la demande
 * déjà qualifiée (type, lieu, nombre de logements, situation) et rappelle ; rien n'est créé avant sa validation.
 */
export function FormulaireConfierBien() {
  const [values, setValues] = useState<ConfierBienValues>(VIDE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  // Piège à robots : un visiteur ne voit pas ce champ, un robot le remplit.
  const [piege, setPiege] = useState('');

  // Corriger un champ efface son message d'erreur : il ne doit pas rester affiché une fois la saisie valide.
  const set = <K extends keyof ConfierBienValues>(champ: K, valeur: ConfierBienValues[K]): void => {
    setValues((precedent) => ({ ...precedent, [champ]: valeur }));
    setErrors((precedentes) => (precedentes[champ] ? { ...precedentes, [champ]: undefined } : precedentes));
  };

  // Plusieurs logements n'ont de sens que pour un immeuble ou une villa divisée.
  const plusieursLogements = values.typeBien === 'immeuble';

  async function envoyer(): Promise<void> {
    const erreurs = validateConfierBien(values);
    setErrors(erreurs);
    if (hasErrors(erreurs)) return;
    setEnvoi(true);
    setErreurEnvoi(null);
    try {
      await sendConfierBien({
        nom: values.nom.trim(),
        email: values.email.trim(),
        telephone: values.telephone.trim(),
        pays: values.pays.trim() || undefined,
        typeBien: values.typeBien,
        commune: values.commune.trim(),
        region: values.region.trim() || undefined,
        nombreLogements: plusieursLogements && values.nombreLogements ? Number(values.nombreLogements) : undefined,
        situation: values.situation,
        loyerSouhaite: values.loyerSouhaite ? Number(values.loyerSouhaite) : undefined,
        precisions: values.precisions.trim() || undefined,
        consentement: values.consentement,
        siteWeb: piege || undefined,
      });
      setEnvoye(true);
    } catch (error) {
      setErreurEnvoi(error instanceof ApiError ? error.message : 'L’envoi a échoué. Merci de réessayer.');
    } finally {
      setEnvoi(false);
    }
  }

  if (envoye) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-mtm-success/30 bg-mtm-success/5 px-6 py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-mtm-success" aria-hidden="true" />
        <h3 className="font-display text-lg font-bold text-mtm-text">Merci, votre demande est bien reçue</h3>
        <p className="max-w-md text-sm text-mtm-muted">
          Un conseiller MTM vous rappelle très prochainement pour parler de votre bien. Vous n’avez rien d’autre à faire.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      aria-label="Confier mon bien à MTM"
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void envoyer();
      }}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-mtm-accent">Vous</legend>
        <FormField label="Nom complet" htmlFor="confier-nom" error={errors.nom} required>
          <input id="confier-nom" type="text" autoComplete="name" className={fieldInputClass} value={values.nom} onChange={(e) => set('nom', e.target.value)} />
        </FormField>
        <FormField label="Téléphone ou WhatsApp" htmlFor="confier-telephone" error={errors.telephone} required>
          <input id="confier-telephone" type="tel" autoComplete="tel" className={fieldInputClass} value={values.telephone} onChange={(e) => set('telephone', e.target.value)} />
        </FormField>
        <FormField label="E-mail" htmlFor="confier-email" error={errors.email} required>
          <input id="confier-email" type="email" autoComplete="email" className={fieldInputClass} value={values.email} onChange={(e) => set('email', e.target.value)} />
        </FormField>
        <FormField label="Pays de résidence" htmlFor="confier-pays" error={errors.pays}>
          <input id="confier-pays" type="text" autoComplete="country-name" placeholder="Sénégal, France…" className={fieldInputClass} value={values.pays} onChange={(e) => set('pays', e.target.value)} />
        </FormField>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-mtm-accent">Votre bien</legend>
        <FormField label="Type de bien" htmlFor="confier-type" error={errors.typeBien} required>
          <select id="confier-type" className={fieldInputClass} value={values.typeBien} onChange={(e) => set('typeBien', e.target.value)}>
            <option value="">Choisir…</option>
            {TYPES_BIEN_CONFIE.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Situation actuelle" htmlFor="confier-situation" error={errors.situation} required>
          <select id="confier-situation" className={fieldInputClass} value={values.situation} onChange={(e) => set('situation', e.target.value)}>
            <option value="">Choisir…</option>
            {SITUATIONS_BIEN_CONFIE.map((situation) => (
              <option key={situation.value} value={situation.value}>
                {situation.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Commune ou quartier" htmlFor="confier-commune" error={errors.commune} required>
          <input id="confier-commune" type="text" className={fieldInputClass} value={values.commune} onChange={(e) => set('commune', e.target.value)} />
        </FormField>
        <FormField label="Région" htmlFor="confier-region" error={errors.region}>
          <input id="confier-region" type="text" placeholder="Dakar, Thiès…" className={fieldInputClass} value={values.region} onChange={(e) => set('region', e.target.value)} />
        </FormField>
        {plusieursLogements && (
          <FormField label="Nombre de logements" htmlFor="confier-logements" error={errors.nombreLogements}>
            <input id="confier-logements" type="number" min={1} max={200} inputMode="numeric" className={fieldInputClass} value={values.nombreLogements} onChange={(e) => set('nombreLogements', e.target.value)} />
          </FormField>
        )}
        <FormField label={plusieursLogements ? 'Loyer souhaité par logement (FCFA)' : 'Loyer souhaité par mois (FCFA)'} htmlFor="confier-loyer" error={errors.loyerSouhaite}>
          <input id="confier-loyer" type="number" min={0} step={10000} inputMode="numeric" placeholder="Facultatif" className={fieldInputClass} value={values.loyerSouhaite} onChange={(e) => set('loyerSouhaite', e.target.value)} />
        </FormField>
      </fieldset>

      <FormField label="Précisions" htmlFor="confier-precisions" error={errors.precisions}>
        <textarea
          id="confier-precisions"
          rows={4}
          maxLength={1500}
          placeholder="Une villa divisée en quatre appartements, un bien déjà loué, une demande particulière…"
          className={fieldInputClass}
          value={values.precisions}
          onChange={(e) => set('precisions', e.target.value)}
        />
      </FormField>

      {/* Piège à robots : hors écran, ignoré des lecteurs d'écran et de l'autocomplétion. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="confier-site">Ne pas remplir</label>
        <input id="confier-site" type="text" tabIndex={-1} autoComplete="off" value={piege} onChange={(e) => setPiege(e.target.value)} />
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-mtm-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-mtm-border text-mtm-primary focus:ring-mtm-primary"
            checked={values.consentement}
            onChange={(e) => set('consentement', e.target.checked)}
          />
          <span>
            J’accepte que MTM Immobilier utilise ces informations pour me rappeler au sujet de mon bien. Elles ne sont pas
            transmises à des tiers.
          </span>
        </label>
        {errors.consentement && (
          <p className="mt-1 text-xs font-medium text-mtm-error" role="alert">
            {errors.consentement}
          </p>
        )}
      </div>

      {erreurEnvoi && (
        <p className="rounded-xl border border-mtm-error/30 bg-mtm-error/5 px-4 py-3 text-sm text-mtm-error" role="alert">
          {erreurEnvoi}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="accent" disabled={envoi} className="px-6 py-3 text-[15px]">
          <Send className="h-4 w-4" aria-hidden="true" />
          {envoi ? 'Envoi…' : 'Envoyer ma demande'}
        </Button>
        <p className="text-xs text-mtm-muted">Sans engagement : un conseiller vous rappelle pour en parler.</p>
      </div>
    </form>
  );
}
