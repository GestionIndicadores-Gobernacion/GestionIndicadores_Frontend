import { Injectable, NgZone, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Detecta sesiones expiradas en estados PASIVOS (sin requests).
 *
 * Cubre tres escenarios que el interceptor por sí solo no resuelve:
 *  1. La pestaña queda abierta horas sin interacción → polling cada minuto.
 *  2. El usuario vuelve a la pestaña tras dormir el equipo → visibilitychange.
 *  3. Otra pestaña cerró sesión → storage event (multi-tab).
 *
 * `handleExpiredSession` ya es idempotente (flag interno en AuthService),
 * así que disparar la verificación desde varios canales no genera spam.
 */
@Injectable({ providedIn: 'root' })
export class SessionMonitorService {

  private auth = inject(AuthService);
  private zone = inject(NgZone);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private started = false;

  private readonly CHECK_EVERY_MS = 60_000;
  private readonly TOKEN_KEYS = new Set(['access_token', 'refresh_token', 'user']);

  start(): void {
    if (this.started) return;
    this.started = true;

    this.checkSession();

    this.zone.runOutsideAngular(() => {
      this.intervalId = setInterval(() => {
        this.zone.run(() => this.checkSession());
      }, this.CHECK_EVERY_MS);
    });

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('storage', this.onStorageChange);
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('storage', this.onStorageChange);
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.checkSession();
    }
  };

  private onStorageChange = (event: StorageEvent): void => {
    if (event.key !== null && !this.TOKEN_KEYS.has(event.key)) return;

    // Otra pestaña borró los tokens (logout o expiración manejada allí).
    // Forzamos la reacción local aunque ya no quede ningún token.
    const tokensRemoved =
      event.key === 'access_token' || event.key === 'refresh_token';
    if (tokensRemoved && event.newValue === null) {
      this.auth.handleExpiredSession('expired');
      return;
    }

    this.checkSession();
  };

  /**
   * Si el usuario no tiene una sesión utilizable, dispara el flujo de
   * expiración. Si nunca hubo tokens (p.ej. está en /auth/login) salimos
   * silenciosamente para evitar toasts y redirecciones espurias.
   */
  private checkSession(): void {
    const hasAnyToken = !!this.auth.getAccessToken() || !!this.auth.getRefreshToken();
    if (!hasAnyToken) return;

    if (this.auth.isAuthenticated()) return;

    this.auth.handleExpiredSession('expired');
  }
}
