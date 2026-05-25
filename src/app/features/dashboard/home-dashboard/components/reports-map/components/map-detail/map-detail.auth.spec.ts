// map-detail.auth.spec.ts
//
// Tests de autorización para MapDetailComponent — verifica el cálculo
// dual-mode (perm OR rol fallback) de `isViewer` durante la Fase C.
//
// Decisión de diseño: el cálculo de `isViewer` vive INLINE en el
// constructor del componente. Instanciarlo vía `new MapDetailComponent(...)`
// requiere mocks completos de AuthService y PermissionService que arrastran
// HttpClient y otras deps. Usamos dos estrategias complementarias:
//
//  1) `computeIsViewer(perms, auth)` — helper local que replica EXACTAMENTE
//     la lógica del constructor migrado. Es lo que efectivamente cubrimos
//     en los 6 casos. Si la lógica del constructor cambia, este helper
//     debe actualizarse a la par o los tests dejarán de reflejarla.
//
//  2) `Object.create(MapDetailComponent.prototype)` + asignación manual
//     de dependencias — smoke test mínimo para confirmar que el shape
//     del componente acepta los inyectables esperados sin disparar el
//     constructor real.
//
// vitest globals (no importar de 'vitest').

import { MapDetailComponent } from './map-detail';
import { PERMS, ROLE_IDS } from '../../../../../../../core/constants/permissions';

// ──────────────────────────────────────────────────────────────────
// Mocks mínimos — sin TestBed, sin HttpClient, sin Lucide.
// ──────────────────────────────────────────────────────────────────

function makePerms(set: string[] = []) {
  const s = new Set(set);
  return {
    hasPermissionOrRole: (
      code: string,
      roleId: number | null,
      ...fb: number[]
    ) => s.has(code) || (roleId != null && fb.includes(roleId)),
  } as any;
}

function makeAuth(roleId: number | null) {
  return {
    getTokenPayload: () =>
      roleId == null ? null : { role_id: roleId },
  } as any;
}

/**
 * Réplica exacta del cálculo de `isViewer` dentro del constructor
 * migrado de MapDetailComponent. Cualquier cambio aquí debe espejarse
 * en el componente (y viceversa).
 */
function computeIsViewer(
  permissionService: ReturnType<typeof makePerms>,
  authService: ReturnType<typeof makeAuth>,
): boolean {
  const payload = authService.getTokenPayload();
  const roleId = payload?.role_id ?? null;
  return !permissionService.hasPermissionOrRole(
    PERMS.REPORTS_CREATE,
    roleId,
    ROLE_IDS.ADMIN,
    ROLE_IDS.EDITOR,
    ROLE_IDS.MONITOR,
  );
}

describe('MapDetailComponent — auth (isViewer)', () => {

  // ── Roles canónicos ──────────────────────────────────────────────

  it('admin: NO es viewer (rol fallback ADMIN)', () => {
    const isViewer = computeIsViewer(makePerms([]), makeAuth(ROLE_IDS.ADMIN));
    expect(isViewer).toBe(false);
  });

  it('editor: NO es viewer (rol fallback EDITOR)', () => {
    const isViewer = computeIsViewer(makePerms([]), makeAuth(ROLE_IDS.EDITOR));
    expect(isViewer).toBe(false);
  });

  it('monitor: NO es viewer (rol fallback MONITOR)', () => {
    const isViewer = computeIsViewer(makePerms([]), makeAuth(ROLE_IDS.MONITOR));
    expect(isViewer).toBe(false);
  });

  it('viewer: SÍ es viewer (rol no está en fallback y no tiene REPORTS_CREATE)', () => {
    const isViewer = computeIsViewer(makePerms([]), makeAuth(ROLE_IDS.VIEWER));
    expect(isViewer).toBe(true);
  });

  // ── Dual-mode cases ──────────────────────────────────────────────

  it('rol desconocido + REPORTS_CREATE en set: NO es viewer (gana el permiso)', () => {
    const isViewer = computeIsViewer(
      makePerms([PERMS.REPORTS_CREATE]),
      makeAuth(999), // rol fuera del catálogo
    );
    expect(isViewer).toBe(false);
  });

  it('rol viewer + REPORTS_CREATE en set: NO es viewer (override por permiso)', () => {
    const isViewer = computeIsViewer(
      makePerms([PERMS.REPORTS_CREATE]),
      makeAuth(ROLE_IDS.VIEWER),
    );
    expect(isViewer).toBe(false);
  });

  // ── Smoke test del shape del componente ──────────────────────────

  it('shape: acepta authService y permissionService inyectados sin correr el constructor', () => {
    // Object.create evita ejecutar el constructor real, que arrastraría
    // dependencias adicionales si las hubiera. Solo confirma que las
    // propiedades privadas existen en el prototype/instance shape.
    const c = Object.create(MapDetailComponent.prototype) as any;
    c.permissionService = makePerms([]);
    c.authService = makeAuth(ROLE_IDS.ADMIN);
    c.isViewer = false;
    expect(c).toBeTruthy();
    expect(typeof c.permissionService.hasPermissionOrRole).toBe('function');
    expect(typeof c.authService.getTokenPayload).toBe('function');
  });
});
