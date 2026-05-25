import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import { environment } from '../../../environments/environment';
import { PermCode, RoleId, ROLE_IDS } from '../constants/permissions';

interface TokenPayloadWithPerms {
  sub?: string | number;
  role_id?: number;
  permissions?: string[];
  exp?: number;
}

/**
 * Fuente de verdad de los permisos efectivos del usuario activo en el
 * cliente. Carga preferente desde el claim `permissions` del JWT (sin
 * red); si el token es viejo y no trae el claim, cae a
 * `GET /users/me/permissions`.
 *
 * Convivencia con el modelo basado en rol:
 *  - El backend está en `PERM_SHADOW_MODE` durante Fase C: el rol sigue
 *    siendo la verdad de autorización. El frontend usa permisos como
 *    señal preferente, pero `hasPermissionOrRole(...)` permite caer al
 *    rol para no esconder UI si `role_permissions` aún no cubre todo.
 *  - En C7 se quita el fallback de rol y queda solo `hasPermission`.
 *
 * El estado se expone como Signal para que la directiva `*appCan` y
 * cualquier componente standalone reaccionen automáticamente a cambios
 * (login, refresh, logout, refresh manual de permisos).
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {

  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/users`;

  /** Set inmutable de permisos efectivos. Vacío = sin sesión o sin perms. */
  private readonly _permissions = signal<ReadonlySet<string>>(new Set());

  /**
   * Versión monótona que incrementa con cada `set`/`clear`. La directiva
   * `*appCan` puede leerla con un `effect` para re-renderizar.
   */
  readonly version = computed(() => this._versionTick());
  private readonly _versionTick = signal(0);

  /** Snapshot inmutable del set actual — útil para debugging y tests. */
  snapshot(): ReadonlySet<string> {
    return this._permissions();
  }

  /** Reemplaza el set completo. Idempotente respecto al contenido. */
  private setAll(codes: Iterable<string>): void {
    const next = new Set<string>(codes);
    // Solo bumpea version si el set cambió de tamaño o de contenido.
    const prev = this._permissions();
    if (prev.size === next.size) {
      let same = true;
      for (const c of next) {
        if (!prev.has(c)) { same = false; break; }
      }
      if (same) return;
    }
    this._permissions.set(next);
    this._versionTick.update(v => v + 1);
  }

  /**
   * Carga permisos desde un access token JWT. Devuelve true si el claim
   * estaba presente; false si el token es viejo y hay que ir al endpoint.
   */
  loadFromAccessToken(accessToken: string | null | undefined): boolean {
    if (!accessToken) {
      this.clear();
      return false;
    }
    try {
      const payload = jwtDecode<TokenPayloadWithPerms>(accessToken);
      if (Array.isArray(payload.permissions)) {
        this.setAll(payload.permissions);
        return true;
      }
    } catch {
      // token malformado → tratamos como ausencia
    }
    this.setAll([]);
    return false;
  }

  /**
   * Atajo para login: el backend ya envía `user.permissions` en el body.
   * Si está presente, se usa directamente sin decodificar el JWT.
   * Devuelve true si pudo poblarse desde el body.
   */
  loadFromLoginUser(user: { permissions?: string[] | null } | null | undefined): boolean {
    if (user && Array.isArray(user.permissions)) {
      this.setAll(user.permissions);
      return true;
    }
    return false;
  }

  /**
   * Pega `GET /users/me/permissions` y reemplaza el set. Útil:
   *  - Como fallback cuando el JWT no trae el claim.
   *  - Como refresh manual tras cambios de permisos sin re-login.
   */
  refresh(): Observable<ReadonlySet<string>> {
    return this.http
      .get<{ permissions: string[] }>(`${this.api}/me/permissions`)
      .pipe(
        tap(res => this.setAll(res?.permissions ?? [])),
        // Mapear a snapshot post-set
        tap(() => undefined),
        catchError(() => of({ permissions: [] as string[] })),
      ) as unknown as Observable<ReadonlySet<string>>;
  }

  /** Vacía el set y bumpea versión. Llamar en logout. */
  clear(): void {
    if (this._permissions().size === 0) return;
    this._permissions.set(new Set());
    this._versionTick.update(v => v + 1);
  }

  // ───────────────────────── Checks puros ─────────────────────────

  hasPermission(code: PermCode | string): boolean {
    return this._permissions().has(code);
  }

  hasAny(...codes: ReadonlyArray<PermCode | string>): boolean {
    if (codes.length === 0) return true;
    const perms = this._permissions();
    for (const c of codes) {
      if (perms.has(c)) return true;
    }
    return false;
  }

  hasAll(...codes: ReadonlyArray<PermCode | string>): boolean {
    if (codes.length === 0) return true;
    const perms = this._permissions();
    for (const c of codes) {
      if (!perms.has(c)) return false;
    }
    return true;
  }

  // ─────────────────────── Modo dual transitorio ───────────────────────

  /**
   * Convivencia con el modelo basado en rol durante Fase C.
   * Devuelve true si el usuario tiene `code` O cualquiera de los
   * `fallbackRoleIds` indicados. El segundo argumento se queda hasta C7.
   *
   * Si el set de permisos está vacío (JWT viejo y endpoint todavía
   * sin cargar) no caemos al rol implícitamente: el caller decide
   * pasando explícitamente los roleIds.
   */
  hasPermissionOrRole(
    code: PermCode | string,
    currentRoleId: number | null | undefined,
    ...fallbackRoleIds: ReadonlyArray<RoleId | number>
  ): boolean {
    if (this.hasPermission(code)) return true;
    if (currentRoleId == null) return false;
    return fallbackRoleIds.includes(currentRoleId);
  }

  /**
   * True si el usuario NO está restringido a sus `component_assignments`:
   * ve todo el catálogo de componentes y estrategias. Hoy admin y monitor.
   *
   * Nota: esto es SCOPING, no autorización. No tiene perm equivalente en
   * el catálogo. No combinar con `hasPermissionOrRole` — usar este helper
   * dedicado para que la intención sea explícita y fácil de evolucionar.
   */
  bypassesComponentScope(roleId: number | null | undefined): boolean {
    if (roleId == null) return false;
    return roleId === ROLE_IDS.ADMIN || roleId === ROLE_IDS.MONITOR;
  }
}
