import { useState } from 'react';
import { BellRing, House, FileSignature, FileText, KeyRound, UserSearch, Wallet } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
import { type Icone } from '../components/services/ServicesBlocs';
import { FormulaireConfierBien } from '../components/gestion/FormulaireConfierBien';
import { Modal } from '../components/ui/Modal';
import { buttonClassName } from '../components/ui/button-styles';
import { useEditableContent } from '../hooks/useEditableContent';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSiteContact } from '../hooks/useSiteContact';
import { ServicesComplementaires } from '../components/services/ServicesComplementaires';
import { FaqCourte, ServiceEtDemande } from '../components/services/ServiceEtDemande';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { donneesFaq } from '../utils/seo';
import { ETAPES_GESTION, FAQ_GESTION, INTRO_GESTION, REASSURANCE_GESTION, SERVICES_GESTION } from '../utils/gestionLocative';

const ICONES: Icone[] = [UserSearch, FileSignature, Wallet, BellRing, KeyRound, FileText];
const MESSAGE_WHATSAPP = 'Bonjour, je souhaite confier un bien en gestion locative à MTM.';

/**
 * La page « Gestion locative » s'adresse au propriétaire qui hésite à confier son bien : ce que MTM prend en charge,
 * comment ça se passe, puis les questions qu'il se pose. Le formulaire « Confier mon bien » reste en bas de page sur
 * ordinateur ; sur mobile, il s'ouvre dans une feuille (la page ne s'allonge pas de 1500 px). Chaque bloc de texte se
 * modifie dans Contenus du site › Gestion locative.
 */
export function GestionLocativePage() {
  const { text, lines, steps, loading: contenuEnCours } = useEditableContent();
  const { whatsapp } = useSiteContact();
  const mobile = useIsMobile();
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);

  const faq = steps('gestion-locative.faq', FAQ_GESTION);
  const lienWhatsapp = `https://wa.me/${whatsapp}?text=${encodeURIComponent(MESSAGE_WHATSAPP)}`;
  usePageMetadata({
    title: 'Gestion locative',
    jsonLd: donneesFaq(faq),
    description:
      'Confiez la gestion de vos biens au Sénégal à MTM Immobilier : locataires, loyers, états des lieux et rapports réguliers, même depuis l’étranger.',
  });

  return (
    <div>
      {mobile && (
      <BandeauPage
        chevauche={false}
        compact
        eyebrow={text('gestion-locative.eyebrow', 'Nos services · MTM Gestion')}
        title={text('gestion-locative.title', 'Gestion locative')}
        description={text('gestion-locative.intro', INTRO_GESTION)}
        image={text('gestion-locative.image', IMAGE_BANDEAU_PAGE)}
        chargement={contenuEnCours}
        actions={
          <>
            <a
              href="#confier"
              onClick={(event) => {
                // Sur mobile, il n'y a pas de formulaire en bas de page : il s'ouvre dans une feuille.
                if (mobile) {
                  event.preventDefault();
                  setFeuilleOuverte(true);
                }
              }}
              className={buttonClassName('accent', 'px-6 py-3 text-[15px]')}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Confier mon bien
            </a>
          </>
        }
      />
      )}

      <ServiceEtDemande
        eyebrow={text('gestion-locative.eyebrow', 'Nos services · MTM Gestion')}
        titrePage={text('gestion-locative.title', 'Gestion locative')}
        accroche="Tout ce qu’un propriétaire n’a pas envie de gérer"
        intro={text('gestion-locative.intro', INTRO_GESTION)}
        engagements={lines('gestion-locative.reassurance', REASSURANCE_GESTION)}
        image={text('gestion-locative.image', IMAGE_BANDEAU_PAGE)}
        elements={steps('gestion-locative.prestations', SERVICES_GESTION)}
        icone={(_, index) => ICONES[index % ICONES.length]}
        etapes={steps('gestion-locative.etapes', ETAPES_GESTION)}
        titreEtapes="Comment ça se passe"
        idFormulaire="confier"
        titreFormulaire="Confier mon bien"
        iconeFormulaire={House}
        assurance="Un conseiller vous rappelle, sans engagement."
        formulaire={<FormulaireConfierBien />}
        pied={
          <a href={lienWhatsapp} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-mtm-success hover:underline">
            Ou discutez directement sur WhatsApp
          </a>
        }
      />

      <FaqCourte questions={faq} />

      {!mobile && <ServicesComplementaires pole="gestion" />}

      {feuilleOuverte && (
        <Modal title="Confier mon bien" onClose={() => setFeuilleOuverte(false)}>
          <FormulaireConfierBien />
        </Modal>
      )}
    </div>
  );
}
