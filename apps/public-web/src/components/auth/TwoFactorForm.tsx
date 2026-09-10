import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';

interface TwoFactorFormProps {
  email: string;
  password: string;
  onCancel: () => void;
}

export function TwoFactorForm({ email, password, onCancel }: TwoFactorFormProps) {
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, code.trim());
      // Succès : le contexte est mis à jour, la page parente redirige.
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Code invalide.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <p className="text-sm text-mtm-muted">
        Entrez le code à 6 chiffres généré par votre application d'authentification.
      </p>
      <FormField label="Code de vérification" htmlFor="login-2fa" required>
        <input
          id="login-2fa"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className={fieldInputClass}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </FormField>

      {error && (
        <p className="text-sm font-medium text-mtm-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Retour
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Vérification...' : 'Valider'}
        </Button>
      </div>
    </form>
  );
}
