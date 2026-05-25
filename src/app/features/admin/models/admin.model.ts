/**
 * Modelo TypeScript de RBAC admin (catálogo + asignaciones).
 *
 * Espejo del shape que el Stream A (`GET /roles`, `GET /roles/:id/permissions`,
 * `GET /permissions`) va a emitir. En D1 todo es read-only.
 *
 * Si en dev el backend aún no emite `description`, `is_system`, `permission_count`
 * o `user_count` (porque `RoleSchema` actual solo serializa `{id, name}`), el
 * servicio degrada grácilmente y la UI muestra "-" en los counts.
 */
import { ALL_PERMISSION_CODES } from '../../../core/constants/permissions';

export interface Permission {
  /** Code canónico (ej. "users.read_basic"). Coincide 1:1 con PERMS. */
  code: string;
  /** Descripción humana en español. */
  description: string;
  /**
   * Módulo lógico al que pertenece. Casi siempre `code.split('.')[0]`,
   * salvo casos como `users.read_permissions` que viven en `users`.
   */
  module: string;
  /**
   * True si el permiso está marcado como crítico por el backend (Stream A).
   * Los permisos críticos NO pueden ser removidos del rol admin desde la UI.
   * Si el backend aún no emite este campo (retro-compat), usar el helper
   * `isCriticalPermission` que cae al fallback hardcodeado.
   */
  is_critical?: boolean;
}

/**
 * Body del PUT `/roles/:id/permissions`. El backend acepta la lista
 * completa (set replace), no un diff — eso simplifica la idempotencia y
 * permite al backend computar internamente lo que cambió para auditar.
 */
export interface UpdateRolePermissionsRequest {
  permission_codes: string[];
}

/**
 * Diff calculado en el cliente entre `originalCodes` y `selectedCodes`
 * durante la edición de un rol. Se muestra en el modal de confirmación
 * antes de disparar el PUT.
 */
export interface RolePermissionsDiff {
  added: string[];
  removed: string[];
}

/**
 * Fallback hardcodeado de permisos críticos por si el backend aún no
 * envía el flag `is_critical`. Coincide con la definición autoritativa
 * del Stream A (5 permisos).
 *
 * Si Stream A llegara a cambiar el set, sincronizar este fallback Y la
 * lista en `app/shared/permissions/catalog.py`.
 */
export const CRITICAL_PERMS_FALLBACK: ReadonlySet<string> = new Set([
  'roles.read',
  'roles.manage',
  'users.manage',
  'users.manage_permissions',
  'users.read_permissions',
]);

/**
 * True si el permiso es crítico — respeta el flag del backend cuando
 * existe; cae al set hardcodeado para retro-compat en dev.
 */
export function isCriticalPermission(p: Permission): boolean {
  return p.is_critical ?? CRITICAL_PERMS_FALLBACK.has(p.code);
}

export interface RoleDetail {
  id: number;
  name: string;
  description?: string | null;
  /** True para los 4 roles de sistema. No editables vía UI. */
  is_system?: boolean;
  /** Número de permisos asignados al rol. */
  permission_count?: number;
  /** Número de usuarios activos con este rol. */
  user_count?: number;
}

/** Respuesta de `GET /roles/:id/permissions`. */
export interface RolePermissionsResponse {
  role: RoleDetail;
  permissions: Permission[];
}

/**
 * Configuración por módulo del catálogo: label legible y orden de presentación.
 * Manejado en el componente role-detail; se exporta aquí para tests.
 */
export interface ModuleConfig {
  /** Clave del módulo (ej. "users", "action_plans"). */
  key: string;
  /** Etiqueta legible en español. */
  label: string;
}

/**
 * Orden canónico de módulos en `role-detail`. Cada entrada incluye su label
 * en español. El módulo `users` agrupa también `users.read_permissions`.
 */
export const MODULE_ORDER: readonly ModuleConfig[] = Object.freeze([
  { key: 'users',            label: 'Usuarios' },
  { key: 'roles',            label: 'Roles' },
  { key: 'audit',            label: 'Auditoría' },
  { key: 'strategies',       label: 'Estrategias' },
  { key: 'components',       label: 'Componentes' },
  { key: 'strategy_metrics', label: 'Métricas de Estrategia' },
  { key: 'public_policies',  label: 'Políticas Públicas' },
  { key: 'datasets',         label: 'Bases de Datos' },
  { key: 'reports',          label: 'Reportes' },
  { key: 'action_plans',     label: 'Planes de Acción' },
]) as readonly ModuleConfig[];

/**
 * Total esperado de permisos del catálogo. Se usa como denominador en la UI
 * ("X / Y permisos asignados") cuando el backend aún no entrega contadores.
 *
 * Derivado de `ALL_PERMISSION_CODES.length` para que no quede desincronizado
 * cuando el catálogo crece (p. ej. `users.read_permissions` añadido en C7).
 */
export const TOTAL_PERMISSIONS = ALL_PERMISSION_CODES.length;
