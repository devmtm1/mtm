import { useState } from 'react';
import { Eye, FileText, Hammer, HardHat } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
import { AppelFinal, EnTeteSection, EtapesCourtes, ListeCompacte, NavigationPage, type Icone } from '../components/services/ServicesBlocs';
import { FormulaireDevis } from '../components/construction/FormulaireDevis';
import { FaqDemarches } from '../components/demarches/FaqDemarches';
import { Modal } from '../components/ui/Modal';
import { buttonClassName } from '../components/ui/button-styles';
import { LinkButton } from '../components/ui/LinkButton';
import { useEditableContent } from '../hooks/useEditableContent';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSiteContact } from '../hooks/useSiteContact';
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

const ICONES_CONSTRUCTION: Icone[] = [HardHat, Hammer, Eye, FileText];
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
      <BandeauPage
        chevauche={false}
        eyebrow={text('construction.eyebrow', 'Nos services')}
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

      <NavigationPage
        liens={[
          { libelle: 'Ce que nous faisons', href: '#prestations' },
          { libelle: 'Étapes', href: '#parcours' },
          { libelle: 'Questions', href: '#faq' },
          ...(mobile ? [] : [{ libelle: 'Demander un devis', href: '#devis' }]),
        ]}
      />

      <section id="prestations" className="scroll-mt-32 bg-white py-12 lg:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTeteSection
            mention="Ce que nous faisons pour vous"
            titre="Votre projet, de l’étude à la remise des clés"
            texte="Que vous construisiez ou rénoviez, nous prenons en charge votre chantier et vous en tenons informé."
          />
          <div className="mt-8 lg:mt-10">
            <ListeCompacte
              elements={steps('construction.prestations', PRESTATIONS_CONSTRUCTION)}
              icone={(_, index) => ICONES_CONSTRUCTION[index % ICONES_CONSTRUCTION.length]}
              colonnes={2}
            />
          </div>
        </div>
      </section>

      <section id="parcours" className="scroll-mt-32 bg-mtm-bg py-12 lg:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTeteSection mention="Comment ça se passe" titre="En quatre étapes" />
          <div className="mt-8 lg:mt-10">
            <EtapesCourtes etapes={steps('construction.etapes', ETAPES_CONSTRUCTION)} />
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section id="faq" className="scroll-mt-32 bg-white py-12 lg:py-12">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">Questions fréquentes</p>
              <h2 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight text-mtm-text sm:text-3xl">
                Vous vous posez une question ?
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted sm:text-base">
                Les réponses à ce que l’on nous demande le plus. Vous ne trouvez pas la vôtre ? Écrivez-nous.
              </p>
              <button
                type="button"
                onClick={() => (mobile ? setFeuilleOuverte(true) : document.getElementById('devis')?.scrollIntoView({ behavior: 'smooth' }))}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-mtm-accent hover:underline"
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
          texte="Quelques informations suffisent : un conseiller vous rappelle, sans engagement, pour préparer votre devis."
          libelleBouton="Demander un devis"
          surClic={() => setFeuilleOuverte(true)}
          whatsappHref={lienWhatsapp}
        />
      ) : (
        <section id="devis" className="scroll-mt-32 bg-mtm-bg py-12 lg:py-12">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">Demander un devis</p>
              <h2 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight text-mtm-text sm:text-3xl">
                Parlez-nous de votre projet
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted sm:text-base">
                Quelques informations suffisent : un conseiller vous rappelle, sans engagement, pour étudier votre projet et
                préparer votre devis.
              </p>
              <a
                href={lienWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-md border border-mtm-success bg-mtm-success/5 px-4 py-2.5 text-sm font-semibold text-mtm-success transition-colors hover:bg-mtm-success/10"
              >
                Discuter directement sur WhatsApp
              </a>
            </div>
            <div className="rounded-3xl border border-mtm-border/70 bg-white p-5 shadow-card sm:p-8">
              <FormulaireDevis />
            </div>
          </div>
        </section>
      )}

      {feuilleOuverte && (
        <Modal title="Demander un devis" onClose={() => setFeuilleOuverte(false)}>
          <FormulaireDevis />
        </Modal>
      )}
    </div>
  );
}
