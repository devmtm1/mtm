import { LinkButton } from '../ui/LinkButton';
import { ROUTES } from '../../routes';

export function ContactCtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-lg border border-mtm-border bg-mtm-surface px-6 py-12 text-center shadow-card">
        <h2 className="font-display text-2xl font-bold text-mtm-text">
          Une question ? Un projet en tête ?
        </h2>
        <p className="max-w-xl text-sm text-mtm-muted">
          Notre équipe vous accompagne, où que vous soyez, y compris depuis l'étranger.
        </p>
        <LinkButton to={ROUTES.contact}>Contactez-nous</LinkButton>
      </div>
    </section>
  );
}
