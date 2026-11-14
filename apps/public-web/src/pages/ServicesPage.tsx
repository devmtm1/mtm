import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../routes';
import { PoleCard } from '../components/services/PoleCard';
import { BandeauEngagements } from '../components/ui/BandeauEngagements';
import { EmptyState } from '../components/ui/EmptyState';
import { useEditableContent } from '../hooks/useEditableContent';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { usePoles } from '../hooks/usePoles';

/** Photo du bandeau tant qu'aucune n'a été choisie dans le back-office (Contenus du site → Nos services). */
export const IMAGE_BANDEAU_SERVICES = '/bandeaux/services-villa.png';

/** Le titre en deux tons, comme sur l'affiche : ses deux derniers mots passent en rouge. */
function titreDeuxTons(titre: string) {
  const mots = titre.trim().split(/\s+/);
  if (mots.length < 4) return titre;
  return (
    <>
      {mots.slice(0, -2).join(' ')} <span className="text-mtm-accent">{mots.slice(-2).join(' ')}</span>
    </>
  );
}

/**
 * Page « Nos services » : tous les pôles d'activité de MTM, chacun présenté comme sur l'affiche de l'agence. La liste, les
 * textes et les photos viennent du back-office : ajouter ou retirer un pôle ne demande aucune modification du site.
 */
export function ServicesPage() {
  const { text, loading: contenuEnCours } = useEditableContent();
  const { data: poles, loading, error } = usePoles();
  usePageMetadata({
    title: 'Nos services',
    description:
      'Transaction, gestion, contrôle foncier, nettoyage, conciergerie, maintenance, construction : les pôles d’activité de MTM Immobilier au Sénégal.',
  });

  const liste = poles ?? [];
  // Un seul pôle retourné à la fois : on mémorise lequel.
  const [retourne, setRetourne] = useState<string | null>(null);
  const { hash } = useLocation();

  // Une carte de l'accueil arrive ici avec l'ancre de son pôle (#clean) : les cartes n'existent qu'après le chargement,
  // le navigateur ne peut donc pas y descendre seul. On le fait une fois la liste affichée.
  useEffect(() => {
    if (liste.length === 0 || !hash) return;
    const minuteur = window.setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' }), 150);
    return () => window.clearTimeout(minuteur);
  }, [liste.length, hash]);

  return (
    <div>
      {/* En-tête clair : le titre à gauche (ses derniers mots en rouge), la villa à droite qui se fond dans le fond de page. */}
      <header className="relative isolate overflow-hidden bg-gradient-to-b from-mtm-primary-subtle/70 to-mtm-bg">
        <img
          src={text('services.image', IMAGE_BANDEAU_SERVICES)}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className={`pointer-events-none absolute bottom-20 right-0 -z-10 hidden h-[calc(100%-5rem)] w-[52%] object-contain object-right-bottom lg:block [mask-image:linear-gradient(to_right,transparent,black_38%)] ${contenuEnCours ? 'opacity-0' : 'opacity-100'} `}
        />
        <div className={`mx-auto max-w-[84rem] px-4 pb-24 pt-8 sm:px-6 lg:pb-28 lg:pt-12 ${contenuEnCours ? 'opacity-0' : 'opacity-100'} `}>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-mtm-primary-dark">
            <span aria-hidden="true" className="h-[2px] w-12 bg-mtm-accent" />
            {text('services.eyebrow', 'Nos services')}
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-[2rem] font-extrabold leading-[1.1] text-mtm-primary-dark sm:text-4xl lg:text-[2.75rem]">
            {titreDeuxTons(text('services.title', 'Des services complets pour tous vos projets immobiliers'))}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-mtm-text">
            {text('services.intro', 'MTM Immobilier vous accompagne à chaque étape de votre projet, avec des solutions sur mesure.')}
          </p>
          <a href="#nos-poles" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-mtm-accent px-6 text-sm font-bold text-white shadow-card transition-colors hover:bg-mtm-accent-dark">
            Découvrir nos services
            <ChevronRight className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          </a>
        </div>
      </header>

      <section id="nos-poles" aria-label="Nos pôles d’activité" className="relative z-10 mx-auto -mt-16 max-w-[84rem] scroll-mt-20 px-4 pb-10 sm:px-6 lg:-mt-20">
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} aria-hidden="true" className="h-[21rem] rounded-2xl bg-mtm-border/40 sm:h-[18.5rem]" />
            ))}
          </div>
        )}
        {!loading && error && (
          <EmptyState title="Nos services ne se chargent pas" description="Réessayez dans un instant, ou contactez-nous directement." />
        )}
        {!loading && !error && liste.length === 0 && (
          <EmptyState title="Nos services arrivent bientôt" description="Contactez-nous pour connaître l’ensemble de notre offre." />
        )}
        {liste.length > 0 && (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {liste.map((pole, index) => {
              // Comme sur l'affiche : un dernier pôle seul sur sa rangée occupe toute la largeur.
              const seul = index === liste.length - 1 && liste.length % 3 === 1;
              return (
              <li key={pole.id} className={seul ? 'xl:col-span-3 sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.625rem)] xl:w-full' : ''}>
                <PoleCard large={seul} pole={pole} retournee={retourne === pole.slug} onBasculer={(ouvert) => setRetourne(ouvert ? pole.slug : null)} />
              </li>
              );
            })}
          </ul>
        )}
      </section>

      <BandeauEngagements className="mx-auto max-w-[84rem] px-4 pb-12 sm:px-6" />

      <section aria-label="Un projet au Sénégal" className="mx-auto max-w-[84rem] px-4 pb-12 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-[2rem] bg-mtm-primary-dark px-6 py-8 text-white shadow-card-hover md:flex-row md:items-center md:justify-between md:px-10">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Un projet au Sénégal ?</h2>
            <p className="mt-2 text-sm text-white/85 sm:text-base">Parlons-en : terrains et villas vérifiés, gestion locative, construction ou démarches foncières, notre équipe vous accompagne où que vous soyez.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={ROUTES.catalog} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-mtm-accent px-6 text-sm font-bold text-white shadow-card transition-colors hover:bg-mtm-accent-dark">
              Voir nos biens
              <ChevronRight className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            </Link>
            <Link to={ROUTES.contact} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-white/80 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
