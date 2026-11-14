import { useState } from 'react';
import { ArrowRight, FileSearch } from 'lucide-react';
import { BandeauPage } from '../components/layout/BandeauPage';
import { buttonClassName } from '../components/ui/button-styles';
import { IMAGE_BANDEAU_DEMARCHES, iconeDemarche } from '../utils/demarches';
import { donneesFaq } from '../utils/seo';
import { ContactModal } from '../components/contact/ContactModal';
import { DemandeWhatsAppCta } from '../components/contact/DemandeWhatsAppCta';
import { useEditableContent, type EditableStep } from '../hooks/useEditableContent';
import { ServicesComplementaires } from '../components/services/ServicesComplementaires';
import { FaqCourte, ServiceEtDemande } from '../components/services/ServiceEtDemande';
import { ContactForm } from '../components/contact/ContactForm';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSiteContact } from '../hooks/useSiteContact';

const FALLBACK_INTRO =
  "Vous envisagez d'acheter un terrain ou une villa, notamment depuis l'étranger ? Notre équipe se déplace pour vérifier le bien avant votre engagement.";

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
      'Contrôle du bien, de sa situation administrative et des risques fonciers avant votre engagement.',
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
      {mobile && (
      <BandeauPage
        chevauche={false}
        compact
        eyebrow={text('demarches.eyebrow', 'Nos services · MTM Contrôle')}
        title={text('demarches.title', 'Démarches administratives')}
        description={text('demarches.intro', FALLBACK_INTRO)}
        image={text('demarches.image', IMAGE_BANDEAU_DEMARCHES)}
        chargement={contenuEnCours}
        actions={
          <button type="button" onClick={() => demander()} className={buttonClassName('accent', 'px-6 py-3 text-[15px]')}>
            {text('demarches.bouton', 'Faire une demande')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      />
      )}

      <ServiceEtDemande
        eyebrow={text('demarches.eyebrow', 'Nos services · MTM Contrôle')}
        titrePage={text('demarches.title', 'Démarches administratives')}
        accroche="Quelle démarche vous concerne ?"
        intro={text('demarches.intro', FALLBACK_INTRO)}
        engagements={lines('demarches.reassurance', FALLBACK_REASSURANCE)}
        image={text('demarches.image', IMAGE_BANDEAU_DEMARCHES)}
        elements={toutes}
        icone={(titre) => iconeDemarche(titre)}
        action={{ libelle: 'Faire une demande', surClic: demander }}
        etapes={steps('demarches.etapes', FALLBACK_STEPS)}
        titreEtapes="La vérification avant achat, en quelques étapes"
        idFormulaire="demande-verification"
        titreFormulaire="Faire une demande"
        iconeFormulaire={FileSearch}
        assurance={lines('demarches.reassurance', FALLBACK_REASSURANCE).slice(0, 2).join(' · ')}
        formulaire={<ContactForm initialSujet={sujets[0]} sujetOptions={sujets} />}
        pied={
          <a
            href={`https://wa.me/${whatsappDemarches}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-mtm-success hover:underline"
          >
            Ou discutez directement sur WhatsApp
          </a>
        }
      />

      <FaqCourte questions={faq} />

      {!mobile && <ServicesComplementaires pole="controle" />}

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
