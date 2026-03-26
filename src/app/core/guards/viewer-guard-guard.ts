import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const viewerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  // viewer (id=1) no puede acceder
  if (auth.hasRole(1)) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};