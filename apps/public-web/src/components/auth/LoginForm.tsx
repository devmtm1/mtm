import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { PasswordInput } from './PasswordInput';
import { FormField, fieldInputClass } from '../ui/FormField';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';

interface LoginFormProps {
  onRequiresTwoFactor: (identifiant: string, password: string) => void;
  onForgotPassword: () => void;
}

export function LoginForm({ onRequiresTwoFactor, onForgotPassword }: LoginFormProps) {
  const { login } = useAuth();
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(identifiant.trim(), password);
      if (result.requiresTwoFactor) {
        onRequiresTwoFactor(identifiant.trim(), password);
      }
      // Sinon : le contexte est mis à jour, la page parente réagit et redirige.
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Connexion impossible pour le moment.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
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
