import { ArrowLeft, Check, CheckCircle2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContactForm } from '../components/contact/ContactForm';
import { ServiceEtDemande } from '../components/services/ServiceEtDemande';
import { ServicesComplementaires } from '../components/services/ServicesComplementaires';
import { iconePole } from '../components/services/pole-icones';
import { buttonClassName } from '../components/ui/button-styles';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useIsMobile } from '../hooks/useMediaQuery';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { usePoles } from '../hooks/usePoles';
import { useSiteContact } from '../hooks/useSiteContact';
import { ROUTES } from '../routes';
import { NotFoundPage } from './NotFoundPage';

/** Le déroulé d'une demande, en trois mots : le détail n'apporte rien de plus au visiteur qui veut simplement écrire. */
const ETAPES = ['Vous décrivez votre besoin', 'Un conseiller vous rappelle', 'Nous intervenons'];

/** Ce que MTM s'engage à faire pour toute demande de service : les mêmes trois repères sur chaque page de pôle. */
const ENGAGEMENTS = ['Réponse d’un conseiller MTM', 'Devis sans engagement', 'Un échange possible par WhatsApp'];

/**
 * Page d'un pôle de MTM, de la forme /nos-services/clean : une page courte, pensée pour passer à l'action. En haut, ce
 * qu'est le service ; juste dessous, ce qu'il comprend à gauche et la demande à droite, visibles ensemble sur ordinateur
 * (le formulaire reste à l'écran pendant qu'on lit les prestations). Tout vient de la fiche du pôle dans le back-office
 * (Site web → Pôles et services) : un pôle ajouté demain a sa page sans toucher au site.
 */
export function PolePage() {
  const { slug = '' } = useParams();
  const { data: poles, loading } = usePoles();
  const contact = useSiteContact();
  const mobile = useIsMobile();
  const pole = poles?.find((p) => p.slug === slug);
  usePageMetadata({
    title: pole?.nom ?? 'Nos services',
    description: pole?.description ?? 'Les services de MTM Immobilier au Sénégal.',
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }
  if (!pole) {
    // Un pôle inconnu ou retiré : même réponse que n'importe quelle adresse inexistante.
    return poles ? <NotFoundPage /> : <EmptyState title="Cette page ne se charge pas" description="Réessayez dans un instant, ou contactez-nous directement." />;
  }

  const Icone = iconePole(pole.slug);
  const sujet = pole.accroche ? `${pole.nom} – ${pole.accroche}` : pole.nom;
  const lienWhatsapp = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Bonjour, je souhaite une demande pour ${pole.nom}.`)}`;

  // Ordinateur : la même mise en page que Gestion, Construction et Démarches. La photo ne sert de fond que si elle est assez grande
  // (envoyée depuis le back-office) ; les photos fournies avec le site sont petites et floues une fois étirées.
  if (!mobile) {
    return (
      <div>
        <ServiceEtDemande
          eyebrow={`Nos services · ${pole.numero}`}
          titrePage={pole.nom}
          accroche={pole.accroche ?? 'Une demande, un conseiller'}
          intro={pole.description ?? ''}
          engagements={ENGAGEMENTS}
          image={pole.imageUrl?.startsWith('http') ? pole.imageUrl : undefined}
          elements={pole.points.map((point) => ({ title: point }))}
          icone={() => Check}
          etapes={ETAPES.map((etape) => ({ title: etape }))}
          titreEtapes="Comment ça se passe"
          idFormulaire="demande"
          titreFormulaire={pole.libelleLien ?? 'Faire une demande'}
          iconeFormulaire={Icone}
          assurance="Un conseiller vous rappelle, devis sans engagement."
          formulaire={<ContactForm initialSujet={sujet} sujetFige libelleBouton="Envoyer ma demande" />}
          pied={
            <a href={lienWhatsapp} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-mtm-success hover:underline">
              Ou discutez directement sur WhatsApp
            </a>
          }
        />
        <ServicesComplementaires pole={pole.slug} />
      </div>
    );
  }

  return (
    <div>
      {/* En-tête : le texte à gauche, la photo du pôle à droite (elle est petite : on ne l'étire pas en bandeau). */}
      <header className="bg-gradient-to-br from-mtm-primary-dark to-mtm-primary text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:gap-12 lg:py-10">
          <div>
            <Link to={ROUTES.services} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Tous nos services
            </Link>
            <h1 className="mt-1 flex items-center gap-3 font-display text-[1.9rem] font-extrabold leading-tight sm:text-4xl">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-mtm-accent font-display text-base font-bold shadow-card"
              >
                {pole.numero}
              </span>
              {pole.nom}
            </h1>
            {pole.accroche && <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em] text-white/80">{pole.accroche}</p>}
            {pole.description && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/90 sm:text-base">{pole.description}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#demande" className={buttonClassName('accent', 'px-6 py-3 text-[15px]')}>
                {pole.libelleLien ?? 'Faire une demande'}
              </a>
              <a href={lienWhatsapp} target="_blank" rel="noopener noreferrer" className={buttonClassName('onDarkOutline', 'px-6 py-3 text-[15px]')}>
                WhatsApp
              </a>
            </div>
          </div>
          <div className="hidden overflow-hidden rounded-3xl bg-mtm-primary-subtle shadow-card-hover ring-1 ring-white/20 sm:block">
            {pole.imageUrl ? (
              <img src={pole.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
            ) : (
              <div aria-hidden="true" className="flex aspect-[16/9] items-center justify-center text-mtm-primary">
                <Icone className="h-16 w-16" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Le service et la demande, côte à côte : on lit ce qui est compris sans perdre le formulaire de vue. */}
      <section className="bg-mtm-bg py-8 lg:py-10">
        <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div className="flex flex-col gap-6">
            {pole.points.length > 0 && (
              <div className="rounded-3xl border border-mtm-border/70 bg-white p-5 shadow-card sm:p-6">
                <h2 className="font-display text-lg font-bold text-mtm-text">Ce que comprend {pole.nom}</h2>
                <ul className="mt-4 flex flex-col divide-y divide-mtm-border/70">
                  {pole.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mtm-primary-subtle text-mtm-accent">
                        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span className="text-[15px] font-medium leading-snug text-mtm-text">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ol aria-label="Comment se passe une demande" className="grid grid-cols-3 gap-2 sm:gap-3">
              {ETAPES.map((etape, index) => (
                <li key={etape} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-2 py-3 text-center shadow-card">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mtm-primary text-xs font-bold text-white">{index + 1}</span>
                  <span className="text-xs font-semibold leading-snug text-mtm-text sm:text-[13px]">{etape}</span>
                </li>
              ))}
            </ol>
          </div>

          <div id="demande" className="scroll-mt-24 rounded-3xl border border-mtm-border/70 bg-white p-5 shadow-card sm:p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-bold text-mtm-text">Faire une demande</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-mtm-muted">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
              Un conseiller vous rappelle, devis sans engagement.
            </p>
            <div className="mt-4">
              <ContactForm initialSujet={sujet} sujetFige libelleBouton="Envoyer ma demande" />
            </div>
          </div>
        </div>
      </section>

      <ServicesComplementaires pole={pole.slug} />
    </div>
  );
}
