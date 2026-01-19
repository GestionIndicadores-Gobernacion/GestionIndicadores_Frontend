import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const access = auth.getAccessToken();

  // ⚠️ NO meter access token al refresh
  const isRefresh = req.url.includes('/auth/refresh');

  let authReq = req;

  if (access && !isRefresh) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${access}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isRefresh) {
        return auth.refreshToken().pipe(
          switchMap(res => {
            const newToken = res.access_token;

            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });

            return next(retryReq);
          }),
          catchError(() => {
            auth.logout();
            router.navigate(['/auth/login']);
            return throwError(() => error);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
