import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideEchartsCore } from 'ngx-echarts';

registerLocaleData(localeFr);

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Dates et nombres en français dans les pipes Angular (date, number).
    { provide: LOCALE_ID, useValue: 'fr' },
    provideRouter(
      routes,
      // Les écrans sont chargés à la demande ; les précharger en tâche de
      // fond dès l'ouverture rend ensuite chaque navigation instantanée.
      withPreloading(PreloadAllModules),
      // Fondu court entre deux pages (ignoré si l'utilisateur préfère moins d'animations).
      withViewTransitions({ skipInitialTransition: true }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    // ECharts n'est pas encore utilisé en Phase 0 (dashboard placeholder).
    // Chargement paresseux (dynamic import) pour ne pas alourdir le bundle
    // initial avec une librairie ~1 Mo inutilisée à ce stade — le provider
    // est prêt, le poids réel n'est payé qu'à la Phase 3 (reporting) quand
    // un premier graphique est réellement rendu. Voir docs/FRONTEND_STACK.md.
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
};
