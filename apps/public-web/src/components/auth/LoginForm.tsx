import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
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

export function LoginForm({ onRequiresTwoFactor, onForgotPassword, porte }: LoginFormProps) {
  const { login } = useAuth();
  const [identifiant, setIdentifiant] = useState('');
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
      <div className="flex items-center gap-2 text-sm font-semibold text-mtm-primary-dark">
        <KeyRound
          aria-hidden="true"
          className={`h-5 w-5 transition-[transform,color] duration-300 motion-reduce:transition-none ${identifiant.trim() && password ? 'rotate-0 text-mtm-accent' : '-rotate-[35deg] text-mtm-primary-medium'}`}
        />
        Connexion sécurisée
      </div>
      <FormField label="E-mail ou numéro de téléphone" htmlFor="login-identifiant" required>
        <input
          id="login-identifiant"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="awa@exemple.sn ou 77 123 45 67"
          className={fieldInputClass}
          value={identifiant}
          onChange={(event) => setIdentifiant(event.target.value)}
        />
      </FormField>

      <FormField label="Mot de passe" htmlFor="login-password" required>
        <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
      </FormField>

      {error && (
        <p className="text-sm font-medium text-mtm-error" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Connexion...' : 'Se connecter'}
      </Button>

      <button
        type="button"
        onClick={onForgotPassword}
        className="text-sm font-semibold text-mtm-primary hover:underline"
      >
        Mot de passe oublié ?
      </button>
    </form>
  );
}
