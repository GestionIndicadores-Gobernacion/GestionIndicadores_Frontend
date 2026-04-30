import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError, shareReplay } from 'rxjs';

import { AuthService, SessionExpiredReason } from '../services/auth.service';

// Estado compartido SOLO para deduplicar el refresh concurrente.
// El flag de "sesión ya manejada" vive ahora en AuthService.
let refreshInProgress$: Observable<{ access_token: string }> | null = null;

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isAuthEndpoint = AUTH_PATHS.some(p => req.url.includes(p));

  // ─── Helpers ───────────────────────────────────────────────────────────
  const withToken = (token: string) =>
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const doRefresh = (): Observable<{ access_token: string }> => {
    if (!refreshInProgress$) {
      refreshInProgress$ = auth.refreshToken().pipe(
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      refreshInProgress$.subscribe({
        error: () => { refreshInProgress$ = null; },
        complete: () => { refreshInProgress$ = null; },
      });
    }
    return refreshInProgress$;
  };

  const reasonFromError = (err: HttpErrorResponse | null | undefined): SessionExpiredReason =>
    err?.status === 422 ? 'invalid' : 'expired';

  const handleSessionExpired = (reason: SessionExpiredReason, err: unknown) => {
    auth.handleExpiredSession(reason);
    return throwError(() => err);
  };

  // ─── Endpoints de auth: pasan sin lógica adicional ─────────────────────
  if (isAuthEndpoint) return next(req);

  // ─── Sin sesión utilizable: cortar de inmediato ────────────────────────
  if (!auth.hasValidRefreshToken() && auth.isTokenExpired()) {
    return handleSessionExpired(
      'expired',
      new Error('Session expired before request')
    );
  }

  // ─── Refresh PROACTIVO: access vence en <60s y hay refresh válido ──────
  if (auth.isTokenExpiringSoon() && auth.hasValidRefreshToken()) {
    return doRefresh().pipe(
      switchMap(res => next(withToken(res.access_token))),
      catchError((err: HttpErrorResponse) =>
        handleSessionExpired(reasonFromError(err), err)
      )
    );
  }

  // ─── Request normal con token vigente ──────────────────────────────────
  const token = auth.getAccessToken();
  const authReq = token ? withToken(token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo intervenimos si el error parece un rechazo de token
      // (incluye 401, 422 y 403 con shape de JWT).
      if (!auth.isAuthRejection(error)) {
        return throwError(() => error);
      }

      // Sin refresh válido → no hay nada que intentar.
      if (!auth.hasValidRefreshToken()) {
        return handleSessionExpired(reasonFromError(error), error);
      }

      // Con refresh válido → reintentar una vez tras refrescar.
      return doRefresh().pipe(
        switchMap(res => next(withToken(res.access_token))),
        catchError((retryError: HttpErrorResponse) =>
          handleSessionExpired(reasonFromError(retryError ?? error), retryError ?? error)
        )
      );
    })
  );
};
