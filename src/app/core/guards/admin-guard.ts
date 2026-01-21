import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  const userString = localStorage.getItem('user');

  if (!userString) {
    router.navigate(['/auth/login']);
    return false;
  }

  const user = JSON.parse(userString);

  // SOLO SuperAdmin
  if (user.role_id !== 1) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
