import { LinkButton } from '../components/ui/LinkButton';
import { ROUTES } from '../routes';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <span className="font-display text-5xl font-bold text-mtm-primary">404</span>
      <h1 className="font-display text-xl font-bold text-mtm-text">Page introuvable</h1>
      <p className="text-sm text-mtm-muted">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <LinkButton to={ROUTES.home}>Retour à l'accueil</LinkButton>
    </div>
  );
}
