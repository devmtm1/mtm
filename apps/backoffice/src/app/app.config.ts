import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { TitleStrategy, provideRouter, withInMemoryScrolling, withNavigationErrorHandler, withPreloading, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideEchartsCore } from 'ngx-echarts';

registerLocaleData(localeFr);

import { routes } from './app.routes';
import { estErreurDeChargement, rechargerSiVersionPerimee } from './core/version-perimee';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { activiteInterceptor } from './core/interceptors/activite.interceptor';
import { reessaiInterceptor } from './core/interceptors/reessai.interceptor';
import { PreloadSelectif } from './core/preload-selectif';
import { TitrePage } from './core/titre-page';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Dates et nombres en français dans les pipes Angular (date, number).
    { provide: LOCALE_ID, useValue: 'fr' },
    // Calendriers Material (sélecteurs de date) : sans adaptateur de date,
    // tout écran qui en affiche un plante au chargement.
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    provideRouter(
      routes,
      // Les écrans sont chargés à la demande ; les précharger en tâche de
      // fond dès l'ouverture rend ensuite chaque navigation instantanée.
      withPreloading(PreloadSelectif),
      // Fondu court entre deux pages (ignoré si l'utilisateur préfère moins d'animations).
      withViewTransitions({ skipInitialTransition: true }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      // Page restée ouverte pendant un déploiement : l'écran demandé n'existe plus sous ce nom.
      // On recharge pour récupérer la nouvelle version au lieu de laisser un clic sans effet.
      withNavigationErrorHandler(({ error }) => {
        if (estErreurDeChargement(error) && rechargerSiVersionPerimee()) return;
        throw error;
      }),
    ),
    // Du plus extérieur au plus intérieur : la barre compte toute la durée d'une requête (nouvel essai compris),
    // l'authentification gère le 401, puis les lectures coupées un instant sont rejouées une fois.
    provideHttpClient(withInterceptors([activiteInterceptor, authInterceptor, reessaiInterceptor])),
    { provide: TitleStrategy, useClass: TitrePage },
    provideAnimationsAsync(),
    // ECharts n'est pas encore utilisé en Phase 0 (dashboard placeholder).
    // Chargement paresseux (dynamic import) pour ne pas alourdir le bundle
    // initial avec une librairie ~1 Mo inutilisée à ce stade — le provider
    // est prêt, le poids réel n'est payé qu'à la Phase 3 (reporting) quand
    // un premier graphique est réellement rendu. Voir docs/FRONTEND_STACK.md.
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
};
