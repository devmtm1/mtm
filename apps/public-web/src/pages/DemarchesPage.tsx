import { useState } from 'react';
import { BandeauDemarches } from '../components/demarches/BandeauDemarches';
import { IMAGE_BANDEAU_DEMARCHES } from '../utils/demarches';
import { ContactModal } from '../components/contact/ContactModal';
import { DemandeWhatsAppCta } from '../components/contact/DemandeWhatsAppCta';
import { CarteDemarche } from '../components/demarches/CarteDemarche';
import { ParcoursVerification } from '../components/demarches/ParcoursVerification';
import { SectionDemande } from '../components/demarches/SectionDemande';
import { useEditableContent, type EditableStep } from '../hooks/useEditableContent';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { useSiteContact } from '../hooks/useSiteContact';

const FALLBACK_INTRO =
  "Vous envisagez d'acheter un terrain ou une villa, notamment depuis l'étranger ? Notre équipe se déplace pour vérifier le bien avant votre engagement.";

const FALLBACK_CONTACT_INTRO =
  'Dites-nous ce dont vous avez besoin : nous vous répondons rapidement et vous disons ce que nous pouvons faire pour vous.';

const FALLBACK_STEPS: EditableStep[] = [
  { title: 'Demande', description: 'Vous nous transmettez le bien concerné et vos pièces disponibles.' },
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

/**
 * Prestations annoncées par la direction. Elles vivent dans des blocs de
 * contenu : la liste des services évolue au rythme du commerce, pas au rythme
 * des déploiements. Format « titre | description », une par ligne.
 */
const FALLBACK_PRESTATIONS: EditableStep[] = [
  {
    title: 'Vérification avant achat',
    description:
      'Contrôle du bien et de sa situation administrative avant votre engagement.',
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
  const { text, lines, steps, loading: contenuEnCours } = useEditableContent();
  const { whatsappDemarches } = useSiteContact();
  const [demandeOuverte, setDemandeOuverte] = useState(false);
  // La démarche sur laquelle le visiteur a cliqué : la demande s'ouvre avec ce sujet déjà choisi.
  const [sujetChoisi, setSujetChoisi] = useState<string | undefined>(undefined);
  const demander = (sujet?: string) => {
    setSujetChoisi(sujet);
    setDemandeOuverte(true);
  };

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
    <div className="font-['Poppins',ui-sans-serif,system-ui,sans-serif]">
      {/* Celui qui clique sur « Faire une demande » a déjà décidé : on lui ouvre la fenêtre plutôt que de le
          faire défiler. La section de bas de page reste en place pour celui qui lit tout et arrive convaincu. */}
      <BandeauDemarches
        eyebrow={text('demarches.eyebrow', 'Nos services')}
        title={text('demarches.title', 'Démarches administratives')}
        description={text('demarches.intro', FALLBACK_INTRO)}
        points={lines('demarches.reassurance', FALLBACK_REASSURANCE)}
        bouton={text('demarches.bouton', 'Faire une demande')}
        image={text('demarches.image', IMAGE_BANDEAU_DEMARCHES)}
        chargement={contenuEnCours}
        onDemande={() => demander()}
      />

      {/* Une seule police et une seule palette sur toute la page, celles du bandeau. */}
      <section id="prestations" className="scroll-mt-20 bg-[#F5F8FB] py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[14px] font-bold uppercase tracking-wide text-[#C8102E]">Nos prestations</p>
            <h2 className="mt-3 text-[28px] font-extrabold leading-tight text-[#12365A] sm:text-[34px]">
              Quelle démarche vous concerne ?
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-[#34465A]">
              Au Sénégal ou depuis l’étranger, nous prenons en charge vos démarches auprès des administrations.
              Choisissez la vôtre : la demande s’ouvre déjà préremplie.
            </p>
          </div>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {prestations.map((presta) => (
              <CarteDemarche key={presta.title} titre={presta.title} description={presta.description} onDemande={demander} />
            ))}
          </ul>

          {prestationsTechniques.length > 0 && (
            <>
              <h3 className="mt-14 text-[20px] font-bold text-[#12365A]">Services techniques</h3>
              <p className="mt-1 text-[15px] text-[#34465A]">Les plans et relevés dont votre dossier peut avoir besoin.</p>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {prestationsTechniques.map((presta) => (
                  <CarteDemarche key={presta.title} titre={presta.title} description={presta.description} onDemande={demander} />
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Le parcours en étapes ne décrit que la vérification avant achat : un dépôt de mutation ne suit pas ces
          étapes. Le titre le dit, pour ne pas laisser croire que toute demande passe par une visite de terrain. */}
      <section id="parcours" className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[14px] font-bold uppercase tracking-wide text-[#C8102E]">Comment ça se passe</p>
            <h2 className="mt-3 text-[28px] font-extrabold leading-tight text-[#12365A] sm:text-[34px]">
              La vérification avant achat, étape par étape
            </h2>
          </div>
          <div className="mt-12">
            <ParcoursVerification etapes={steps('demarches.etapes', FALLBACK_STEPS)} />
          </div>
        </div>
      </section>

      <SectionDemande
        intro={text('demarches.contact-intro', FALLBACK_CONTACT_INTRO)}
        engagements={lines('demarches.reassurance', FALLBACK_REASSURANCE)}
        sujets={sujets}
        numeroWhatsapp={whatsappDemarches}
        messageWhatsapp={WHATSAPP_MESSAGE}
      />

      {demandeOuverte && (
        <ContactModal
          title="Faire une demande"
          initialSujet={sujetChoisi ?? sujets[0]}
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
