import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { LUCIDE_ICON_SET } from './shared/icons/lucide-icons';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authInterceptor,      // 1️⃣ primero agrega token / maneja refresh
        errorInterceptor,     // 2️⃣ luego maneja errores globales
      ])
    ),
    // ng2-charts NO se provee aquí en root: `provideCharts(withDefaultRegisterables())`
    // arrastra todos los controllers/escalas/plugins de chart.js al bundle inicial
    // aunque las gráficas solo se usan en rutas lazy del dashboard. Por eso se
    // provee a nivel de ruta lazy en `DASHBOARD_LAYOUT_ROUTES`, manteniendo
    // chart.js fuera del initial bundle.
    { provide: LOCALE_ID, useValue: 'es' },
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider(LUCIDE_ICON_SET),
    },
  ]
};