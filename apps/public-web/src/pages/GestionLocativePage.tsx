import { useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../components/layout/BandeauPage';
import { GrilleServices, TuilesBiens } from '../components/gestion/GestionBlocs';
import { ParcoursVerification } from '../components/demarches/ParcoursVerification';
import { FaqDemarches } from '../components/demarches/FaqDemarches';
import { ContactModal } from '../components/contact/ContactModal';
import { DemandeWhatsAppCta } from '../components/contact/DemandeWhatsAppCta';
import { Button } from '../components/ui/Button';
import { CtaBand } from '../components/ui/CtaBand';
import { LinkButton } from '../components/ui/LinkButton';
import { useEditableContent } from '../hooks/useEditableContent';
import { useSiteContact } from '../hooks/useSiteContact';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { donneesFaq } from '../utils/seo';
import {
  BIENS_GESTION,
  ETAPES_GESTION,
  FAQ_GESTION,
  INTRO_GESTION,
  REASSURANCE_GESTION,
  SERVICES_GESTION,
  SUIVI_GESTION,
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
            <Button variant="accent" onClick={() => setDemandeOuverte(true)} className="px-6 py-3 text-[15px]">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Confier mon bien
            </Button>
            <LinkButton to={ROUTES.locations} variant="onDarkOutline">
              Voir nos locations
            </LinkButton>
          </>
        }
      />

      <section id="prestations" className="scroll-mt-20 bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTete
            mention="Ce que nous faisons pour vous"
            titre="Tout ce qu’un propriétaire n’a pas envie de gérer"
            texte="De la recherche du locataire au reversement des loyers, nous prenons en charge la gestion de votre bien."
          />
          <div className="mt-10">
            <GrilleServices services={steps('gestion-locative.prestations', SERVICES_GESTION)} />
          </div>
        </div>
      </section>

      <section id="parcours" className="bg-mtm-bg py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTete mention="Comment ça se passe" titre="De la remise des clés au reversement, en quatre étapes" />
          <div className="mt-12">
            <ParcoursVerification etapes={steps('gestion-locative.etapes', ETAPES_GESTION)} />
          </div>
        </div>
      </section>

      <section id="biens" className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EnTete
            mention="Les biens que nous gérons"
            titre="Un logement, un immeuble, un séjour : nous nous adaptons"
            texte="Chaque type de bien a ses règles. Nous les suivons avec les outils adaptés."
          />
          <div className="mt-10">
            <TuilesBiens biens={steps('gestion-locative.biens', BIENS_GESTION)} />
          </div>
        </div>
      </section>

      <section id="suivi" className="bg-mtm-bg py-14 lg:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mtm-accent">Un suivi transparent</p>
            <h2 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight text-mtm-text sm:text-3xl">
              Votre bien à portée de main, même à l’autre bout du monde
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-mtm-muted sm:text-base">
              Vous n’avez pas à nous appeler pour savoir où en est votre bien : l’information vient à vous.
            </p>
            <LinkButton to={ROUTES.clientLogin} variant="secondary" className="mt-6">
              Accéder à mon espace propriétaire
            </LinkButton>
          </div>
          <ul className="flex flex-col gap-3">
            {lines('gestion-locative.suivi', SUIVI_GESTION).map((point) => (
              <li key={point} className="flex items-start gap-3 rounded-2xl border border-mtm-border/70 bg-white p-4 shadow-card">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mtm-success" aria-hidden="true" />
                <span className="text-sm leading-relaxed text-mtm-text sm:text-[15px]">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {faq.length > 0 && (
        <section id="faq" className="scroll-mt-20 bg-white py-14 lg:py-20">
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

      <section className="bg-mtm-bg py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-mtm-border/70 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="font-display text-lg font-bold text-mtm-text">Vous cherchez un logement à louer ?</h2>
              <p className="mt-1 text-sm text-mtm-muted">
                Découvrez les appartements, villas et studios que nous gérons et demandez une visite en ligne.
              </p>
            </div>
            <LinkButton to={ROUTES.locations} className="shrink-0">
              Voir les locations
            </LinkButton>
          </div>
        </div>
      </section>

      <CtaBand
        title="Confiez-nous votre bien"
        description="Parlez-nous de votre bien : nous vous répondons rapidement, où que vous soyez, avec une proposition claire."
      />

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
