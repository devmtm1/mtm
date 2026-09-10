import { PageIntro } from '../components/layout/PageIntro';
import { ContactCtaSection } from '../components/home/ContactCtaSection';

const STEPS = [
  { title: 'Étude et devis', description: "Analyse de votre terrain et de votre programme, chiffrage détaillé." },
  { title: 'Planification', description: 'Planning de chantier avec jalons et points de contrôle réguliers.' },
  { title: 'Suivi de chantier', description: 'Journal de chantier, photos et rapports partagés avec vous.' },
  { title: 'Livraison', description: 'Réception des travaux et remise des documents du projet.' },
];

export function ConstructionPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Nos services"
        title="Construction"
        description="Du devis à la livraison, MTM Immobilier accompagne vos projets de construction avec un suivi rigoureux et transparent."
      />
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <ol className="grid gap-6 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card">
              <span className="font-display text-xl font-bold text-mtm-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-2 font-display text-base font-bold text-mtm-text">{step.title}</h2>
              <p className="mt-1 text-sm text-mtm-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
      <ContactCtaSection />
    </div>
  );
}
