import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Permission,
  RoleDetail,
  RolePermissionsResponse,
  UpdateRolePermissionsRequest,
} from '../models/admin.model';

/**
 * Cliente HTTP del módulo admin RBAC.
 *
 * Endpoints consumidos (Stream A):
 *  - `GET /roles`                       → RoleDetail[]
 *  - `GET /roles/:id/permissions`       → RolePermissionsResponse
 *  - `GET /permissions`                 → Permission[]
 *
 * El catálogo de permisos se cachea con `shareReplay(1)` durante la
 * sesión del SPA — el catálogo cambia rara vez y no quiere recargarse
 * en cada navegación a un rol distinto.
 *
 * Si el backend devuelve un shape parcial (porque `RoleSchema` aún no
 * emite `description` / `is_system` / counts en dev), el método
 * `getRoles()` loguea un warning y degrada con `undefined` — la UI
 * pinta "-" en esos casos.
 */
@Injectable({ providedIn: 'root' })
export class AdminRbacService {

  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;
  private readonly rolesApi = `${this.apiBase}/roles`;
  private readonly permissionsApi = `${this.apiBase}/permissions`;

  /** Cache del catálogo durante la sesión. */
  private catalog$: Observable<Permission[]> | null = null;

  /**
   * Lista los roles con metadata extendida (description / is_system /
   * permission_count / user_count). Si el backend no emite esos campos
   * todavía, los devuelve como `undefined` — la UI muestra "-".
   */
  getRoles(): Observable<RoleDetail[]> {
    return this.http.get<RoleDetail[] | { roles?: RoleDetail[] }>(this.rolesApi).pipe(
      map(res => this.normalizeRoles(res)),
    );
  }

  /** Carga el catálogo completo de permisos. Cacheado por sesión. */
  getPermissionsCatalog(): Observable<Permission[]> {
    if (!this.catalog$) {
      this.catalog$ = this.http
        .get<Permission[] | { permissions?: Permission[] }>(this.permissionsApi)
        .pipe(
          map(res => this.normalizeCatalog(res)),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.catalog$;
  }

  /**
   * Detalle de un rol: metadata + lista de permisos asignados.
   * El detalle del rol viene completo aquí (no necesita merge con `getRoles`).
   */
  getRolePermissions(roleId: number): Observable<RolePermissionsResponse> {
    const url = `${this.rolesApi}/${roleId}/permissions`;
    return this.http.get<RolePermissionsResponse>(url).pipe(
      tap(res => {
        if (!res?.role || !Array.isArray(res?.permissions)) {
          // Defensa para shape incompleto del backend mientras Stream A
          // termina de exponer el endpoint definitivo.
          console.warn(
            '[AdminRbacService] /roles/' + roleId + '/permissions response ' +
            'shape inesperado. Esperaba { role, permissions[] }.',
          );
        }
      }),
    );
  }

  /**
   * Reemplaza el set de permisos asignados al rol con el listado provisto.
   *
   * Endpoint: `PUT /roles/:id/permissions` con body
   * `{ permission_codes: string[] }`. La respuesta es el shape canónico
   * `{ role, permissions }` (idéntico a `GET /roles/:id/permissions`),
   * con los contadores ya actualizados — el caller puede usarla para
   * hidratar el estado sin volver a leer.
   *
   * Errores posibles del backend (no manejados aquí; el caller decide):
   *  - `403`: intento de remover un permiso crítico del rol admin.
   *  - `404`: algún `code` del listado no existe en el catálogo.
   *  - No-op (mismo set) → `200` sin audit log.
   *
   * Tras éxito invalidamos la cache del catálogo en forma defensiva,
   * por si el shape del backend hiciera cambios derivados que afecten
   * `is_critical` u otros metadatos del catálogo. Es idempotente.
   */
  updateRolePermissions(
    roleId: number,
    codes: ReadonlyArray<string>,
  ): Observable<RolePermissionsResponse> {
    const body: UpdateRolePermissionsRequest = {
      permission_codes: [...codes],
    };
    const url = `${this.rolesApi}/${roleId}/permissions`;
    return this.http.put<RolePermissionsResponse>(url, body).pipe(
      tap(() => this.resetCatalogCache()),
    );
  }

  /**
   * Invalida la cache del catálogo. Útil en tests y, eventualmente, cuando
   * un admin crea/elimina permisos (post D1).
   */
  resetCatalogCache(): void {
    this.catalog$ = null;
  }

  // ─── Normalización defensiva ────────────────────────────────────────

  private normalizeRoles(
    res: RoleDetail[] | { roles?: RoleDetail[] } | null | undefined,
  ): RoleDetail[] {
    const arr: RoleDetail[] = Array.isArray(res)
      ? res
      : (res?.roles ?? []);
    // Si el backend solo emite {id, name}, los campos extra quedan undefined
    // — la UI se encarga de mostrar "-".
    if (arr.length > 0 && arr[0].permission_count === undefined) {
      console.warn(
        '[AdminRbacService] /roles devolvió un shape sin permission_count/' +
        'user_count/description. El Stream A todavía no actualizó RoleSchema.',
      );
    }
    return arr;
  }

  private normalizeCatalog(
    res: Permission[] | { permissions?: Permission[] } | null | undefined,
  ): Permission[] {
    const arr: Permission[] = Array.isArray(res)
      ? res
      : (res?.permissions ?? []);
    return arr.map(p => ({
      code: p.code,
      description: p.description ?? '',
      module: p.module ?? this.inferModule(p.code),
    }));
  }

  /**
   * Fallback si el backend no envía `module`. La convención es el primer
   * segmento del code separado por punto. Caso especial:
   * `users.read_permissions` permanece en `users` (no en `roles`).
   */
  private inferModule(code: string): string {
    if (!code) return '';
    const idx = code.indexOf('.');
    return idx === -1 ? code : code.slice(0, idx);
  }
}
