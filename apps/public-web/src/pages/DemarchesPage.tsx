import { PageIntro } from '../components/layout/PageIntro';
import { ContactForm } from '../components/contact/ContactForm';
import { useEditableContent, type EditableStep } from '../hooks/useEditableContent';
import { usePageMetadata } from '../hooks/usePageMetadata';

const FALLBACK_INTRO =
  "Vous envisagez d'acheter un terrain, notamment depuis l'étranger ? Notre équipe se déplace pour vérifier le bien avant votre engagement. Tarif communiqué sur devis selon la nature du dossier.";

const FALLBACK_STEPS: EditableStep[] = [
  { title: 'Demande', description: 'Vous nous transmettez le terrain concerné et vos pièces disponibles.' },
  { title: 'Étude de faisabilité', description: 'Une étude préalable peut être réalisée avant engagement complet.' },
  { title: 'Vérification physique', description: 'Visite sur site : constat, photos, accès, environnement.' },
  {
    title: 'Vérification administrative',
    description: 'Consultation des administrations compétentes (mairie, service des Domaines...).',
  },
  {
    title: 'Rapport',
    description: 'Conclusion structurée et recommandation : favorable, défavorable ou à compléter.',
  },
];

export function DemarchesPage() {
  const { text, steps } = useEditableContent();
  usePageMetadata({
    title: 'Démarches administratives et vérification foncière',
    description:
      'Faites vérifier un terrain au Sénégal avant d’acheter : visite sur site, contrôle administratif et rapport structuré par MTM Immobilier.',
  });

  return (
    <div>
      <PageIntro
        eyebrow="Nos services"
        title="Démarches administratives"
        description={text('demarches.intro', FALLBACK_INTRO)}
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <ol className="flex flex-col gap-4">
          {steps('demarches.etapes', FALLBACK_STEPS).map((step, index) => (
            <li
              key={step.title}
              className="flex items-start gap-4 rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mtm-primary/10 font-display text-sm font-bold text-mtm-primary">
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-mtm-text">{step.title}</h2>
                {step.description && <p className="mt-1 text-sm text-mtm-muted">{step.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-mtm-surface py-14">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <h2 className="text-center font-display text-xl font-bold text-mtm-text">
            Demander une vérification
          </h2>
          <p className="mt-2 text-center text-sm text-mtm-muted">
            Décrivez-nous le terrain concerné, nous revenons vers vous rapidement.
          </p>
          <div className="mt-8">
            <ContactForm initialSujet="Demande de vérification foncière" />
          </div>
        </div>
      </section>
    </div>
  );
}
