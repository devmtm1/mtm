import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LinkButton } from '../components/ui/LinkButton';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ROUTES } from '../routes';

/** Les endroits où un visiteur égaré a le plus de chances de retrouver ce qu'il cherchait. */
const ACCES = [
  { libelle: 'Nos biens à vendre', to: ROUTES.catalog },
  { libelle: 'Locations disponibles', to: ROUTES.locations },
  { libelle: 'Gestion locative', to: ROUTES.gestionLocative },
  { libelle: 'Construction', to: ROUTES.construction },
  { libelle: 'Démarches administratives', to: ROUTES.demarches },
  { libelle: 'Nous contacter', to: ROUTES.contact },
];

export function NotFoundPage() {
  usePageMetadata({ title: 'Page introuvable', noindex: true });

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
      <span className="font-display text-5xl font-bold text-mtm-primary">404</span>
      <h1 className="font-display text-xl font-bold text-mtm-text">Page introuvable</h1>
      <p className="text-sm text-mtm-muted">
        La page que vous recherchez n'existe pas ou a été déplacée. Voici où poursuivre.
      </p>
      <ul className="mt-2 grid w-full gap-2 sm:grid-cols-2">
        {ACCES.map(({ libelle, to }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-mtm-border/70 bg-mtm-surface px-4 py-2 text-sm font-semibold text-mtm-text shadow-card transition-colors hover:border-mtm-primary hover:text-mtm-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-mtm-primary"
            >
              {libelle}
              <ArrowRight className="h-4 w-4 shrink-0 text-mtm-accent" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <LinkButton to={ROUTES.home} variant="secondary" className="mt-2">
        Retour à l'accueil
      </LinkButton>
    </div>
  );
}
