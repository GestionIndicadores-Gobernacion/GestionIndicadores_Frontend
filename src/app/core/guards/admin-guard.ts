import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * @deprecated Usar `permGuard({ perms: [...], fallbackRoles: [ROLE_IDS.ADMIN] })`.
 * Mantenido sólo durante shadow mode hasta que se retire `hasRole`.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    auth.handleExpiredSession('expired');
    return false;
  }

  if (!auth.hasRole(3)) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
