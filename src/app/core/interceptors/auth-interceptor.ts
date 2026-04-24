import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError, shareReplay } from 'rxjs';

import { AuthService, SessionExpiredReason } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

// ─── Estado compartido entre todas las invocaciones del interceptor ──────
let refreshInProgress$: Observable<{ access_token: string }> | null = null;
let sessionExpiredHandled = false;

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const isAuthEndpoint = AUTH_PATHS.some(p => req.url.includes(p));

  // ─── Helpers ───────────────────────────────────────────────────────────
  const withToken = (token: string) =>
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const doRefresh = (): Observable<{ access_token: string }> => {
    if (!refreshInProgress$) {
      refreshInProgress$ = auth.refreshToken().pipe(
        // Todos los suscriptores comparten la misma petición HTTP y
        // reciben el valor emitido incluso si se suscriben tarde.
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      // Al terminar (éxito o error) limpiamos para habilitar futuros refreshes.
      refreshInProgress$.subscribe({
        error: () => { refreshInProgress$ = null; },
        complete: () => { refreshInProgress$ = null; },
      });
    }
    return refreshInProgress$;
  };

  const handleSessionExpired = (reason: SessionExpiredReason, err: unknown) => {
    // Evita múltiples toasts/navegaciones cuando caen N requests en paralelo.
    if (!sessionExpiredHandled) {
      sessionExpiredHandled = true;
      auth.logout(reason);
      const message = reason === 'expired'
        ? 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
        : 'Tu sesión no es válida. Por favor inicia sesión nuevamente.';
      toast.warning(message);
      router.navigate(['/auth/login']).finally(() => {
        // Permitir volver a manejarlo si el usuario re-loguea y expira de nuevo.
        setTimeout(() => { sessionExpiredHandled = false; }, 1000);
      });
    }
    return throwError(() => err);
  };

  const isAuthError = (err: HttpErrorResponse): boolean => {
    // 401 → backend: token_expired / token_invalid / token_missing.
    // 422 → token JWT malformado (legacy fallback de flask-jwt-extended).
    return err.status === 401 || err.status === 422;
  };

  // ─── Endpoints públicos o de auth: pasan sin token extra ────────────────
  if (isAuthEndpoint) return next(req);

  // ─── Sin refresh token utilizable: intento directo, y si falla → logout ─
  if (!auth.hasValidRefreshToken() && auth.isTokenExpired()) {
    return handleSessionExpired(
      auth.getRefreshToken() ? 'expired' : 'expired',
      new Error('Session expired before request')
    );
  }

  // ─── Refresh PROACTIVO: access token vence en <60s y hay refresh válido ─
  if (auth.isTokenExpiringSoon() && auth.hasValidRefreshToken()) {
    return doRefresh().pipe(
      switchMap(res => next(withToken(res.access_token))),
      catchError((err: HttpErrorResponse) =>
        handleSessionExpired('expired', err)
      )
    );
  }

  // ─── Request normal con token vigente ──────────────────────────────────
  const token = auth.getAccessToken();
  const authReq = token ? withToken(token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isAuthError(error)) {
        return throwError(() => error);
      }

      // Sin refresh válido → no hay nada que intentar.
      if (!auth.hasValidRefreshToken()) {
        const reason: SessionExpiredReason =
          error.status === 422 ? 'invalid' : 'expired';
        return handleSessionExpired(reason, error);
      }

      // Con refresh válido → reintentar una vez tras refrescar.
      return doRefresh().pipe(
        switchMap(res => next(withToken(res.access_token))),
        catchError((retryError: HttpErrorResponse) => {
          // El retry o el refresh fallaron definitivamente.
          const reason: SessionExpiredReason =
            retryError?.status === 422 ? 'invalid' : 'expired';
          return handleSessionExpired(reason, retryError ?? error);
        })
      );
    })
  );
};
