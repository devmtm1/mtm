import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { ApiError } from '../../api/client';
import { changePassword } from '../../api/auth';
import { useAuth } from '../../contexts/auth-context-store';
import { PASSWORD_HELP_TEXT, validatePasswordComplexity } from '../../utils/password';

export function ChangePasswordForm() {
  const { accessToken, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken) return;

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    const complexityError = validatePasswordComplexity(newPassword);
    if (complexityError) {
      setError(complexityError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await changePassword(accessToken, currentPassword, newPassword);
      await refreshUser();
      // refreshUser() bascule user.mustChangePassword à false : la page
      // parente réagit et redirige automatiquement vers le portail.
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Le changement de mot de passe a échoué.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <p className="text-sm text-mtm-muted">
        Pour votre sécurité, vous devez choisir un nouveau mot de passe avant d'accéder à votre
        espace.
      </p>

      <FormField label="Mot de passe actuel" htmlFor="cp-current" required>
        <input
          id="cp-current"
          type="password"
          required
          autoComplete="current-password"
          className={fieldInputClass}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </FormField>

      <FormField label="Nouveau mot de passe" htmlFor="cp-new" required>
        <input
          id="cp-new"
          type="password"
          required
          autoComplete="new-password"
          className={fieldInputClass}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </FormField>

      <FormField label="Confirmer le nouveau mot de passe" htmlFor="cp-confirm" required>
        <input
          id="cp-confirm"
          type="password"
          required
          autoComplete="new-password"
          className={fieldInputClass}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </FormField>
      <p className="text-xs text-mtm-muted">{PASSWORD_HELP_TEXT}</p>

      {error && (
        <p className="text-sm font-medium text-mtm-error" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Enregistrement...' : 'Mettre à jour le mot de passe'}
      </Button>
    </form>
  );
}
