/**
 * Production (branche « main ») : API du service Render `mtm-api` et site
 * public hébergé sur Cloudflare Pages. Ces deux adresses changent une
 * dernière fois à la mise en service du nom de domaine (api./www.).
 */
export const environment = {
  production: true,
  environmentName: 'production',
  // À ajuster dès que le service de production existe : Render ajoute un
  // suffixe au nom si « mtm-api » est déjà pris sur la plateforme.
  apiUrl: 'https://mtm-api.onrender.com/api',
  /** Site public de production (projet Cloudflare Pages). */
  publicWebUrl: 'https://mtm-public-web.pages.dev',
};
