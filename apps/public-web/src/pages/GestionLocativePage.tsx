import { PageIntro } from '../components/layout/PageIntro';
import { ContactCtaSection } from '../components/home/ContactCtaSection';

const POINTS = [
  'Recherche et sélection de locataires',
  'Encaissement des loyers et suivi des impayés',
  'États des lieux d\'entrée et de sortie',
  'Gestion des cautions et des incidents',
  'Rapports réguliers transmis au propriétaire',
];

export function GestionLocativePage() {
  return (
    <div>
      <PageIntro
        eyebrow="Nos services"
        title="Gestion locative"
        description="Confiez-nous la gestion de vos biens : nous nous occupons des locataires, des loyers et du suivi administratif, pour une tranquillité d'esprit totale."
      />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <ul className="flex flex-col gap-3">
          {POINTS.map((point) => (
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
