import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BandeauPage } from '../components/layout/BandeauPage';
import { PoleCard } from '../components/services/PoleCard';
import { CtaBand } from '../components/ui/CtaBand';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useEditableContent } from '../hooks/useEditableContent';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { usePoles } from '../hooks/usePoles';

/** Photo du bandeau tant qu'aucune n'a été choisie dans le back-office (Contenus du site → Nos services). */
export const IMAGE_BANDEAU_SERVICES = '/poles/nos-poles-banniere.jpg';

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
  const { hash } = useLocation();

  // Une carte de l'accueil arrive ici avec l'ancre de son pôle (#clean) : les cartes n'existent qu'après le chargement,
  // le navigateur ne peut donc pas y descendre seul. On le fait une fois la liste affichée.
  useEffect(() => {
    if (liste.length === 0 || !hash) return;
    const minuteur = window.setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' }), 150);
    return () => window.clearTimeout(minuteur);
  }, [liste.length, hash]);
  // Quand la dernière rangée de trois n'a qu'une carte, elle prend toute la largeur, comme sur l'affiche.
  const derniereSeule = liste.length > 0 && liste.length % 3 === 1;

  return (
    <div>
      <BandeauPage
        chevauche={false}
        eyebrow={text('services.eyebrow', 'Nos services')}
        title={text('services.title', 'Nos pôles d’activités')}
        description={text('services.intro', 'Une offre complète de services immobiliers au Sénégal : acheter, gérer, contrôler, entretenir et construire avec un seul partenaire.')}
        image={text('services.image', IMAGE_BANDEAU_SERVICES)}
        chargement={contenuEnCours}
        voileDense
        compact
      />

      <section aria-label="Nos pôles d’activité" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-96 rounded-2xl" />
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {liste.map((pole, index) => {
              const large = derniereSeule && index === liste.length - 1;
              return (
                <div key={pole.id} className={large ? 'md:col-span-2 lg:col-span-3' : ''}>
                  <PoleCard pole={pole} large={large} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CtaBand />
    </div>
  );
}
