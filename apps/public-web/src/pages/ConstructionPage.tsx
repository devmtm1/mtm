import { Eye, FileText, Hammer, HardHat } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
import { EnTeteSection, GrilleServices, type Icone } from '../components/gestion/GestionBlocs';
import { FormulaireDevis } from '../components/construction/FormulaireDevis';
import { ParcoursVerification } from '../components/demarches/ParcoursVerification';
import { FaqDemarches } from '../components/demarches/FaqDemarches';
import { buttonClassName } from '../components/ui/button-styles';
import { LinkButton } from '../components/ui/LinkButton';
import { useEditableContent } from '../hooks/useEditableContent';
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
 * comment se déroule un projet, les trois questions qu'il se pose, puis la demande de devis. Chaque bloc de texte se
 * modifie dans Contenus du site › Construction.
 */
export function ConstructionPage() {
  const { text, lines, steps, loading: contenuEnCours } = useEditableContent();
  const { whatsapp } = useSiteContact();

  const faq = steps('construction.faq', FAQ_CONSTRUCTION);
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
            <a href="#devis" className={buttonClassName('accent', 'px-6 py-3 text-[15px]')}>
              <HardHat className="h-4 w-4" aria-hidden="true" />
              Demander un devis
            </a>
            <LinkButton to={ROUTES.realisations} variant="onDarkOutline">
              Voir nos réalisations
            </LinkButton>
          </>
        }
      />

      <section id="prestations" className="scroll-mt-20 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTeteSection
            mention="Ce que nous faisons pour vous"
            titre="Votre projet, de l’étude à la remise des clés"
            texte="Que vous construisiez ou rénoviez, nous prenons en charge votre chantier et vous en tenons informé."
          />
          <div className="mt-10">
            <GrilleServices services={steps('construction.prestations', PRESTATIONS_CONSTRUCTION)} icones={ICONES_CONSTRUCTION} />
          </div>
        </div>
      </section>

      <section id="parcours" className="bg-mtm-bg py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTeteSection mention="Comment ça se passe" titre="En quatre étapes" />
          <div className="mt-10">
            <ParcoursVerification etapes={steps('construction.etapes', ETAPES_CONSTRUCTION)} />
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section id="faq" className="scroll-mt-20 bg-white py-12 lg:py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">Questions fréquentes</p>
              <h2 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight text-mtm-text sm:text-3xl">
                Vous vous posez une question ?
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted sm:text-base">
                Les réponses à ce que l’on nous demande le plus. Vous ne trouvez pas la vôtre ? Écrivez-nous dans le formulaire ci-dessous.
              </p>
            </div>
            <FaqDemarches questions={faq} />
          </div>
        </section>
      )}

      <section id="devis" className="scroll-mt-20 bg-mtm-bg py-12 lg:py-16">
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
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(MESSAGE_WHATSAPP)}`}
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
    </div>
  );
}
