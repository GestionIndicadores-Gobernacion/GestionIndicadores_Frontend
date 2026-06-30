import { Injectable, NgZone, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';

/**
 * Detecta sesiones expiradas en estados PASIVOS (sin requests).
 *
 * Cubre los escenarios que el interceptor por sí solo no resuelve:
 *  1. La pestaña queda abierta horas sin interacción → polling cada minuto.
 *  2. El usuario vuelve a la pestaña tras dormir el equipo → visibilitychange
 *     / focus / pageshow (este último es el ÚNICO fiable en el bfcache de
 *     iOS Safari, donde `visibilitychange` no se dispara al restaurar).
 *  3. Otra pestaña cerró sesión → storage event (multi-tab).
 *
 * Las comprobaciones locales (`isAuthenticated`) dependen del reloj del
 * dispositivo; en iOS un reloj desfasado hace que el token parezca válido
 * aunque el servidor ya lo rechazó. Por eso, al REANUDAR la pestaña validamos
 * además contra el servidor (`verifyWithServer`) — verdad absoluta.
 *
 * `handleExpiredSession` es idempotente (flag interno en AuthService), así que
 * disparar la verificación desde varios canales no genera spam.
 */
@Injectable({ providedIn: 'root' })
export class SessionMonitorService {

  private auth = inject(AuthService);
  private zone = inject(NgZone);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private started = false;

  private readonly CHECK_EVERY_MS = 60_000;
  // No machacar el backend con pings: máximo uno cada 10 s al reanudar.
  private readonly SERVER_CHECK_THROTTLE_MS = 10_000;
  private lastServerCheck = 0;

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

    // Reanudación de la pestaña: varios eventos porque ninguno es fiable en
    // todos los navegadores. iOS Safari restaura desde bfcache con `pageshow`
    // (a veces sin `visibilitychange`); el escritorio suele usar `focus`.
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('focus', this.onResume);
    window.addEventListener('pageshow', this.onResume);
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
    window.removeEventListener('focus', this.onResume);
    window.removeEventListener('pageshow', this.onResume);
    window.removeEventListener('storage', this.onStorageChange);
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') this.onResume();
  };

  /** La pestaña volvió a primer plano: revisión local + validación servidor. */
  private onResume = (): void => {
    this.zone.run(() => {
      this.checkSession();
      this.verifyWithServer();
    });
  };

  private onStorageChange = (event: StorageEvent): void => {
    if (event.key !== null && !this.TOKEN_KEYS.has(event.key)) return;

    // Otra pestaña borró los tokens (logout o expiración manejada allí).
    // Forzamos la reacción local aunque ya no quede ningún token.
    const tokensRemoved =
      event.key === 'access_token' || event.key === 'refresh_token';
    if (tokensRemoved && event.newValue === null) {
      this.zone.run(() => this.auth.handleExpiredSession('expired'));
      return;
    }

    this.zone.run(() => this.checkSession());
  };

  /**
   * Verificación LOCAL (barata, basada en el reloj del dispositivo). Si el
   * usuario no tiene una sesión utilizable, dispara el flujo de expiración.
   * Si nunca hubo tokens (p.ej. está en /auth/login) salimos en silencio.
   */
  private checkSession(): void {
    if (!this.hasAnyToken()) return;
    if (this.auth.isAuthenticated()) return;
    this.auth.handleExpiredSession('expired');
  }

  /**
   * Verificación contra el SERVIDOR (verdad absoluta, ignora el reloj local).
   * Solo al reanudar la pestaña y con throttle, para no saturar el backend.
   * Si el backend rechaza el token (sesión realmente expirada), forzamos el
   * logout aunque localmente el token "pareciera" válido.
   */
  private verifyWithServer(): void {
    if (!this.hasAnyToken()) return;

    const now = Date.now();
    if (now - this.lastServerCheck < this.SERVER_CHECK_THROTTLE_MS) return;
    this.lastServerCheck = now;

    this.auth.pingSession().subscribe({
      // OK → la sesión es válida en el servidor; nada que hacer.
      next: () => { /* sesión válida */ },
      error: (err: HttpErrorResponse) => {
        // Solo reaccionamos a rechazos de token. Errores de red/5xx se
        // ignoran para no cerrar sesión por una caída momentánea.
        if (this.auth.isAuthRejection(err)) {
          this.auth.handleExpiredSession('expired');
        }
      },
    });
  }

  private hasAnyToken(): boolean {
    return !!this.auth.getAccessToken() || !!this.auth.getRefreshToken();
  }
}
