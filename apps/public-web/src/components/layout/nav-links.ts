import { ROUTES } from '../../routes';

/** Liens principaux du site, partagés par le menu ordinateur et le menu mobile. */
export const PRIMARY_LINKS = [
  { to: ROUTES.home, label: 'Accueil' },
  { to: ROUTES.catalog, label: 'Nos biens' },
  { to: ROUTES.locations, label: 'Locations' },
  { to: ROUTES.realisations, label: 'Nos réalisations' },
  { to: ROUTES.projetsAVenir, label: 'Projets à venir' },
  { to: ROUTES.about, label: 'À propos' },
];

export const SERVICE_LINKS = [
  { to: ROUTES.gestionLocative, label: 'Gestion locative' },
  { to: ROUTES.construction, label: 'Construction' },
  { to: ROUTES.demarches, label: 'Démarches administratives' },
];
