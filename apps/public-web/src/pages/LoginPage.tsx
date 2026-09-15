import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { FileText, ShieldCheck, Wallet } from 'lucide-react';
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
  // Lien de réinitialisation reçu par e-mail : ouvre directement le formulaire.
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('reset') ?? undefined;
  const [mode, setMode] = useState<ViewMode>(resetToken ? 'forgotPassword' : 'login');
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

  if (bootstrapping) return null;

  // Connecté et mot de passe à jour : rien à faire ici.
  if (user && !user.mustChangePassword) {
    return <Navigate to={ROUTES.clientPortal} replace />;
  }

  return (
    <div className="bg-mtm-surface">
      <PageIntro
        eyebrow="Espace client"
        title="Accédez à votre espace"
        description="Suivez vos dossiers, vos paiements et vos documents, où que vous soyez."
      />
      <div className="mx-auto max-w-md px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="rounded-lg border border-mtm-border bg-mtm-surface p-5 shadow-card sm:p-6">
          {user?.mustChangePassword ? (
            <ChangePasswordForm />
          ) : mode === 'twoFactor' && pendingCredentials ? (
            <TwoFactorForm
              email={pendingCredentials.email}
              password={pendingCredentials.password}
              onCancel={() => setMode('login')}
            />
          ) : mode === 'forgotPassword' ? (
            <ForgotPasswordForm onBackToLogin={() => setMode('login')} initialToken={resetToken} />
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

        {/* Ce qu'on y trouve, et comment obtenir un accès : l'espace n'est
            pas en libre inscription, c'est le conseiller qui l'ouvre. */}
        <ul className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-mtm-muted">
          <li className="flex flex-col items-center gap-1.5 rounded-md border border-mtm-border bg-mtm-surface px-2 py-3">
            <Wallet className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
            Paiements et échéances
          </li>
          <li className="flex flex-col items-center gap-1.5 rounded-md border border-mtm-border bg-mtm-surface px-2 py-3">
            <FileText className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
            Reçus et contrats
          </li>
          <li className="flex flex-col items-center gap-1.5 rounded-md border border-mtm-border bg-mtm-surface px-2 py-3">
            <ShieldCheck className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
            Accès sécurisé
          </li>
        </ul>
        <p className="mt-4 text-center text-sm text-mtm-muted">
          Pas encore d'accès ? Votre conseiller MTM vous l'ouvre sur simple demande :{' '}
          <Link to={ROUTES.contact} className="font-semibold text-mtm-primary hover:underline">
            contactez-nous
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
