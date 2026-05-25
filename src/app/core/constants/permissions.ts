/**
 * Catálogo TypeScript de permisos RBAC — espejo 1:1 de
 * `app/shared/permissions/catalog.py` en el backend.
 *
 * Contrato:
 *  - Cualquier permiso nuevo debe agregarse aquí Y en el catálogo Python.
 *  - Los `code` (strings) son el contrato real: deben coincidir exactamente
 *    (case-sensitive) con los del backend. Cambiarlos rompe JWTs vigentes,
 *    auditoría y la UI admin.
 *  - El test de paridad (futuro) compara `ALL_PERMISSION_CODES` contra
 *    la respuesta de `GET /permissions` para fallar ruidoso si divergen.
 *
 * Convenciones:
 *  - Importar siempre desde aquí (`PERMS.REPORTS_CREATE`), nunca literales.
 *  - Para checks de "es admin/viewer" durante la transición, usar
 *    `ROLE_IDS.ADMIN`, etc. — convive con los permisos hasta C7.
 */

export const PERMS = {
  // users
  USERS_READ_BASIC:           'users.read_basic',
  USERS_READ:                 'users.read',
  USERS_MANAGE:               'users.manage',
  USERS_ASSIGN_COMPONENTS:    'users.assign_components',
  USERS_MANAGE_PERMISSIONS:   'users.manage_permissions',

  // roles
  ROLES_READ:                 'roles.read',
  ROLES_MANAGE:               'roles.manage',

  // audit
  AUDIT_READ:                 'audit.read',

  // strategies / components / metrics / public_policies
  STRATEGIES_MANAGE:          'strategies.manage',
  COMPONENTS_MANAGE:          'components.manage',
  STRATEGY_METRICS_MANAGE:    'strategy_metrics.manage',
  PUBLIC_POLICIES_MANAGE:     'public_policies.manage',

  // datasets
  DATASETS_READ:              'datasets.read',
  DATASETS_MANAGE:            'datasets.manage',
  DATASETS_IMPORT:            'datasets.import',

  // reports
  REPORTS_CREATE:             'reports.create',
  REPORTS_READ:               'reports.read',
  REPORTS_UPDATE_OWN:         'reports.update_own',
  REPORTS_UPDATE_ANY:         'reports.update_any',
  REPORTS_DELETE_OWN:         'reports.delete_own',
  REPORTS_DELETE_ANY:         'reports.delete_any',

  // action_plans
  ACTION_PLANS_CREATE:            'action_plans.create',
  ACTION_PLANS_READ:              'action_plans.read',
  ACTION_PLANS_UPDATE_OWN:        'action_plans.update_own',
  ACTION_PLANS_UPDATE_ANY:        'action_plans.update_any',
  ACTION_PLANS_DELETE_OWN:        'action_plans.delete_own',
  ACTION_PLANS_DELETE_ANY:        'action_plans.delete_any',
  ACTION_PLANS_REPORT_ACTIVITY:   'action_plans.report_activity',
  ACTION_PLANS_ADD_EVIDENCE:      'action_plans.add_evidence',
  ACTION_PLANS_DASHBOARD:         'action_plans.dashboard',
} as const;

export type PermCode = typeof PERMS[keyof typeof PERMS];

/** Tupla congelada con todos los codes — útil para tests de paridad. */
export const ALL_PERMISSION_CODES: readonly PermCode[] =
  Object.freeze(Object.values(PERMS)) as readonly PermCode[];

/**
 * IDs canónicos de los 4 roles del sistema. Convive con los permisos
 * hasta que la migración de Fase C esté completa (C7).
 *
 * Mantener sincronizados con `flask seed` (roles `id` autoincrementales
 * por orden de creación). Si el orden de seed cambia, romper este mapa.
 */
export const ROLE_IDS = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  MONITOR: 4,
} as const;

export type RoleId = typeof ROLE_IDS[keyof typeof ROLE_IDS];
