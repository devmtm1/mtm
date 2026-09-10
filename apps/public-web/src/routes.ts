/** Chemins de routes centralisés — évite les chaînes dupliquées dans Header/Footer/liens internes. */
export const ROUTES = {
  home: '/',
  catalog: '/terrains',
  terrainDetail: (id: string) => `/terrains/${id}`,
  about: '/a-propos',
  gestionLocative: '/gestion-locative',
  construction: '/construction',
  demarches: '/demarches-administratives',
  realisations: '/realisations',
  projetsAVenir: '/projets-a-venir',
  actualites: '/actualites',
  contact: '/contact',
  clientLogin: '/espace-client/connexion',
  clientPortal: '/espace-client',
} as const;
