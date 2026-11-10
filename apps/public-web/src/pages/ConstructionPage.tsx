import { useState } from 'react';
import { Eye, FileText, Hammer, HardHat, MapPinned, Ruler } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
import { AppelFinal, type Icone } from '../components/services/ServicesBlocs';
import { FormulaireDevis } from '../components/construction/FormulaireDevis';
import { Modal } from '../components/ui/Modal';
import { buttonClassName } from '../components/ui/button-styles';
import { LinkButton } from '../components/ui/LinkButton';
import { useEditableContent } from '../hooks/useEditableContent';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSiteContact } from '../hooks/useSiteContact';
import { ServicesComplementaires } from '../components/services/ServicesComplementaires';
import { FaqCourte, ServiceEtDemande } from '../components/services/ServiceEtDemande';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { donneesFaq } from '../utils/seo';
import {
  ETAPES_CONSTRUCTION,
  FAQ_CONSTRUCTION,
  INTRO_CONSTRUCTION,
  PRESTATIONS_CONSTRUCTION,
  REASSURANCE_CONSTRUCTION,
} from '../utils/construction';
import { ROUTES } from '../routes';

const ICONES_CONSTRUCTION: Icone[] = [HardHat, Hammer, Eye, FileText, Ruler, MapPinned];
const MESSAGE_WHATSAPP = 'Bonjour, je souhaite un devis pour un projet de construction.';

/**
 * La page « Construction » s'adresse à celui qui veut bâtir ou rénover, souvent à distance : ce que MTM construit,
 * comment se déroule un projet, les questions qu'il se pose, puis la demande de devis. Le formulaire reste en bas de page
 * sur ordinateur ; sur mobile, il s'ouvre dans une feuille. Chaque bloc de texte se modifie dans Contenus du site ›
 * Construction.
 */
export function ConstructionPage() {
  const { text, lines, steps, loading: contenuEnCours } = useEditableContent();
  const { whatsapp } = useSiteContact();
  const mobile = useIsMobile();
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);

  const faq = steps('construction.faq', FAQ_CONSTRUCTION);
  const lienWhatsapp = `https://wa.me/${whatsapp}?text=${encodeURIComponent(MESSAGE_WHATSAPP)}`;
  usePageMetadata({
    title: 'Construction',
    jsonLd: donneesFaq(faq),
    description:
      'Du devis à la livraison, MTM Immobilier suit vos projets de construction au Sénégal avec un suivi de chantier transparent et partagé à distance.',
  });

  return (
    <div>
      {mobile && (
      <BandeauPage
        chevauche={false}
        compact
        eyebrow={text('construction.eyebrow', 'Nos services · MTM BTP')}
        title={text('construction.title', 'Construction')}
        description={text('construction.intro', INTRO_CONSTRUCTION)}
        points={lines('construction.reassurance', REASSURANCE_CONSTRUCTION)}
        image={text('construction.image', IMAGE_BANDEAU_PAGE)}
        chargement={contenuEnCours}
        actions={
          <>
            <a
              href="#devis"
              onClick={(event) => {
                // Sur mobile, il n'y a pas de formulaire en bas de page : il s'ouvre dans une feuille.
                if (mobile) {
                  event.preventDefault();
                  setFeuilleOuverte(true);
                }
              }}
              className={buttonClassName('accent', 'px-6 py-3 text-[15px]')}
            >
              <HardHat className="h-4 w-4" aria-hidden="true" />
              Demander un devis
            </a>
            <LinkButton to={ROUTES.realisations} variant="onDarkOutline">
              Voir nos réalisations
            </LinkButton>
          </>
        }
      />
      )}

      <ServiceEtDemande
        eyebrow={text('construction.eyebrow', 'Nos services · MTM BTP')}
        titrePage={text('construction.title', 'Construction')}
        accroche="Votre projet, de l’étude à la remise des clés"
        intro={text('construction.intro', INTRO_CONSTRUCTION)}
        engagements={lines('construction.reassurance', REASSURANCE_CONSTRUCTION)}
        image={text('construction.image', IMAGE_BANDEAU_PAGE)}
        elements={steps('construction.prestations', PRESTATIONS_CONSTRUCTION)}
        icone={(_, index) => ICONES_CONSTRUCTION[index % ICONES_CONSTRUCTION.length]}
        etapes={steps('construction.etapes', ETAPES_CONSTRUCTION)}
        titreEtapes="Comment ça se passe"
        idFormulaire="devis"
        titreFormulaire="Demander un devis"
        iconeFormulaire={HardHat}
        assurance="Un conseiller vous rappelle, sans engagement."
        formulaire={<FormulaireDevis />}
        pied={
          <a href={lienWhatsapp} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-mtm-success hover:underline">
            Ou discutez directement sur WhatsApp
          </a>
        }
      />

      <FaqCourte questions={faq} />

      <ServicesComplementaires pole="btp" />

      {mobile && (
        <AppelFinal
          titre="Parlons de votre projet"
          texte="Quelques informations suffisent : un conseiller vous rappelle, sans engagement, pour préparer votre devis."
          libelleBouton="Demander un devis"
          surClic={() => setFeuilleOuverte(true)}
          whatsappHref={lienWhatsapp}
        />
      )}
      {feuilleOuverte && (
        <Modal title="Demander un devis" onClose={() => setFeuilleOuverte(false)}>
          <FormulaireDevis />
        </Modal>
      )}
    </div>
  );
}
