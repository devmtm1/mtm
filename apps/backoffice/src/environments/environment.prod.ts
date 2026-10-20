/**
 * Production (branche « main ») : API du service Render `mtm-api`, exposée
 * sous le nom de domaine de MTM (api.mtm-immobilier.com), et site public
 * hébergé sur Cloudflare Pages (www.mtm-immobilier.com).
 */
export const environment = {
  production: true,
  environmentName: 'production',
  apiUrl: 'https://api.mtm-immobilier.com/api',
  /** Site public de production (projet Cloudflare Pages). */
  publicWebUrl: 'https://www.mtm-immobilier.com',
};
