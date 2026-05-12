import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

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
    // ng2-charts 10 es la versión compatible con Angular 21. Sustituye al
    // `NgChartsModule` de v5: `BaseChartDirective` es standalone y los
    // registerables de Chart.js se inyectan vía `NG_CHARTS_CONFIGURATION`
    // (token consumido por la propia directiva en su constructor).
    // `withDefaultRegisterables()` registra los controllers/escalas/plugins
    // por defecto — sin esto los `<canvas baseChart>` no pintan en absoluto.
    provideCharts(withDefaultRegisterables()),
    { provide: LOCALE_ID, useValue: 'es' },
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider(LUCIDE_ICON_SET),
    },
  ]
};