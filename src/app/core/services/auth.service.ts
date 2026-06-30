import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, forkJoin, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

import { LoginRequest, LoginResponse } from '../models/auth.model';
import { ToastService } from './toast.service';
import { PermissionService } from './permission.service';

interface JwtPayload {
  sub: string | number;
  role_id: number;
  exp: number;
  permissions?: string[];
  role?: string;
}

export type SessionExpiredReason = 'expired' | 'invalid' | 'manual';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private api = `${environment.apiUrl}/auth`;
  private router = inject(Router);
  private toast = inject(ToastService);
  private perms = inject(PermissionService);

  // Bandera única para evitar disparar múltiples toasts/redirects cuando
  // varias peticiones fallan en paralelo. Se libera en login() exitoso.
  private sessionExpiredHandled = false;

  constructor(private http: HttpClient) {
    // Bootstrap desde localStorage en page reload: hidrata el set de
    // permisos antes de que cualquier guard/directiva lo consulte.
    this.perms.loadFromAccessToken(this.getAccessToken());
  }

  // =====================================================
  // 1️⃣ LOGIN
  // =====================================================
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, data).pipe(
      tap(res => {
        this.saveSession(res.access_token, res.refresh_token, res.user);
        if (!this.perms.loadFromLoginUser(res.user as any)) {
          this.perms.loadFromAccessToken(res.access_token);
        }
        // Reset limpio: nuevo login → habilitar futuras detecciones.
        this.sessionExpiredHandled = false;
      })
    );
  }

  // =====================================================
  // 2️⃣ GUARDAR SESIÓN
  // =====================================================
  saveSession(access: string, refresh: string, user: any) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // =====================================================
  // 3️⃣ OBTENER TOKENS / USER
  // =====================================================
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getUser(): any | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  // =====================================================
  // 4️⃣ JWT HELPERS (FUENTE DE VERDAD)
  // =====================================================
  getTokenPayload(): JwtPayload | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const payload = this.getTokenPayload();
    if (!payload) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  // ─── Refresh token helpers ───────────────────────────────────────
  private decodeRefreshPayload(): { exp?: number } | null {
    const token = this.getRefreshToken();
    if (!token) return null;
    try {
      return jwtDecode<{ exp?: number }>(token);
    } catch {
      return null;
    }
  }

  isRefreshTokenExpired(): boolean {
    const payload = this.decodeRefreshPayload();
    if (!payload?.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  hasValidRefreshToken(): boolean {
    return !!this.getRefreshToken() && !this.isRefreshTokenExpired();
  }

  /**
   * Autenticado "efectivo": el usuario tiene sesión utilizable.
   * - access válido → true
   * - access expirado pero refresh válido → true (el interceptor lo renovará)
   * - sin tokens o ambos expirados → false
   */
  isAuthenticated(): boolean {
    if (this.getAccessToken() && !this.isTokenExpired()) return true;
    return this.hasValidRefreshToken();
  }

  /**
   * Estricto: access token vigente. Útil solo para decisiones internas;
   * los guards deben usar isAuthenticated() para permitir el refresh silencioso.
   */
  hasLiveAccessToken(): boolean {
    return !!this.getAccessToken() && !this.isTokenExpired();
  }

  /**
   * @deprecated Usar `PermissionService.hasPermissionOrRole(...)` en su lugar.
   * Esta función queda durante shadow mode (Fase C) porque `adminGuard` y
   * `viewerGuard` todavía la consumen. Se eliminará cuando se apague
   * `PERM_SHADOW_MODE` en backend y se retire la compatibilidad por rol.
   */
  hasRole(roleId: number): boolean {
    const payload = this.getTokenPayload();
    return payload?.role_id === roleId;
  }

  // =====================================================
  // 5️⃣ PERFIL (NO USAR COMO GUARD)
  // =====================================================
  me(): Observable<any> {
    return this.http.get(`${this.api}/me`);
  }

  /**
   * Verificación de sesión contra el SERVIDOR (verdad absoluta).
   *
   * A diferencia de `isTokenExpired()` / `isAuthenticated()`, no depende del
   * reloj local del dispositivo. Esencial en iOS, donde un reloj desfasado o
   * el equipo suspendido hacen que el token parezca válido localmente aunque
   * el backend ya lo rechazó. Pega a un endpoint liviano `jwt_required`; si
   * responde 401/expirado, el authInterceptor dispara el flujo de logout.
   */
  pingSession(): Observable<unknown> {
    return this.http.get(`${environment.apiUrl}/users/me/permissions`);
  }

  // =====================================================
  // 6️⃣ REFRESH TOKEN
  // =====================================================
  /**
   * Renueva el access token. A partir de Fase 2 el backend también rota
   * el refresh token: si la respuesta incluye `refresh_token`, lo
   * persistimos para reemplazar el anterior (que el backend ya revocó).
   * El campo es opcional para mantener compatibilidad hacia atrás con
   * backends que aún no devuelvan el nuevo refresh.
   */
  refreshToken(): Observable<{ access_token: string; refresh_token?: string }> {
    const refresh = this.getRefreshToken();

    return this.http.post<{ access_token: string; refresh_token?: string }>(
      `${this.api}/refresh`,
      {},
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${refresh}`,
        }),
      }
    ).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
        if (res.refresh_token) {
          localStorage.setItem('refresh_token', res.refresh_token);
        }
        this.perms.loadFromAccessToken(res.access_token);
      })
    );
  }

  // Agrega este método junto a isTokenExpired()
  isTokenExpiringSoon(marginSeconds = 60): boolean {
    const payload = this.getTokenPayload();
    if (!payload) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now < marginSeconds; // vence en menos de 60 seg
  }

  // =====================================================
  // 7️⃣ LOGOUT
  // =====================================================
  /**
   * Limpia la sesión local. Acepta una razón opcional que se expone
   * vía `lastSessionExpiredReason` para que la capa de UI pueda
   * reaccionar (toast, mensaje en login, etc.).
   */
  logout(reason?: SessionExpiredReason): void {
    this.perms.clear();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    if (reason) {
      AuthService._lastReason = reason;
    }
  }

  /**
   * Logout "real": revoca el access y el refresh en el backend antes
   * de limpiar la sesión local. Tolerante a errores: si el backend
   * está caído, devuelve 401 o cualquier otra cosa, la sesión local
   * se limpia igualmente y se navega a /auth/login.
   *
   * Llamarlo solo desde acciones explícitas del usuario (botón
   * "Cerrar sesión"). Para expiración automática usar
   * `handleExpiredSession()` — ese no llama al backend porque el
   * token ya está vencido y solo provocaría un 401.
   */
  logoutFromServer(): Observable<void> {
    const access = this.getAccessToken();
    const refresh = this.getRefreshToken();

    const revokeAccess$ = access
      ? this.http.post(`${this.api}/logout`, {}, {
          headers: new HttpHeaders({ Authorization: `Bearer ${access}` }),
        }).pipe(catchError(() => of(null)))
      : of(null);

    const revokeRefresh$ = refresh
      ? this.http.post(`${this.api}/logout-refresh`, {}, {
          headers: new HttpHeaders({ Authorization: `Bearer ${refresh}` }),
        }).pipe(catchError(() => of(null)))
      : of(null);

    return forkJoin([revokeAccess$, revokeRefresh$]).pipe(
      // Mapeamos a void y centralizamos limpieza + navegación en finalize,
      // así un error inesperado no deja la sesión en estado mixto.
      finalize(() => {
        this.logout();
        this.sessionExpiredHandled = false;
        if (!this.router.url.startsWith('/auth/login')) {
          this.router.navigate(['/auth/login']);
        }
      }),
      // forkJoin emite un array; lo descartamos. Importante: solo emite
      // tras completarse ambos requests, evitando "doble navegación".
      tap(() => undefined),
    ) as unknown as Observable<void>;
  }

  private static _lastReason: SessionExpiredReason | null = null;

  /** Lee y consume la última razón de expiración (one-shot). */
  consumeSessionExpiredReason(): SessionExpiredReason | null {
    const r = AuthService._lastReason;
    AuthService._lastReason = null;
    return r;
  }

  // =====================================================
  // 8️⃣ HELPER UNIFICADO DE SESIÓN EXPIRADA
  // =====================================================
  /**
   * Punto único para reaccionar a una sesión inválida/expirada.
   * Lo usan: authInterceptor, authGuard, adminGuard, viewerGuard.
   *
   * Toast + logout son idempotentes (no duplicar al usuario).
   * La navegación al login SIEMPRE se intenta: si no separamos esto,
   * un click en un link protegido tras la primera expiración hace que
   * el guard rechace la navegación pero no haya nada que avise al
   * usuario — los enlaces parecen "inertes".
   */
  handleExpiredSession(reason: SessionExpiredReason = 'expired'): void {
    if (!this.sessionExpiredHandled) {
      this.sessionExpiredHandled = true;
      this.logout(reason);
      const message = reason === 'invalid'
        ? 'Tu sesión no es válida. Por favor inicia sesión nuevamente.'
        : 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
      this.toast.warning(message);
    }

    if (!this.router.url.startsWith('/auth/login')) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Heurística para decidir si una respuesta HTTP está rechazando el token,
   * incluso cuando el backend devuelve 403 en vez de 401.
   * Cubre payloads de flask-jwt-extended (`error: token_expired`, `msg: ...`).
   */
  isAuthRejection(err: HttpErrorResponse): boolean {
    if (err.status === 401) return true;

    // 422 → JWT malformado (fallback legacy de flask-jwt-extended).
    if (err.status === 422) return true;

    // 403 con shape de error de token: tratarlo como auth, no como permisos.
    if (err.status === 403) {
      const body = err.error;
      const candidates: unknown[] = [
        body?.error,
        body?.code,
        body?.msg,
        body?.message,
      ];
      const tokenPattern = /^token_|expired|invalid_token|revoked|missing.*token|not.*authoriz/i;
      return candidates.some(
        v => typeof v === 'string' && tokenPattern.test(v)
      );
    }

    return false;
  }
}
