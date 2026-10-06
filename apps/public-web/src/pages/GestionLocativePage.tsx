import { PageIntro } from '../components/layout/PageIntro';
import { ContactCtaSection } from '../components/home/ContactCtaSection';
import { useEditableContent } from '../hooks/useEditableContent';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { LinkButton } from '../components/ui/LinkButton';
import { ROUTES } from '../routes';

const FALLBACK_INTRO =
  "Confiez-nous la gestion de vos biens : nous nous occupons des locataires, des loyers et du suivi administratif, pour une tranquillité d'esprit totale.";

const FALLBACK_POINTS = [
  'Recherche et sélection de locataires',
  'Encaissement des loyers et suivi des impayés',
  "États des lieux d'entrée et de sortie",
  'Gestion des cautions et des incidents',
  'Rapports réguliers transmis au propriétaire',
];

export function GestionLocativePage() {
  const { text, lines } = useEditableContent();
  usePageMetadata({
    title: 'Gestion locative',
    description:
      'Confiez la gestion de vos biens au Sénégal à MTM Immobilier : locataires, loyers, états des lieux et rapports réguliers, même depuis l’étranger.',
  });

  return (
    <div>
      <PageIntro
        eyebrow="Nos services"
        title="Gestion locative"
        description={text('gestion-locative.intro', FALLBACK_INTRO)}
      />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <ul className="flex flex-col gap-3">
          {lines('gestion-locative.points', FALLBACK_POINTS).map((point) => (
            <li
              key={point}
              className="rounded-xl border border-mtm-border/70 bg-mtm-surface px-4 py-3.5 text-sm text-mtm-text shadow-card lg:rounded-md lg:border-mtm-border lg:py-3 lg:shadow-none"
            >
              {point}
            </li>
          ))}
        </ul>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-mtm-border/70 bg-mtm-surface p-5 shadow-card sm:flex-row lg:rounded-xl lg:border-mtm-border lg:p-6 sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-mtm-text">Vous cherchez un logement à louer ?</h2>
            <p className="mt-1 text-sm text-mtm-muted">
              Découvrez les appartements, villas et studios que nous gérons et demandez une visite en ligne.
            </p>
          </div>
          <LinkButton to={ROUTES.locations} className="shrink-0">
            Voir les locations
          </LinkButton>
        </div>
      </section>
      <ContactCtaSection />
    </div>
  );
}
