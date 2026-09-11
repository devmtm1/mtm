import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageIntro } from '../components/layout/PageIntro';
import { LoginForm } from '../components/auth/LoginForm';
import { TwoFactorForm } from '../components/auth/TwoFactorForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { ChangePasswordForm } from '../components/auth/ChangePasswordForm';
import { useAuth } from '../contexts/auth-context-store';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ROUTES } from '../routes';

type ViewMode = 'login' | 'twoFactor' | 'forgotPassword';

export function LoginPage() {
  const { user, bootstrapping } = useAuth();
  usePageMetadata({ title: 'Connexion à l’espace client' });
  const [mode, setMode] = useState<ViewMode>('login');
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

  if (bootstrapping) return null;

  // Connecté et mot de passe à jour : rien à faire ici.
  if (user && !user.mustChangePassword) {
    return <Navigate to={ROUTES.clientPortal} replace />;
  }

  return (
    <div className="bg-mtm-surface">
      <PageIntro eyebrow="Espace client" title="Accédez à votre espace" />
      <div className="mx-auto max-w-md px-4 pb-16 sm:px-6">
        <div className="rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card">
          {user?.mustChangePassword ? (
            <ChangePasswordForm />
          ) : mode === 'twoFactor' && pendingCredentials ? (
            <TwoFactorForm
              email={pendingCredentials.email}
              password={pendingCredentials.password}
              onCancel={() => setMode('login')}
            />
          ) : mode === 'forgotPassword' ? (
            <ForgotPasswordForm onBackToLogin={() => setMode('login')} />
          ) : (
            <LoginForm
              onRequiresTwoFactor={(email, password) => {
                setPendingCredentials({ email, password });
                setMode('twoFactor');
              }}
              onForgotPassword={() => setMode('forgotPassword')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
