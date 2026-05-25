// Servicio dedicado a la lectura y mutación de permisos efectivos y
// overrides de un usuario específico. Vive separado de `UsersService` porque:
//   - Sus endpoints (`/users/:id/permissions[...]`) sólo los consumen los
//     componentes admin del módulo RBAC (drawer "Ver permisos" + UI de
//     edición de overrides en D3).
//   - El shape de respuesta es propio del módulo de permisos y no calza
//     con el modelo `UserResponse` que usa el CRUD de usuarios.
//
// D1 → solo lectura. D3 → bulk replace de overrides (`updateOverrides`).

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

/**
 * Shape de `GET /users/:id/permissions`.
 * Contrato acordado con backend (Stream A):
 *  - `from_role`: codes del role del usuario (puede estar vacío para roles
 *    sin permisos asignados aún).
 *  - `grants` / `revokes`: overrides activos del usuario.
 *  - `effective`: resultado final aplicado por el backend
 *    `(from_role ∪ grants) − revokes`. No recalcular en el frontend para
 *    no divergir con la verdad de autorización.
 *
 * `user.is_main_admin` es opcional: el backend lo añade en Stream A para
 * que el frontend sepa cuándo bloquear acciones que dejarían al main_admin
 * sin perms. Si el campo no viene, el frontend lo trata como `false`.
 */
export interface UserPermissionsView {
  user: {
    id: number;
    email: string;
    role: { id: number; name: string };
    is_main_admin?: boolean;
  };
  from_role: string[];
  grants: string[];
  revokes: string[];
  effective: string[];
}

/** Item individual de `GET /users/:id/permissions/overrides`. */
export interface UserPermissionOverride {
  permission: {
    code: string;
    description: string | null;
    module: string;
  };
  effect: 'grant' | 'revoke';
  granted_by: { id: number; email: string } | null;
  granted_at: string; // ISO datetime
}

// ─── D3: overrides edit ─────────────────────────────────────────────────

/** Efecto explícito de un override (grant suma; revoke resta). */
export type OverrideEffect = 'grant' | 'revoke';

/** Entrada en el bulk-replace que va al PUT. */
export interface OverrideEntry {
  permission_code: string;
  effect: OverrideEffect;
}

/** Body de `PUT /users/:user_id/permissions/overrides`. */
export interface UpdateOverridesRequest {
  overrides: OverrideEntry[];
}

/**
 * Respuesta del PUT. Re-emite la lista canónica de overrides + la nueva
 * vista de permisos efectivos para que el frontend hidrate sin re-leer.
 */
export interface UserOverridesResponse {
  overrides: UserPermissionOverride[];
  permissions: UserPermissionsView;
}

@Injectable({ providedIn: 'root' })
export class UserPermissionsService {

  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/users`;

  /**
   * Vista agregada de permisos efectivos del usuario `userId`.
   * Devuelve el objeto tal cual lo entrega el backend — no transformar acá.
   */
  getEffectivePermissions(userId: number): Observable<UserPermissionsView> {
    return this.http.get<UserPermissionsView>(`${this.api}/${userId}/permissions`);
  }

  /**
   * Lista de overrides explícitos (grants / revokes) del usuario `userId`.
   * Incluye metadatos de auditoría (`granted_by`, `granted_at`) para tooltips.
   */
  getOverrides(userId: number): Observable<UserPermissionOverride[]> {
    return this.http.get<UserPermissionOverride[]>(`${this.api}/${userId}/permissions/overrides`);
  }

  /**
   * Reemplaza el set de overrides del usuario `userId` (bulk replace).
   *
   * Endpoint: `PUT /users/:user_id/permissions/overrides` con body
   * `{ overrides: [{permission_code, effect}, ...] }`. La respuesta
   * incluye la lista canónica de overrides ya guardada Y la vista
   * actualizada de permisos efectivos — el caller usa ambas para
   * hidratar el estado sin re-leer.
   *
   * Posibles errores manejados por el caller:
   *  - `403`: lockout (self / main_admin / admin colectivo).
   *  - `404`: code inexistente en catálogo.
   *  - `422`: validación (effect inválido, duplicados, revoke de perm que
   *    el rol no tiene).
   *
   * Clonamos `overrides` para evitar que mutaciones del caller en vuelo
   * cambien el body in-flight.
   */
  updateOverrides(
    userId: number,
    overrides: ReadonlyArray<OverrideEntry>,
  ): Observable<UserOverridesResponse> {
    const body: UpdateOverridesRequest = {
      overrides: overrides.map(o => ({
        permission_code: o.permission_code,
        effect: o.effect,
      })),
    };
    return this.http.put<UserOverridesResponse>(
      `${this.api}/${userId}/permissions/overrides`,
      body,
    );
  }
}
