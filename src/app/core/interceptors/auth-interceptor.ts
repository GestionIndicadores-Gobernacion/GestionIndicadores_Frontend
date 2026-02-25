import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isRefresh = req.url.includes('/auth/refresh');
  const isLogin = req.url.includes('/auth/login');

  // ✅ Si el token ya expiró localmente, refrescar antes de enviar
  if (!isRefresh && !isLogin && auth.isTokenExpired() && auth.getRefreshToken()) {
    return auth.refreshToken().pipe(
      switchMap(res => {
        return next(req.clone({
          setHeaders: { Authorization: `Bearer ${res.access_token}` }
        }));
      }),
      catchError(() => {
        auth.logout();
        router.navigate(['/auth/login']);
        return throwError(() => new Error('Session expired'));
      })
    );
  }

  const access = auth.getAccessToken();
  const authReq = access && !isRefresh
    ? req.clone({ setHeaders: { Authorization: `Bearer ${access}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isRefresh) {
        return auth.refreshToken().pipe(
          switchMap(res => next(req.clone({
            setHeaders: { Authorization: `Bearer ${res.access_token}` }
          }))),
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