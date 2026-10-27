import { useState } from 'react';
import { CheckCircle2, ChevronDown, Send } from 'lucide-react';
import { sendDevisConstruction } from '../../api/contact';
import { ApiError } from '../../api/client';
import { SITUATIONS_TERRAIN, TYPES_PROJET_CONSTRUCTION } from '../../types/contact';
import { hasErrors, validateDevisConstruction, type DevisConstructionValues, type FieldErrors } from '../../utils/validation';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';

const VIDE: DevisConstructionValues = {
  nom: '',
  email: '',
  telephone: '',
  pays: '',
  typeProjet: '',
  terrain: '',
  commune: '',
  budget: '',
  precisions: '',
  consentement: false,
};

/**
 * Demande de devis : le visiteur décrit son projet (nature, terrain, lieu, budget indicatif). L'équipe construction
 * reçoit la demande déjà qualifiée et rappelle ; rien n'est créé avant sa validation.
 */
export function FormulaireDevis() {
  const [values, setValues] = useState<DevisConstructionValues>(VIDE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  // Piège à robots : un visiteur ne voit pas ce champ, un robot le remplit.
  const [piege, setPiege] = useState('');
  // Les champs facultatifs restent rangés ; ils s'ouvrent d'eux-mêmes si l'un d'eux est en erreur.
  const [detailsOuverts, setDetailsOuverts] = useState(false);

  // Corriger un champ efface son message d'erreur : il ne doit pas rester affiché une fois la saisie valide.
  const set = <K extends keyof DevisConstructionValues>(champ: K, valeur: DevisConstructionValues[K]): void => {
    setValues((precedent) => ({ ...precedent, [champ]: valeur }));
    setErrors((precedentes) => (precedentes[champ] ? { ...precedentes, [champ]: undefined } : precedentes));
  };

  async function envoyer(): Promise<void> {
    const erreurs = validateDevisConstruction(values);
    setErrors(erreurs);
    if (erreurs.pays || erreurs.budget) setDetailsOuverts(true);
    if (hasErrors(erreurs)) return;
    setEnvoi(true);
    setErreurEnvoi(null);
    try {
      await sendDevisConstruction({
        nom: values.nom.trim(),
        email: values.email.trim(),
        telephone: values.telephone.trim(),
        pays: values.pays.trim() || undefined,
        typeProjet: values.typeProjet,
        terrain: values.terrain,
        commune: values.commune.trim(),
        budget: values.budget ? Number(values.budget) : undefined,
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
          Un conseiller MTM vous rappelle très prochainement pour parler de votre projet et préparer votre devis.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      aria-label="Demander un devis de construction"
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void envoyer();
      }}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-mtm-accent">Vous</legend>
        <FormField label="Nom complet" htmlFor="devis-nom" error={errors.nom} required>
          <input id="devis-nom" type="text" autoComplete="name" className={fieldInputClass} value={values.nom} onChange={(e) => set('nom', e.target.value)} />
        </FormField>
        <FormField label="Téléphone ou WhatsApp" htmlFor="devis-telephone" error={errors.telephone} required>
          <input id="devis-telephone" type="tel" autoComplete="tel" className={fieldInputClass} value={values.telephone} onChange={(e) => set('telephone', e.target.value)} />
        </FormField>
        <FormField label="E-mail" htmlFor="devis-email" error={errors.email} required>
          <input id="devis-email" type="email" autoComplete="email" className={fieldInputClass} value={values.email} onChange={(e) => set('email', e.target.value)} />
        </FormField>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-mtm-accent">Votre projet</legend>
        <FormField label="Nature du projet" htmlFor="devis-type" error={errors.typeProjet} required>
          <select id="devis-type" className={fieldInputClass} value={values.typeProjet} onChange={(e) => set('typeProjet', e.target.value)}>
            <option value="">Choisir…</option>
            {TYPES_PROJET_CONSTRUCTION.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Terrain" htmlFor="devis-terrain" error={errors.terrain} required>
          <select id="devis-terrain" className={fieldInputClass} value={values.terrain} onChange={(e) => set('terrain', e.target.value)}>
            <option value="">Choisir…</option>
            {SITUATIONS_TERRAIN.map((situation) => (
              <option key={situation.value} value={situation.value}>
                {situation.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Commune ou quartier" htmlFor="devis-commune" error={errors.commune} required>
          <input id="devis-commune" type="text" className={fieldInputClass} value={values.commune} onChange={(e) => set('commune', e.target.value)} />
        </FormField>
      </fieldset>

      <div>
        <button
          type="button"
          aria-expanded={detailsOuverts}
          aria-controls="devis-details"
          onClick={() => setDetailsOuverts((etat) => !etat)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-mtm-primary hover:text-mtm-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
        >
          {detailsOuverts ? 'Moins de détails' : 'Plus de détails (facultatif)'}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${detailsOuverts ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {detailsOuverts && (
          <div id="devis-details" className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Pays de résidence" htmlFor="devis-pays" error={errors.pays}>
            <input id="devis-pays" type="text" autoComplete="country-name" placeholder="Sénégal, France…" className={fieldInputClass} value={values.pays} onChange={(e) => set('pays', e.target.value)} />
          </FormField>
          <FormField label="Budget indicatif (FCFA)" htmlFor="devis-budget" error={errors.budget}>
            <input id="devis-budget" type="number" min={0} step={1000000} inputMode="numeric" placeholder="Facultatif" className={fieldInputClass} value={values.budget} onChange={(e) => set('budget', e.target.value)} />
          </FormField>
          </div>
        )}
      </div>

      <FormField label="Précisions" htmlFor="devis-precisions" error={errors.precisions}>
        <textarea
          id="devis-precisions"
          rows={4}
          maxLength={1500}
          placeholder="Nombre de chambres, plans déjà prêts, délai souhaité…"
          className={fieldInputClass}
          value={values.precisions}
          onChange={(e) => set('precisions', e.target.value)}
        />
      </FormField>

      {/* Piège à robots : hors écran, ignoré des lecteurs d'écran et de l'autocomplétion. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="devis-site">Ne pas remplir</label>
        <input id="devis-site" type="text" tabIndex={-1} autoComplete="off" value={piege} onChange={(e) => setPiege(e.target.value)} />
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
            J’accepte que MTM Immobilier utilise ces informations pour me rappeler au sujet de mon projet. Elles ne sont
            pas transmises à des tiers.
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
          {envoi ? 'Envoi…' : 'Demander mon devis'}
        </Button>
        <p className="text-xs text-mtm-muted">Sans engagement : un conseiller vous rappelle pour en parler.</p>
      </div>
    </form>
  );
}
