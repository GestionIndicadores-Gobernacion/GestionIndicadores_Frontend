import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  // isAuthenticated() ahora devuelve true si:
  //  - access válido, o
  //  - access expirado pero refresh válido (interceptor refrescará).
  if (auth.isAuthenticated()) {
    return true;
  }

  // No hay sesión utilizable → limpiar y redirigir con aviso.
  const reason = auth.getRefreshToken() ? 'expired' : 'expired';
  auth.logout(reason);
  toast.warning('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
  router.navigate(['/auth/login']);
  return false;
};
