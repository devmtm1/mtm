import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BandeauPage } from '../components/layout/BandeauPage';
import { AppelFinal, EnTeteSection, EtapesCourtes, ListeCompacte, NavigationPage } from '../components/services/ServicesBlocs';
import { buttonClassName } from '../components/ui/button-styles';
import { IMAGE_BANDEAU_DEMARCHES, iconeDemarche } from '../utils/demarches';
import { donneesFaq } from '../utils/seo';
import { ContactModal } from '../components/contact/ContactModal';
import { DemandeWhatsAppCta } from '../components/contact/DemandeWhatsAppCta';
import { SectionDemande } from '../components/demarches/SectionDemande';
import { FaqDemarches } from '../components/demarches/FaqDemarches';
import { useEditableContent, type EditableStep } from '../hooks/useEditableContent';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSiteContact } from '../hooks/useSiteContact';

const FALLBACK_INTRO =
  "Vous envisagez d'acheter un terrain ou une villa, notamment depuis l'étranger ? Notre équipe se déplace pour vérifier le bien avant votre engagement.";

const FALLBACK_CONTACT_INTRO =
  'Dites-nous ce dont vous avez besoin : nous vous répondons rapidement et vous disons ce que nous pouvons faire pour vous.';

/**
 * Réponses de départ : elles ne reprennent que ce que la page annonce déjà (délai, devis gratuit, tarif sur devis,
 * contenu du rapport, démarches prises en charge). La direction les complète ou les remplace au back-office ;
 * aucun délai de traitement ni aucun montant n'est promis ici.
 */
const FALLBACK_FAQ: EditableStep[] = [
  {
    title: 'Puis-je faire une demande depuis l’étranger ?',
    description:
      'Oui. Notre équipe se déplace pour vérifier le bien avant votre engagement : vous n’avez pas besoin d’être sur place. Vous pouvez aussi échanger avec nous directement sur WhatsApp.',
  },
  {
    title: 'Le devis est-il payant ?',
    description: 'Non. Le devis est gratuit et sans engagement.',
  },
  {
    title: 'Comment le tarif est-il fixé ?',
    description:
      'Le tarif est adapté à la nature et à l’urgence de la démarche. Il vous est communiqué sur devis : aucun montant n’est affiché sur le site.',
  },
  {
    title: 'Que dois-je vous transmettre pour commencer ?',
    description:
      'Le bien concerné et les pièces dont vous disposez. Si certaines manquent, nous vous disons lesquelles réunir.',
  },
  {
    title: 'Que contient le rapport de vérification ?',
    description:
      'Une conclusion structurée et une recommandation : favorable, défavorable ou à compléter.',
  },
];

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
  const mobile = useIsMobile();
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
  const toutes = [...prestations, ...prestationsTechniques];
  const sujets = toutes.map((presta) => presta.title);
  const faq = steps('demarches.faq', FALLBACK_FAQ);
  usePageMetadata({
    title: 'Démarches administratives et vérification foncière',
    jsonLd: donneesFaq(faq),
    description:
      'Faites vérifier un terrain au Sénégal avant d’acheter : visite sur site, contrôle administratif et rapport structuré par MTM Immobilier.',
  });

  return (
    <div>
      {/* Même bandeau que les autres pages de services. Celui qui clique sur « Faire une demande » a déjà décidé :
          on lui ouvre la fenêtre plutôt que de le faire défiler. La section de bas de page reste en place pour
          celui qui lit tout et arrive convaincu. */}
      <BandeauPage
        chevauche={false}
        eyebrow={text('demarches.eyebrow', 'Nos services')}
        title={text('demarches.title', 'Démarches administratives')}
        description={text('demarches.intro', FALLBACK_INTRO)}
        points={lines('demarches.reassurance', FALLBACK_REASSURANCE)}
        image={text('demarches.image', IMAGE_BANDEAU_DEMARCHES)}
        chargement={contenuEnCours}
        actions={
          <button type="button" onClick={() => demander()} className={buttonClassName('accent', 'px-6 py-3 text-[15px]')}>
            {text('demarches.bouton', 'Faire une demande')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      />

      <NavigationPage
        liens={[
          { libelle: 'Nos démarches', href: '#prestations' },
          { libelle: 'Étapes', href: '#parcours' },
          { libelle: 'Questions', href: '#faq' },
          ...(mobile ? [] : [{ libelle: 'Faire une demande', href: '#demande-verification' }]),
        ]}
      />

      <section id="prestations" className="scroll-mt-32 bg-white py-12 lg:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTeteSection
            mention="Nos prestations"
            titre="Quelle démarche vous concerne ?"
            texte="Au Sénégal ou depuis l’étranger, nous prenons en charge vos démarches auprès des administrations, ainsi que les plans et relevés dont votre dossier a besoin. Choisissez la vôtre : la demande s’ouvre déjà préremplie."
          />
          <div className="mt-8 lg:mt-10">
            <ListeCompacte elements={toutes} icone={(titre) => iconeDemarche(titre)} action={{ libelle: 'Faire une demande', surClic: demander }} />
          </div>
        </div>
      </section>

      {/* Le parcours en étapes ne décrit que la vérification avant achat : un dépôt de mutation ne suit pas ces
          étapes. Le titre le dit, pour ne pas laisser croire que toute demande passe par une visite de terrain. */}
      <section id="parcours" className="scroll-mt-32 bg-mtm-bg py-12 lg:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTeteSection mention="Comment ça se passe" titre="La vérification avant achat, étape par étape" />
          <div className="mt-8 lg:mt-10">
            <EtapesCourtes etapes={steps('demarches.etapes', FALLBACK_STEPS)} />
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section id="faq" className="scroll-mt-32 bg-white py-12 lg:py-12">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">Questions fréquentes</p>
              <h2 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight text-mtm-text sm:text-3xl">
                Vous vous posez une question ?
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted sm:text-base">
                Les réponses aux questions que l’on nous pose le plus. Vous ne trouvez pas la vôtre ? Écrivez-nous, nous vous répondons.
              </p>
              <button
                type="button"
                onClick={() => (mobile ? demander() : document.getElementById('demande-verification')?.scrollIntoView({ behavior: 'smooth' }))}
                className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-mtm-accent hover:underline"
              >
                Poser ma question
              </button>
            </div>
            <FaqDemarches questions={faq} />
          </div>
        </section>
      )}

      {mobile ? (
        <AppelFinal
          titre="Parlons de votre projet"
          texte={text('demarches.contact-intro', FALLBACK_CONTACT_INTRO)}
          libelleBouton="Faire une demande"
          surClic={() => demander()}
          whatsappHref={`https://wa.me/${whatsappDemarches}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
        />
      ) : (
        <SectionDemande
          intro={text('demarches.contact-intro', FALLBACK_CONTACT_INTRO)}
          engagements={lines('demarches.reassurance', FALLBACK_REASSURANCE)}
          sujets={sujets}
          numeroWhatsapp={whatsappDemarches}
          messageWhatsapp={WHATSAPP_MESSAGE}
        />
      )}

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
