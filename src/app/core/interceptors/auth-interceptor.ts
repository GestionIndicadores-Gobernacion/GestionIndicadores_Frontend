import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, Observable, Subject, share, take } from 'rxjs';

// 🔒 Estado compartido entre todas las llamadas al interceptor
let refreshInProgress$: Observable<{ access_token: string }> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isRefresh = req.url.includes('/auth/refresh');
  const isLogin   = req.url.includes('/auth/login');

  // ─── Helper: clonar request con el nuevo token ───────────────────────
  const withToken = (token: string) =>
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  // ─── Helper: hacer refresh y encolar requests concurrentes ───────────
  const doRefresh = (): Observable<{ access_token: string }> => {
    if (!refreshInProgress$) {
      refreshInProgress$ = auth.refreshToken().pipe(
        share(),   // todos los suscriptores comparten la misma llamada HTTP
      );
      // Limpiar cuando termine (éxito o error)
      refreshInProgress$.subscribe({ complete: () => refreshInProgress$ = null,
                                      error:    () => refreshInProgress$ = null });
    }
    return refreshInProgress$;
  };

  // ─── Rutas públicas: no tocar ─────────────────────────────────────────
  if (isRefresh || isLogin) return next(req);

  // ─── Refresh PROACTIVO: token expira en < 60 seg ──────────────────────
  if (auth.isTokenExpiringSoon() && auth.getRefreshToken()) {
    return doRefresh().pipe(
      switchMap(res => next(withToken(res.access_token))),
      catchError(() => {
        auth.logout();
        router.navigate(['/auth/login']);
        return throwError(() => new Error('Session expired'));
      })
    );
  }

  // ─── Request normal con token vigente ────────────────────────────────
  const token = auth.getAccessToken();
  const authReq = token ? withToken(token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Refresh REACTIVO: llegó un 401 inesperado
      if (error.status === 401 && auth.getRefreshToken()) {
        return doRefresh().pipe(
          switchMap(res => next(withToken(res.access_token))),
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