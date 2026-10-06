import { FileSearch, Hammer, KeyRound, Newspaper, Sparkles, type LucideIcon } from 'lucide-react';
import { ROUTES } from '../../routes';

interface ServiceLink {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Ce que MTM fait en dehors de la vente et de la location : les trois services,
 * puis ce qui montre le travail accompli. Sert à l'onglet « Services » et à la
 * tuile « Autres » de l'accueil.
 */
export const SERVICES: ServiceLink[] = [
  {
    to: ROUTES.gestionLocative,
    label: 'Gestion locative',
    description: 'Confiez-nous vos biens à louer',
    icon: KeyRound,
  },
  {
    to: ROUTES.construction,
    label: 'Construction',
    description: 'Votre projet, du devis à la livraison',
    icon: Hammer,
  },
  {
    to: ROUTES.demarches,
    label: 'Démarches administratives',
    description: 'Vérification foncière et démarches',
    icon: FileSearch,
  },
  {
    to: ROUTES.realisations,
    label: 'Nos réalisations',
    description: 'Nos projets livrés',
    icon: Sparkles,
  },
  {
    to: ROUTES.projetsAVenir,
    label: 'Projets à venir',
    description: 'Nos prochains programmes',
    icon: Hammer,
  },
  {
    to: ROUTES.actualites,
    label: 'Actualités et conseils',
    description: 'Conseils et nouvelles de MTM',
    icon: Newspaper,
  },
];

/** Pages que la feuille propose : l'onglet « Services » est actif sur chacune. */
export function isServiceRoute(pathname: string): boolean {
  return SERVICES.some((service) => pathname === service.to || pathname.startsWith(`${service.to}/`));
}
