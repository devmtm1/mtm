import { PageIntro } from '../components/layout/PageIntro';
import { ContactCtaSection } from '../components/home/ContactCtaSection';
import { useEditableContent } from '../hooks/useEditableContent';
import { usePageMetadata } from '../hooks/usePageMetadata';

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
              className="rounded-md border border-mtm-border bg-mtm-surface px-4 py-3 text-sm text-mtm-text"
            >
              {point}
            </li>
          ))}
        </ul>
      </section>
      <ContactCtaSection />
    </div>
  );
}
