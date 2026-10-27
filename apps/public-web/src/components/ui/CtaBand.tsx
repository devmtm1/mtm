import { ROUTES } from '../../routes';
import { LinkButton } from './LinkButton';

interface CtaBandProps {
  title?: string;
  description?: string;
}

/**
 * Bande d'appel à l'action en fin de page vitrine (à propos, réalisations,
 * projets) : ces pages se terminaient sur le pied de page sans proposer de
 * suite — un visiteur convaincu n'avait rien à cliquer.
 */
export function CtaBand({
  title = 'Un projet au Sénégal ?',
  description = 'Parlons-en : terrains et villas vérifiés, gestion locative, construction ou démarches foncières, notre équipe vous accompagne où que vous soyez.',
}: CtaBandProps) {
  return (
    <section className="bg-mtm-primary-subtle">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl font-bold text-mtm-primary-dark sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-mtm-muted sm:text-base">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton to={ROUTES.catalog}>
            Voir nos biens
          </LinkButton>
          <LinkButton to={ROUTES.contact} variant="secondary">
            Nous contacter
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
