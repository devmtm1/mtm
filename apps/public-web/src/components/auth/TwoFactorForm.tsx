import { useState, type FormEvent } from 'react';
import type { SequencePorte } from './porte/porte-sequence';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';

interface TwoFactorFormProps {
  /** L'identifiant saisi à la connexion (e-mail ou numéro de téléphone). */
  identifiant: string;
  password: string;
  onCancel: () => void;
  /** La porte de l'écran de connexion (habillage seulement). */
  porte?: SequencePorte;
}

export function TwoFactorForm({ identifiant, password, onCancel, porte }: TwoFactorFormProps) {
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refus, setRefus] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    porte?.demarrer();
    try {
      await login(identifiant, password, code.trim());
      // Succès : le serveur a confirmé, la porte s'ouvre, puis la page parente redirige.
      await porte?.reussir();
    } catch (caught) {
      porte?.refuser();
      setError(caught instanceof ApiError ? caught.message : 'Code invalide.');
      setRefus(true);
      window.setTimeout(() => setRefus(false), 500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={`flex flex-col gap-4 ${refus ? 'porte-refus' : ''}`} onSubmit={(event) => void handleSubmit(event)}>
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
