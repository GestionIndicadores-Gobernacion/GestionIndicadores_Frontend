/**
 * Parser defensivo del campo `detail` de los AuditLog.
 *
 * Hoy reconoce dos formas estructuradas:
 *
 *   1) Stream A (D2) — `entity === 'role_permissions'`:
 *      {
 *        "role": { "id": 3, "name": "admin" },
 *        "added": ["users.read_permissions"],
 *        "removed": ["reports.delete_any"],
 *        "before_count": 30,
 *        "after_count": 30,
 *        "shadow_mode_active": true
 *      }
 *
 *   2) Stream A (D3) — `entity === 'user_permission_overrides'`:
 *      {
 *        "target_user": { "id": 5, "email": "editor@gobernacion.gov.co" },
 *        "added":   [{ "permission_code": "audit.read",       "effect": "grant"  }],
 *        "removed": [{ "permission_code": "reports.create",   "effect": "revoke" }],
 *        "changed": [{ "permission_code": "users.read",       "from": "grant", "to": "revoke" }],
 *        "shadow_mode_active": true
 *      }
 *
 * Para todo lo demás (o cuando el JSON viene corrupto/incompatible),
 * el parser devuelve `null` y el componente cae al render genérico.
 *
 * Reglas duras:
 *  - NUNCA lanza una excepción. Cualquier `JSON.parse` está envuelto en try/catch.
 *  - NUNCA escribe a la consola (ni siquiera `console.error`): el detail
 *    inválido no debe ensuciar el log del navegador.
 *  - Es una pure function: misma entrada, misma salida.
 */

export interface AuditDetailRolePermissions {
  role: { id: number; name: string };
  added: string[];
  removed: string[];
  before_count: number;
  after_count: number;
  shadow_mode_active: boolean;
}

/** Effect que el override aplica sobre un permiso del usuario. */
export type OverrideEffect = 'grant' | 'revoke';

export interface UserOverrideItem {
  permission_code: string;
  effect: OverrideEffect;
}

export interface UserOverrideChange {
  permission_code: string;
  from: OverrideEffect;
  to: OverrideEffect;
}

export interface AuditDetailUserOverrides {
  target_user: { id: number; email: string };
  added: UserOverrideItem[];
  removed: UserOverrideItem[];
  changed: UserOverrideChange[];
  shadow_mode_active: boolean;
}

/**
 * Intenta parsear el detail como un cambio de permisos por rol.
 *
 * @param entity   El campo `entity` del AuditLog. Solo procesa cuando vale `'role_permissions'`.
 * @param detailRaw El campo `detail` (string JSON) o null.
 * @returns El detalle tipado, o `null` si no aplica / no parsea / no tiene la shape esperada.
 */
export function parseAuditDetail(
  entity: string | null | undefined,
  detailRaw: string | null | undefined,
): AuditDetailRolePermissions | null {
  if (entity !== 'role_permissions') return null;
  const raw = safeJsonParseObject(detailRaw);
  if (raw === null) return null;

  // role: { id: number, name: string }
  const role = raw['role'];
  if (!isObject(role)) return null;
  const roleId = role['id'];
  const roleName = role['name'];
  if (typeof roleId !== 'number' || !Number.isFinite(roleId)) return null;
  if (typeof roleName !== 'string' || roleName.length === 0) return null;

  // added / removed: arrays de strings (los items no-string se descartan).
  const added = toStringArray(raw['added']);
  const removed = toStringArray(raw['removed']);
  if (added === null || removed === null) return null;

  // before_count / after_count: enteros >= 0.
  const before = raw['before_count'];
  const after = raw['after_count'];
  if (!isNonNegInt(before) || !isNonNegInt(after)) return null;

  // shadow_mode_active: bool. Cualquier otro valor → false (defensivo).
  const shadow = raw['shadow_mode_active'] === true;

  return {
    role: { id: roleId, name: roleName },
    added,
    removed,
    before_count: before,
    after_count: after,
    shadow_mode_active: shadow,
  };
}

