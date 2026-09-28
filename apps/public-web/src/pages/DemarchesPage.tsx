import { useState } from 'react';
import { BadgeCheck, Clock, Coins } from 'lucide-react';
import { PageIntro } from '../components/layout/PageIntro';
import { ContactForm } from '../components/contact/ContactForm';
import { ContactModal } from '../components/contact/ContactModal';
import { DemandeWhatsAppCta } from '../components/contact/DemandeWhatsAppCta';
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

/**
 * Prestations annoncées par la direction. Elles vivent dans des blocs de
 * contenu : la liste des services évolue au rythme du commerce, pas au rythme
 * des déploiements. Format « titre | description », une par ligne.
 */
const FALLBACK_PRESTATIONS: EditableStep[] = [
  {
    title: 'Vérification avant achat',
    description:
      'Contrôle du terrain et de sa situation administrative avant votre engagement.',
  },
  {
    title: 'Dépôt de mutation',
    description: 'Transfert de propriété déposé au service des Impôts et Domaines.',
  },
  {
    title: 'Dépôt de bail',
    description: 'Constitution du dossier et dépôt auprès du service compétent.',
  },
  {
    title: 'Dépôt d’autorisation de construire',
    description: 'Demande déposée auprès de la mairie, suivie jusqu’à la décision.',
  },
  {
    title: 'Retrait de documents',
    description:
      'Retrait de vos pièces auprès des mairies ou des services des Impôts et Domaines.',
  },
  {
    title: 'Autres démarches foncières',
    description: 'Décrivez votre besoin : nous vous disons si nous pouvons le traiter.',
  },
];

const FALLBACK_PRESTATIONS_TECHNIQUES: EditableStep[] = [
  {
    title: 'Plans architecturaux',
    description: 'Conception de vos plans par un architecte.',
  },
  {
    title: 'Plans de géomètre',
    description: 'Levé, bornage et plan établis par un géomètre.',
  },
];

// La page couvre désormais sept prestations : un message pré-rempli qui ne
// parle que de vérification ferait mal partir la conversation pour celui
// qui vient déposer une mutation.
const WHATSAPP_MESSAGE =
  'Bonjour, je souhaite faire une demande auprès de MTM.';

export function DemarchesPage() {
  const { text, lines, steps } = useEditableContent();
  const { whatsappDemarches } = useSiteContact();
  const [demandeOuverte, setDemandeOuverte] = useState(false);

  const prestations = steps('demarches.prestations', FALLBACK_PRESTATIONS);
  const prestationsTechniques = steps(
    'demarches.prestations-techniques',
    FALLBACK_PRESTATIONS_TECHNIQUES,
  );
  // Le visiteur choisit son sujet parmi les prestations réellement annoncées :
  // la liste suit le catalogue édité en back-office au lieu d'une énumération
  // figée qui finirait par mentir sur ce que MTM propose.
  const sujets = [...prestations, ...prestationsTechniques].map(
    (presta) => presta.title,
  );
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
        {/* La page annonce sept prestations et décrit un parcours : le
            formulaire est à trois écrans d'ici. Celui qui clique a déjà
            décidé, on lui ouvre la fenêtre plutôt que de le faire défiler.
            La section de bas de page reste en place pour celui qui lit tout
            et arrive convaincu. */}
        <button
          type="button"
          onClick={() => setDemandeOuverte(true)}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-mtm-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-mtm-primary-dark"
        >
          Faire une demande
        </button>
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

      <section className="mx-auto max-w-4xl px-4 pt-14 sm:px-6">
        <h2 className="font-display text-xl font-bold text-mtm-text">Nos prestations</h2>
        <p className="mt-2 text-sm text-mtm-muted">
          Au Sénégal ou depuis l’étranger, nous prenons en charge vos démarches auprès
          des administrations.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {prestations.map((presta) => (
            <li
              key={presta.title}
              className="rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card"
            >
              <h3 className="font-display text-sm font-bold text-mtm-text">{presta.title}</h3>
              {presta.description && (
                <p className="mt-1 text-sm text-mtm-muted">{presta.description}</p>
              )}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 font-display text-xl font-bold text-mtm-text">
          Services techniques
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {prestationsTechniques.map(
            (presta) => (
              <li
                key={presta.title}
                className="rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card"
              >
                <h3 className="font-display text-sm font-bold text-mtm-text">{presta.title}</h3>
                {presta.description && (
                  <p className="mt-1 text-sm text-mtm-muted">{presta.description}</p>
                )}
              </li>
            ),
          )}
        </ul>
      </section>

      {/* Le parcours en cinq étapes ne décrit que la vérification avant achat :
          un dépôt de mutation ne suit pas ces étapes. Le titre le dit, pour ne
          pas laisser croire que toute demande passe par une visite de terrain. */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 font-display text-xl font-bold text-mtm-text">
          Comment se déroule une vérification avant achat
        </h2>
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
                <h3 className="font-display text-base font-bold text-mtm-text">{step.title}</h3>
                {step.description && <p className="mt-1 text-sm text-mtm-muted">{step.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* L'ancre garde son nom d'origine bien que la section couvre désormais
          toutes les prestations : des liens « #demande-verification » ont pu
          être partagés, les renommer les casserait pour rien. */}
      <section id="demande-verification" className="scroll-mt-20 bg-mtm-surface py-14">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <h2 className="text-center font-display text-xl font-bold text-mtm-text">
            Faire une demande
          </h2>
          <p className="mt-2 text-center text-sm text-mtm-muted">
            Dites-nous ce dont vous avez besoin, nous revenons vers vous rapidement.
          </p>

          {/* Les démarches administratives sont suivies directement par la
              direction : ce bouton pointe sur son numéro, distinct du numéro
              général, en plus de la bulle flottante présente sur tout le site. */}
          <div className="mt-6">
            <DemandeWhatsAppCta numero={whatsappDemarches} message={WHATSAPP_MESSAGE} />
          </div>

          <ContactForm initialSujet={sujets[0]} sujetOptions={sujets} />
        </div>
      </section>

      {demandeOuverte && (
        <ContactModal
          title="Faire une demande"
          initialSujet={sujets[0]}
          sujetOptions={sujets}
          intro={
            <DemandeWhatsAppCta numero={whatsappDemarches} message={WHATSAPP_MESSAGE} />
          }
          onClose={() => setDemandeOuverte(false)}
        />
      )}
    </div>
  );
}
