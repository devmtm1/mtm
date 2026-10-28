import { useEffect, useState, type FormEvent } from 'react';
import { Mail, MessageCircle, Smartphone } from 'lucide-react';
import { ApiError } from '../../api/client';
import { fetchPreferences, savePreferences, type PreferencesClient } from '../../api/notifications';
import { useAuth } from '../../contexts/auth-context-store';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/toast-store';
import { ClientCard } from './shell/ClientUi';

type Canal = 'email' | 'sms' | 'whatsapp';

const CANAUX: { cle: Canal; libelle: string; aide: string; icone: typeof Mail }[] = [
  { cle: 'email', libelle: 'E-mail', aide: 'Paiements validés, réponses de MTM, documents disponibles.', icone: Mail },
  { cle: 'sms', libelle: 'SMS', aide: 'Un message court sur votre téléphone.', icone: Smartphone },
  { cle: 'whatsapp', libelle: 'WhatsApp', aide: 'Un message sur WhatsApp, au même numéro.', icone: MessageCircle },
];

function Interrupteur({ id, actif, onChange, libelle }: { id: string; actif: boolean; onChange: (actif: boolean) => void; libelle: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      onClick={() => onChange(!actif)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary ${
        actif ? 'bg-mtm-success' : 'bg-mtm-border'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${actif ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

/**
 * Coordonnées et notifications du client : son numéro de téléphone et les canaux par lesquels MTM le prévient. L'adresse
 * e-mail est son identifiant de connexion : elle ne se change pas ici, son conseiller s'en charge après vérification.
 * SMS et WhatsApp n'apparaissent que si MTM les a activés.
 */
export function PreferencesCompte() {
  const { accessToken, user } = useAuth();
  const toast = useToast();
  const [preferences, setPreferences] = useState<PreferencesClient | null>(null);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [telephone, setTelephone] = useState('');
  const [canaux, setCanaux] = useState<Record<Canal, boolean>>({ email: true, sms: false, whatsapp: false });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let annule = false;
    fetchPreferences(accessToken)
      .then((recues) => {
        if (annule) return;
        setPreferences(recues);
        setTelephone(recues.telephone);
        setCanaux({ email: recues.email, sms: recues.sms, whatsapp: recues.whatsapp });
      })
      .catch(() => {
        if (!annule) setErreurChargement(true);
      });
    return () => {
      annule = true;
    };
  }, [accessToken]);

  async function enregistrer(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const enregistrees = await savePreferences(accessToken, { telephone, ...canaux });
      setPreferences(enregistrees);
      setTelephone(enregistrees.telephone);
      setCanaux({ email: enregistrees.email, sms: enregistrees.sms, whatsapp: enregistrees.whatsapp });
      toast.show('Préférences enregistrées');
    } catch (caught) {
      setErreur(caught instanceof ApiError ? caught.message : "Nous n'avons pas pu enregistrer vos préférences.");
    } finally {
      setEnvoi(false);
    }
  }

  if (erreurChargement) {
    return (
      <ClientCard title="Mes coordonnées et notifications">
        <p className="text-sm text-mtm-muted">Impossible de charger vos préférences pour le moment. Réessayez dans un instant.</p>
      </ClientCard>
    );
  }

  const disponibles = CANAUX.filter(({ cle }) => cle === 'email' || preferences?.canaux[cle]);

  return (
    <ClientCard title="Mes coordonnées et notifications">
      {!preferences ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(event) => void enregistrer(event)}>
          <FormField label="Téléphone" htmlFor="pref-telephone">
            <input
              id="pref-telephone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={fieldInputClass}
              placeholder="+221 77 123 45 67"
              value={telephone}
              onChange={(event) => setTelephone(event.target.value)}
            />
          </FormField>
          <p className="-mt-2 text-xs text-mtm-muted">
            Adresse e-mail de connexion : <span className="font-semibold text-mtm-text">{user?.email}</span>. Pour la changer, demandez à votre
            conseiller.
          </p>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-semibold text-mtm-text">Me prévenir par</legend>
            <ul className="divide-y divide-mtm-border">
              {disponibles.map(({ cle, libelle, aide, icone: Icone }) => (
                <li key={cle} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
                    <Icone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <label htmlFor={`pref-${cle}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block text-[15px] font-semibold text-mtm-text">{libelle}</span>
                    <span className="block text-xs text-mtm-muted">{aide}</span>
                  </label>
                  <Interrupteur
                    id={`pref-${cle}`}
                    libelle={libelle}
                    actif={canaux[cle]}
                    onChange={(actif) => setCanaux((courants) => ({ ...courants, [cle]: actif }))}
                  />
                </li>
              ))}
            </ul>
            <p className="text-xs text-mtm-muted">
              Les notifications restent toujours visibles dans votre espace, quelle que soit votre préférence.
              {disponibles.length > 1 && ' SMS et WhatsApp nécessitent un numéro de téléphone.'}
            </p>
          </fieldset>

          {erreur && (
            <p className="text-sm font-medium text-mtm-error" role="alert">
              {erreur}
            </p>
          )}
          <Button type="submit" disabled={envoi} className="w-full sm:w-auto sm:self-start">
            {envoi ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </form>
      )}
    </ClientCard>
  );
}
