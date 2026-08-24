import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideEchartsCore } from 'ngx-echarts';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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
