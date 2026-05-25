// Tests de autorización por rol/permiso para ReportsListComponent.
// Se instancia el componente sin compilar template (evita Lucide), pero
// dentro de runInInjectionContext porque el componente tiene field
// initializers con inject() (DestroyRef, etc.).

import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { ReportsListComponent } from './reports-list';
import { PERMS, ROLE_IDS } from '../../../../core/constants/permissions';

// ─── Mocks ────────────────────────────────────────────────────────────────

function makePerms(set: string[] = []) {
  const s = new Set(set);
  return {
    snapshot: () => s,
    hasPermission: (c: string) => s.has(c),
    hasAny: (...cs: string[]) => cs.length === 0 || cs.some(c => s.has(c)),
    hasAll: (...cs: string[]) => cs.length === 0 || cs.every(c => s.has(c)),
    hasPermissionOrRole: (code: string, roleId: number | null, ...fallback: number[]) =>
      s.has(code) || (roleId != null && fallback.includes(roleId)),
    version: () => 0,
  } as any;
}

function makeAuth(roleId: number | null, user: any = { id: 42 }) {
  return {
    getTokenPayload: () => (roleId == null ? null : { role_id: roleId }),
    getUser: () => user,
  } as any;
}

function makeRouteStub() {
  return {
    queryParams: of({}),
    snapshot: { paramMap: { get: () => null } },
  } as any;
}

function makeRouterStub() {
  return { navigate: () => Promise.resolve(true) } as any;
}

function makeCdStub() {
  return { detectChanges: () => undefined } as any;
}

function makeToastStub() {
  return {
    confirm: () => Promise.resolve({ isConfirmed: false }),
    success: () => undefined,
    error: () => undefined,
  } as any;
}

function makeReportsServiceStub() {
  return {
    getAllForDashboard: () => of([]),
    delete: () => of(null),
  } as any;
}

function makeStrategiesServiceStub() {
  return { getSummary: () => of([]) } as any;
}

function makeComponentsServiceStub() {
  return { getSummary: () => of([]) } as any;
}

// Construye el componente con los mocks. Al estar `ngOnInit` controlado,
// los flags `isAdmin` / `isViewer` se recalculan llamando al hook.
function buildComponent(roleId: number | null, perms: string[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  const auth = makeAuth(roleId);
  const permission = makePerms(perms);

  const comp = TestBed.runInInjectionContext(() => new ReportsListComponent(
    makeReportsServiceStub(),
    makeStrategiesServiceStub(),
    makeComponentsServiceStub(),
    auth,
    permission,
    makeToastStub(),
    makeCdStub(),
    makeRouteStub(),
    makeRouterStub(),
  ));
  return { comp, auth, permission };
}

// ─── Matriz por rol (paridad pre/post migración) ──────────────────────────

describe('ReportsListComponent - isAdmin / isViewer (matriz por rol)', () => {

  it('admin (roleId=3, perms vacíos) → isAdmin=true, isViewer=false', () => {
    const { comp } = buildComponent(ROLE_IDS.ADMIN, []);
    comp.ngOnInit();
    expect(comp.isAdmin).toBe(true);
    expect(comp.isViewer).toBe(false);
  });

  it('editor (roleId=2, perms vacíos) → isAdmin=false, isViewer=false', () => {
    const { comp } = buildComponent(ROLE_IDS.EDITOR, []);
    comp.ngOnInit();
    expect(comp.isAdmin).toBe(false);
    expect(comp.isViewer).toBe(false);
  });

  it('monitor (roleId=4, perms vacíos) → isAdmin=false, isViewer=false', () => {
    const { comp } = buildComponent(ROLE_IDS.MONITOR, []);
    comp.ngOnInit();
    expect(comp.isAdmin).toBe(false);
    expect(comp.isViewer).toBe(false);
  });

  it('viewer (roleId=1, perms vacíos) → isAdmin=false, isViewer=true', () => {
    const { comp } = buildComponent(ROLE_IDS.VIEWER, []);
    comp.ngOnInit();
    expect(comp.isAdmin).toBe(false);
    expect(comp.isViewer).toBe(true);
  });

});

// ─── Dual mode: permisos rescatan roles desconocidos ───────────────────────

describe('ReportsListComponent - dual mode (perm rescata)', () => {

  it('roleId=99 (desconocido) + PERMS.REPORTS_UPDATE_ANY en el set → isAdmin=true', () => {
    const { comp } = buildComponent(99, [PERMS.REPORTS_UPDATE_ANY]);
    comp.ngOnInit();
    expect(comp.isAdmin).toBe(true);
  });

  it('roleId=99 (desconocido) + PERMS.REPORTS_CREATE en el set → isViewer=false', () => {
    const { comp } = buildComponent(99, [PERMS.REPORTS_CREATE]);
    comp.ngOnInit();
    expect(comp.isViewer).toBe(false);
  });

  it('roleId=99 (desconocido) sin perms relevantes → isAdmin=false, isViewer=true', () => {
    const { comp } = buildComponent(99, []);
    comp.ngOnInit();
    expect(comp.isAdmin).toBe(false);
    expect(comp.isViewer).toBe(true);
  });

});
