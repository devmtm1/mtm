/**
 * Environnement de test (branche « develop », services Render de test) :
 * mêmes réglages que la production, mais branché sur l'API et le site
 * public de test, pour que personne n'essaie une nouveauté sur les données
 * réelles.
 */
export const environment = {
  production: true,
  environmentName: 'test',
  apiUrl: 'https://mtm-2-v2wo.onrender.com/api',
  /** Site public de test : base des liens transmis aux clients. */
  publicWebUrl: 'https://mtm-public-web.onrender.com',
};