/**
 * Intenta parsear el detail como un cambio de overrides por usuario (Stream A — D3).
 *
 * @param entity   El campo `entity` del AuditLog. Solo procesa cuando vale `'user_permission_overrides'`.
 * @param detailRaw El campo `detail` (string JSON) o null.
 * @returns El detalle tipado, o `null` si no aplica / no parsea / no tiene la shape esperada.
 */
export function parseUserOverridesAuditDetail(
  entity: string | null | undefined,
  detailRaw: unknown,
): AuditDetailUserOverrides | null {
  if (entity !== 'user_permission_overrides') return null;
  if (typeof detailRaw !== 'string') return null;
  const raw = safeJsonParseObject(detailRaw);
  if (raw === null) return null;

  // target_user: { id: number, email: string }
  const targetUser = raw['target_user'];
  if (!isObject(targetUser)) return null;
  const userId = targetUser['id'];
  const userEmail = targetUser['email'];
  if (typeof userId !== 'number' || !Number.isFinite(userId)) return null;
  if (typeof userEmail !== 'string' || userEmail.length === 0) return null;

  // added / removed / changed: deben ser arrays. Items malformados se descartan.
  const addedRaw = raw['added'];
  const removedRaw = raw['removed'];
  const changedRaw = raw['changed'];
  if (!Array.isArray(addedRaw) || !Array.isArray(removedRaw) || !Array.isArray(changedRaw)) {
    return null;
  }

  const added = toOverrideItems(addedRaw);
  const removed = toOverrideItems(removedRaw);
  const changed = toOverrideChanges(changedRaw);

  // shadow_mode_active: bool. Cualquier otro valor → false (defensivo).
  const shadow = raw['shadow_mode_active'] === true;

  return {
    target_user: { id: userId, email: userEmail },
    added,
    removed,
    changed,
    shadow_mode_active: shadow,
  };
}

// ─── Helpers privados ────────────────────────────────────────────────────────

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isNonNegInt(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0;
}

function isEffect(x: unknown): x is OverrideEffect {
  return x === 'grant' || x === 'revoke';
}

/**
 * Convierte un valor desconocido en `string[]`, descartando elementos no-string.
 * Devuelve `null` si la entrada no es un array.
 */
function toStringArray(x: unknown): string[] | null {
  if (!Array.isArray(x)) return null;
  return x.filter((v): v is string => typeof v === 'string');
}

/**
 * Filtra/tipa una lista de items `{ permission_code, effect }`.
 * Items malformados (no-objeto, code no-string, effect inválido) se descartan.
 */
function toOverrideItems(arr: unknown[]): UserOverrideItem[] {
  const out: UserOverrideItem[] = [];
  for (const item of arr) {
    if (!isObject(item)) continue;
    const code = item['permission_code'];
    const effect = item['effect'];
    if (typeof code !== 'string' || code.length === 0) continue;
    if (!isEffect(effect)) continue;
    out.push({ permission_code: code, effect });
  }
  return out;
}

/**
 * Filtra/tipa una lista de items `{ permission_code, from, to }`.
 * Items malformados se descartan silenciosamente.
 */
function toOverrideChanges(arr: unknown[]): UserOverrideChange[] {
  const out: UserOverrideChange[] = [];
  for (const item of arr) {
    if (!isObject(item)) continue;
    const code = item['permission_code'];
    const from = item['from'];
    const to = item['to'];
    if (typeof code !== 'string' || code.length === 0) continue;
    if (!isEffect(from) || !isEffect(to)) continue;
    out.push({ permission_code: code, from, to });
  }
  return out;
}

/**
 * Parsea un string como JSON y devuelve el objeto plano resultante.
 * Devuelve `null` para cualquier input que no sea un string parseable
 * que produzca un objeto (no array, no primitivo, no null).
 */
function safeJsonParseObject(detailRaw: unknown): Record<string, unknown> | null {
  if (typeof detailRaw !== 'string' || detailRaw.trim().length === 0) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(detailRaw);
  } catch {
    return null;
  }
  return isObject(raw) ? raw : null;
}
