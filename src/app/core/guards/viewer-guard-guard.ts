
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const viewerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    auth.handleExpiredSession('expired');
    return false;
  }

  // Bloquea solo el rol viewer (id=1) — admin(3), editor(2), monitor(4) pasan
  if (auth.hasRole(1)) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
