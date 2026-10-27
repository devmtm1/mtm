import { useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
import { GrilleServices } from '../components/gestion/GestionBlocs';
import { ParcoursVerification } from '../components/demarches/ParcoursVerification';
import { FaqDemarches } from '../components/demarches/FaqDemarches';
import { ContactModal } from '../components/contact/ContactModal';
import { DemandeWhatsAppCta } from '../components/contact/DemandeWhatsAppCta';
import { buttonClassName } from '../components/ui/button-styles';
import { FormulaireConfierBien } from '../components/gestion/FormulaireConfierBien';
import { LinkButton } from '../components/ui/LinkButton';
import { useEditableContent } from '../hooks/useEditableContent';
import { useSiteContact } from '../hooks/useSiteContact';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { donneesFaq } from '../utils/seo';
import {
  ETAPES_GESTION,
  FAQ_GESTION,
  INTRO_GESTION,
  REASSURANCE_GESTION,
  SERVICES_GESTION,
} from '../utils/gestionLocative';
import { ROUTES } from '../routes';

const SUJET_DEMANDE = 'Confier mon bien en gestion locative';
const MESSAGE_WHATSAPP = 'Bonjour, je souhaite confier un bien en gestion locative à MTM.';

/** Titre de section : mention rouge, titre, texte d'appui. */
function EnTete({ mention, titre, texte }: { mention: string; titre: string; texte?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">{mention}</p>
      <h2 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight text-mtm-text sm:text-3xl">{titre}</h2>
      {texte && <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted sm:text-base">{texte}</p>}
    </div>
  );
}

/**
 * La page « Gestion locative » s'adresse au propriétaire qui hésite à confier son bien : ce que MTM prend en charge,
 * comment ça se passe, quels biens sont acceptés, comment il suit son bien à distance, puis les questions qu'il se
 * pose. Chaque bloc de texte se modifie dans Contenus du site › Gestion locative.
 */
export function GestionLocativePage() {
  const { text, lines, steps, loading: contenuEnCours } = useEditableContent();
  const { whatsapp } = useSiteContact();
  const [demandeOuverte, setDemandeOuverte] = useState(false);

  const faq = steps('gestion-locative.faq', FAQ_GESTION);
  usePageMetadata({
    title: 'Gestion locative',
    jsonLd: donneesFaq(faq),
    description:
      'Confiez la gestion de vos biens au Sénégal à MTM Immobilier : locataires, loyers, états des lieux et rapports réguliers, même depuis l’étranger.',
  });

  return (
    <div>
      <BandeauPage
        chevauche={false}
        eyebrow={text('gestion-locative.eyebrow', 'Nos services')}
        title={text('gestion-locative.title', 'Gestion locative')}
        description={text('gestion-locative.intro', INTRO_GESTION)}
        points={lines('gestion-locative.reassurance', REASSURANCE_GESTION)}
        image={text('gestion-locative.image', IMAGE_BANDEAU_PAGE)}
        chargement={contenuEnCours}
        actions={
          <>
            <a href="#confier" className={buttonClassName('accent', 'px-6 py-3 text-[15px]')}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Confier mon bien
            </a>
            <LinkButton to={ROUTES.locations} variant="onDarkOutline">
              Voir nos locations
            </LinkButton>
          </>
        }
      />

      <section id="prestations" className="scroll-mt-20 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTete
            mention="Ce que nous faisons pour vous"
            titre="Tout ce qu’un propriétaire n’a pas envie de gérer"
            texte="Appartement, villa, immeuble, bureau ou séjour de courte durée : de la recherche du locataire au reversement des loyers, nous prenons tout en charge."
          />
          <div className="mt-10">
            <GrilleServices services={steps('gestion-locative.prestations', SERVICES_GESTION)} />
          </div>
        </div>
      </section>

      <section id="parcours" className="bg-mtm-bg py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTete mention="Comment ça se passe" titre="En quatre étapes" />
          <div className="mt-10">
            <ParcoursVerification etapes={steps('gestion-locative.etapes', ETAPES_GESTION)} />
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
                Les réponses à ce que les propriétaires nous demandent le plus. Vous ne trouvez pas la vôtre ? Écrivez-nous.
              </p>
              <button
                type="button"
                onClick={() => setDemandeOuverte(true)}
                className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-mtm-accent hover:underline"
              >
                Poser ma question
              </button>
            </div>
            <FaqDemarches questions={faq} />
          </div>
        </section>
      )}

      <section id="confier" className="scroll-mt-20 bg-mtm-bg py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">Confier mon bien</p>
            <h2 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight text-mtm-text sm:text-3xl">
              Parlez-nous de votre bien
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted sm:text-base">
              Quelques informations suffisent : un conseiller vous rappelle, sans engagement, pour étudier votre bien et vous
              présenter nos conditions.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5 text-sm text-mtm-text">
              {['Réponse d’un conseiller MTM', 'Aucune obligation de votre part', 'Un échange possible par WhatsApp'].map((point) => (
                <li key={point} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
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
            <FormulaireConfierBien />
          </div>
        </div>
      </section>

      {demandeOuverte && (
        <ContactModal
          title="Confier mon bien"
          initialSujet={SUJET_DEMANDE}
          onClose={() => setDemandeOuverte(false)}
          intro={<DemandeWhatsAppCta numero={whatsapp} message={MESSAGE_WHATSAPP} />}
        />
      )}
    </div>
  );
}
