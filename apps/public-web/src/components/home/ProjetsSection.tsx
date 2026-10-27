import { useState } from 'react';
import { ShowcaseGrid } from '../showcase/ShowcaseGrid';
import { SectionHeading } from '../ui/SectionHeading';
import { SeeAllLink } from '../ui/SeeAllLink';
import { ROUTES } from '../../routes';

type Onglet = 'realisation' | 'projet_a_venir';

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: 'realisation', libelle: 'Réalisations' },
  { cle: 'projet_a_venir', libelle: 'À venir' },
];

/**
 * Les projets de MTM sur l'accueil, en une seule section à deux onglets (réalisations livrées, projets à venir) : deux
 * sections voisines montrant le même genre de cartes allongeaient la page pour rien. Chaque onglet garde son lien vers
 * sa page complète.
 */
export function ProjetsSection() {
  const [onglet, setOnglet] = useState<Onglet>('realisation');
  const aVenir = onglet === 'projet_a_venir';

  return (
    <section className="py-12 lg:py-16" aria-label="Nos projets">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionHeading app eyebrow="Nos projets" title="Réalisations et projets à venir" />
          </div>
          <SeeAllLink to={aVenir ? ROUTES.projetsAVenir : ROUTES.realisations} />
        </div>

        <div role="group" aria-label="Type de projets" className="mt-5 inline-flex rounded-full bg-mtm-surface p-1 shadow-card">
          {ONGLETS.map(({ cle, libelle }) => (
            <button
              key={cle}
              type="button"
              aria-pressed={onglet === cle}
              onClick={() => setOnglet(cle)}
              className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${
                onglet === cle ? 'bg-mtm-primary text-white shadow-sm' : 'text-mtm-muted hover:text-mtm-primary'
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>

        <div className="mt-6 lg:mt-8">
          {aVenir ? (
            <ShowcaseGrid category="projet_a_venir" emptyLabel="Aucun projet à venir publié pour le moment" limit={3} mobileCarousel />
          ) : (
            <ShowcaseGrid category="realisation" emptyLabel="Aucune réalisation publiée pour le moment" limit={3} mobileCarousel mosaic />
          )}
        </div>
      </div>
    </section>
  );
}
