import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);
  const auth = inject(AuthService);

  const token = auth.getAccessToken();

  // ❌ No token → fuera
  if (!token) {
    router.navigate(['/auth/login']);
    return false;
  }

  // 1️⃣ Intentar validar token con /auth/me
  return auth.me().pipe(
    map(() => true),
    catchError(() => {

      const refresh = auth.getRefreshToken();
      if (!refresh) {
        router.navigate(['/auth/login']);
        return of(false);
      }

      // 2️⃣ Intentar refresh token
      return auth.refreshToken().pipe(
        map((res) => {
          if (res?.access_token) {
            return true;
          }
          router.navigate(['/auth/login']);
          return false;
        }),
        catchError(() => {
          router.navigate(['/auth/login']);
          return of(false);
        })
      );
    })
  );
};
