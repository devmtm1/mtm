import { useState } from 'react';
import { BellRing, CheckCircle2, FileSignature, FileText, KeyRound, UserSearch, Wallet } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
import { AppelFinal, EnTeteSection, EtapesCourtes, ListeCompacte, NavigationPage, type Icone } from '../components/services/ServicesBlocs';
import { FaqDemarches } from '../components/demarches/FaqDemarches';
import { FormulaireConfierBien } from '../components/gestion/FormulaireConfierBien';
import { Modal } from '../components/ui/Modal';
import { buttonClassName } from '../components/ui/button-styles';
import { LinkButton } from '../components/ui/LinkButton';
import { useEditableContent } from '../hooks/useEditableContent';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSiteContact } from '../hooks/useSiteContact';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { donneesFaq } from '../utils/seo';
import { ETAPES_GESTION, FAQ_GESTION, INTRO_GESTION, REASSURANCE_GESTION, SERVICES_GESTION } from '../utils/gestionLocative';
import { ROUTES } from '../routes';

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
            <LinkButton to={ROUTES.locations} variant="onDarkOutline">
              Voir nos locations
            </LinkButton>
          </>
        }
      />

      <NavigationPage
        liens={[
          { libelle: 'Ce que nous faisons', href: '#prestations' },
          { libelle: 'Étapes', href: '#parcours' },
          { libelle: 'Questions', href: '#faq' },
          ...(mobile ? [] : [{ libelle: 'Confier mon bien', href: '#confier' }]),
        ]}
      />

      <section id="prestations" className="scroll-mt-32 bg-white py-12 lg:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTeteSection
            mention="Ce que nous faisons pour vous"
            titre="Tout ce qu’un propriétaire n’a pas envie de gérer"
            texte="Appartement, villa, immeuble, bureau ou séjour de courte durée : de la recherche du locataire au reversement des loyers, nous prenons tout en charge."
          />
          <div className="mt-8 lg:mt-10">
            <ListeCompacte elements={steps('gestion-locative.prestations', SERVICES_GESTION)} icone={(_, index) => ICONES[index % ICONES.length]} />
          </div>
        </div>
      </section>

      <section id="parcours" className="scroll-mt-32 bg-mtm-bg py-12 lg:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTeteSection mention="Comment ça se passe" titre="En quatre étapes" />
          <div className="mt-8 lg:mt-10">
            <EtapesCourtes etapes={steps('gestion-locative.etapes', ETAPES_GESTION)} />
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
                Les réponses à ce que les propriétaires nous demandent le plus. Vous ne trouvez pas la vôtre ? Écrivez-nous.
              </p>
              <button
                type="button"
                onClick={() => (mobile ? setFeuilleOuverte(true) : document.getElementById('confier')?.scrollIntoView({ behavior: 'smooth' }))}
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
          titre="Confiez-nous votre bien"
          texte="Quelques informations suffisent : un conseiller vous rappelle, sans engagement."
          libelleBouton="Confier mon bien"
          surClic={() => setFeuilleOuverte(true)}
          whatsappHref={lienWhatsapp}
        />
      ) : (
        <section id="confier" className="scroll-mt-32 bg-mtm-bg py-12 lg:py-12">
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
                href={lienWhatsapp}
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
      )}

      {feuilleOuverte && (
        <Modal title="Confier mon bien" onClose={() => setFeuilleOuverte(false)}>
          <FormulaireConfierBien />
        </Modal>
      )}
    </div>
  );
}
