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
  /** Fiche d'une réalisation ou d'un projet à venir, sous sa liste d'origine. */
  showcaseDetail: (category: string, id: string) =>
    `${category === 'projet_a_venir' ? '/projets-a-venir' : '/realisations'}/${id}`,
  actualites: '/actualites',
  contact: '/contact',
  clientLogin: '/espace-client/connexion',
  /** Espace client : une application à part (sans en-tête ni pied de page du site). */
  clientPortal: '/espace-client',
  clientDossiers: '/espace-client/dossiers',
  clientMissions: '/espace-client/verifications',
  clientDemandes: '/espace-client/demandes',
  clientCompte: '/espace-client/compte',
} as const;
