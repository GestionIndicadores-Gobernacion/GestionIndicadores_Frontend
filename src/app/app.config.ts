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
    { provide: LOCALE_ID, useValue: 'es' },
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider(LUCIDE_ICON_SET),
    },
  ]
};