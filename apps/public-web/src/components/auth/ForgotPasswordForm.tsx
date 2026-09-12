import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { ApiError } from '../../api/client';
import { confirmPasswordReset, requestPasswordReset } from '../../api/auth';
import { PASSWORD_HELP_TEXT, validatePasswordComplexity } from '../../utils/password';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  /** Jeton reçu par e-mail (lien « ?reset=… ») : on saute directement à l'étape de saisie du mot de passe. */
  initialToken?: string;
}

export function ForgotPasswordForm({ onBackToLogin, initialToken }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<'request' | 'sent' | 'confirm' | 'done'>(
    initialToken ? 'confirm' : 'request',
  );
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(email.trim());
      // Hors production, l'API renvoie le jeton directement (pas encore de
      // fournisseur e-mail/SMS branché) — on préremplit pour fluidifier la recette.
      if (result.developmentToken) setToken(result.developmentToken);
      setStep('sent');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "L'envoi a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(event: FormEvent): Promise<void> {
    event.preventDefault();
    const complexityError = validatePasswordComplexity(newPassword);
    if (complexityError) {
      setError(complexityError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await confirmPasswordReset(token.trim(), newPassword);
      setStep('done');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Le jeton est invalide ou expiré.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-mtm-success" aria-hidden="true" />
        <p className="font-semibold text-mtm-text">Mot de passe mis à jour</p>
        <Button onClick={onBackToLogin}>Se connecter</Button>
      </div>
    );
  }

  if (step === 'sent' || step === 'confirm') {
    return (
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleConfirm(event)}>
        <p className="text-sm text-mtm-muted">
          Si un compte existe pour cette adresse, un jeton de réinitialisation a été généré.
          Collez-le ci-dessous avec votre nouveau mot de passe.
        </p>
        <FormField label="Jeton reçu" htmlFor="reset-token" required>
          <input
            id="reset-token"
            type="text"
            required
            className={fieldInputClass}
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </FormField>
        <FormField label="Nouveau mot de passe" htmlFor="reset-password" required>
          <input
            id="reset-password"
            type="password"
            required
            autoComplete="new-password"
            className={fieldInputClass}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </FormField>
        <p className="text-xs text-mtm-muted">{PASSWORD_HELP_TEXT}</p>

        {error && (
          <p className="text-sm font-medium text-mtm-error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
        </Button>
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-sm font-semibold text-mtm-primary hover:underline"
        >
          Retour à la connexion
        </button>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleRequest(event)}>
      <p className="text-sm text-mtm-muted">
        Indiquez votre e-mail : nous générons un jeton de réinitialisation.
      </p>
      <FormField label="E-mail" htmlFor="forgot-email" required>
        <input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          className={fieldInputClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>

      {error && (
        <p className="text-sm font-medium text-mtm-error" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Envoi...' : 'Envoyer'}
      </Button>
      <button
        type="button"
        onClick={onBackToLogin}
        className="text-sm font-semibold text-mtm-primary hover:underline"
      >
        Retour à la connexion
      </button>
    </form>
  );
}
