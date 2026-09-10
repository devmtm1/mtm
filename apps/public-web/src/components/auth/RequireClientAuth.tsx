import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context-store';
import { Spinner } from '../ui/Spinner';
import { ROUTES } from '../../routes';

export function RequireClientAuth({ children }: { children: ReactNode }) {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Spinner label="Vérification de votre session..." />
      </div>
    );
  }

  if (!user || user.mustChangePassword) {
    return <Navigate to={ROUTES.clientLogin} replace />;
  }

  return <>{children}</>;
}
