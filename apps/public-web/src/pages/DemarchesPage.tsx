import { BadgeCheck, Clock, Coins, MessageCircle } from 'lucide-react';
import { PageIntro } from '../components/layout/PageIntro';
import { ContactForm } from '../components/contact/ContactForm';
import { useEditableContent, type EditableStep } from '../hooks/useEditableContent';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { useSiteContact } from '../hooks/useSiteContact';

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

/**
 * Réassurance courte sous l'intro : délai de réponse, gratuité du devis,
 * facteurs de prix — sans jamais afficher de montant, le cahier des charges
 * interdisant de figer un tarif ailleurs que dans les paramètres.
 */
const FALLBACK_REASSURANCE = [
  'Réponse sous 24 à 48h',
  'Devis gratuit, sans engagement',
  "Tarif adapté à la nature et à l'urgence de la vérification",
];

const REASSURANCE_ICONS = [Clock, BadgeCheck, Coins];

const WHATSAPP_MESSAGE = 'Bonjour, je souhaite demander une vérification foncière.';

export function DemarchesPage() {
  const { text, lines, steps } = useEditableContent();
  const { whatsapp } = useSiteContact();
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
      >
        <a
          href="#demande-verification"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-mtm-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-mtm-primary-dark"
        >
          Demander une vérification
        </a>
      </PageIntro>

      <section className="border-b border-mtm-border bg-mtm-bg">
        <ul className="mx-auto flex max-w-4xl flex-col gap-2.5 px-4 py-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-2 sm:px-6">
          {lines('demarches.reassurance', FALLBACK_REASSURANCE).map((item, index) => {
            const Icon = REASSURANCE_ICONS[index] ?? BadgeCheck;
            return (
              <li key={item} className="flex items-center gap-2 text-sm font-medium text-mtm-text">
                <Icon className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
                {item}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <ol className="flex flex-col gap-4">
          {steps('demarches.etapes', FALLBACK_STEPS).map((step, index) => (
            <li
              key={step.title}
              className="flex items-start gap-4 rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mtm-primary-subtle font-display text-sm font-bold text-mtm-primary">
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

      <section id="demande-verification" className="scroll-mt-20 bg-mtm-surface py-14">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <h2 className="text-center font-display text-xl font-bold text-mtm-text">
            Demander une vérification
          </h2>
          <p className="mt-2 text-center text-sm text-mtm-muted">
            Décrivez-nous le terrain concerné, nous revenons vers vous rapidement.
          </p>

          {/* WhatsApp mis en avant à côté du formulaire, canal privilégié de la
              clientèle expatriée (section 4 du cahier des charges) — en plus
              de la bulle flottante présente sur tout le site. */}
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center justify-center gap-2 rounded-md border border-mtm-success bg-mtm-success/5 px-4 py-3 text-sm font-semibold text-mtm-success transition-colors hover:bg-mtm-success/10"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Discuter directement sur WhatsApp
          </a>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-mtm-muted">
            <span className="h-px flex-1 bg-mtm-border" aria-hidden="true" />
            ou remplissez le formulaire
            <span className="h-px flex-1 bg-mtm-border" aria-hidden="true" />
          </div>

          <ContactForm initialSujet="Demande de vérification foncière" />
        </div>
      </section>
    </div>
  );
}
