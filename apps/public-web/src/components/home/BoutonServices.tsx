import { ArrowRight, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';

/**
 * Le bouton « Découvrir nos services » de l'accueil mobile : pleine largeur, bleu marine, rond rouge à flèche animée et lueur
 * qui le traverse de temps en temps, pour qu'on le voie tout de suite sous la recherche.
 */
export function BoutonServices() {
  return (
    <Link
      to={ROUTES.services}
      className="btn-anime btn-brillance flex min-h-14 w-full items-center gap-3 rounded-2xl bg-mtm-primary-dark px-4 py-3 text-white shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-accent"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <LayoutGrid className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-bold leading-tight">Découvrir nos services</span>
        <span className="block text-xs text-white/75">Tous les pôles de MTM Immobilier</span>
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mtm-accent">
        <ArrowRight className="btn-fleche h-[18px] w-[18px]" aria-hidden="true" />
      </span>
    </Link>
  );
}
