import { useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, LogIn, Lock, Mail } from 'lucide-react';
import type { SequencePorte } from './porte/porte-sequence';
import { Button } from '../ui/Button';
import { PasswordInput } from './PasswordInput';
import { FormField, fieldInputClass } from '../ui/FormField';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';

interface LoginFormProps {
  onRequiresTwoFactor: (identifiant: string, password: string) => void;
  onForgotPassword: () => void;
  /** La porte de l'écran de connexion : habillage seulement, elle suit l'issue de la connexion sans la décider. */
  porte?: SequencePorte;
}

/** « Se souvenir de moi » ne garde que l'identifiant (e-mail ou téléphone), jamais le mot de passe. */
const CLE_IDENTIFIANT = 'mtm.connexion.identifiant';

function identifiantMemorise(): string {
  try {
    return window.localStorage.getItem(CLE_IDENTIFIANT) ?? '';
  } catch {
    return '';
  }
}

function memoriserIdentifiant(valeur: string | null): void {
  try {
    if (valeur) window.localStorage.setItem(CLE_IDENTIFIANT, valeur);
    else window.localStorage.removeItem(CLE_IDENTIFIANT);
  } catch {
    // Stockage indisponible (navigation privée…) : la connexion ne dépend pas de ce confort.
  }
}

export function LoginForm({ onRequiresTwoFactor, onForgotPassword, porte }: LoginFormProps) {
  const { login } = useAuth();
  const [identifiant, setIdentifiant] = useState(identifiantMemorise);
  const [souvenir, setSouvenir] = useState(() => identifiantMemorise() !== '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refus, setRefus] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    // Une seule tentative à la fois : pas de double soumission pendant que la clé tourne.
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    porte?.demarrer();
    try {
      const result = await login(identifiant.trim(), password);
      memoriserIdentifiant(souvenir ? identifiant.trim() : null);
      if (result.requiresTwoFactor) {
        porte?.annuler();
        onRequiresTwoFactor(identifiant.trim(), password);
      } else {
        // Le serveur a confirmé : la clé tourne et les battants s'ouvrent, puis la page parente redirige.
        await porte?.reussir();
      }
    } catch (caught) {
      porte?.refuser();
      setError(
        caught instanceof ApiError ? caught.message : 'Connexion impossible pour le moment.',
      );
      setRefus(true);
      window.setTimeout(() => setRefus(false), 500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={`flex flex-col gap-4 ${refus ? 'porte-refus' : ''}`} onSubmit={(event) => void handleSubmit(event)}>
      {/* La petite clé : discrète pendant la saisie, elle se redresse et passe au rouge quand les deux champs sont remplis. */}
      <div className="flex items-center gap-2 text-sm font-semibold text-mtm-primary-dark lg:hidden">
        <KeyRound
          aria-hidden="true"
          className={`h-5 w-5 transition-[transform,color] duration-300 motion-reduce:transition-none ${identifiant.trim() && password ? 'rotate-0 text-mtm-accent' : '-rotate-[35deg] text-mtm-primary-medium'}`}
        />
        Connexion sécurisée
      </div>
      <FormField
        label={
          <span className="inline-flex items-center gap-2.5">
            <Mail className="hidden h-[18px] w-[18px] text-mtm-primary lg:block" aria-hidden="true" />
            E-mail ou numéro de téléphone
          </span>
        }
        htmlFor="login-identifiant"
        required
      >
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mtm-muted lg:hidden">
            <Mail className="h-[18px] w-[18px]" />
          </span>
          <input
            id="login-identifiant"
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="votre@email.com ou 77 123 45 67"
            className={`${fieldInputClass} pl-10 sm:pl-10 lg:pl-3.5`}
            value={identifiant}
            onChange={(event) => setIdentifiant(event.target.value)}
          />
        </div>
      </FormField>

      <FormField
        label={
          <span className="inline-flex items-center gap-2.5">
            <Lock className="hidden h-[18px] w-[18px] text-mtm-primary lg:block" aria-hidden="true" />
            Mot de passe
          </span>
        }
        htmlFor="login-password"
        required
      >
        <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Votre mot de passe" icone={<Lock />} />
      </FormField>

      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex min-h-8 cursor-pointer items-center gap-2.5 text-sm text-mtm-text">
          <input
            type="checkbox"
            checked={souvenir}
            onChange={(event) => setSouvenir(event.target.checked)}
            className="h-[18px] w-[18px] rounded border-mtm-border text-mtm-primary focus:ring-mtm-primary"
          />
          Se souvenir de moi
        </label>
        <button type="button" onClick={onForgotPassword} className="text-sm font-semibold text-mtm-primary hover:underline">
          Mot de passe oublié ?
        </button>
      </div>

      {error && (
        <p className="text-sm font-medium text-mtm-error" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="rounded-xl py-3.5 text-base shadow-[0_8px_18px_-8px_rgba(26,73,116,0.7)]">
        {submitting ? (
          'Connexion...'
        ) : (
          <span className="inline-flex items-center gap-2.5">
            <LogIn className="hidden h-[18px] w-[18px] lg:block" aria-hidden="true" />
            Se connecter
            <ArrowRight className="hidden h-[18px] w-[18px] lg:block" aria-hidden="true" />
          </span>
        )}
      </Button>
    </form>
  );
}
