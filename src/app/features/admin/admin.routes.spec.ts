import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Route, Router } from '@angular/router';

import { ADMIN_ROUTES } from './admin.routes';
import { routes as APP_ROUTES } from '../../app.routes';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { ROLE_IDS } from '../../core/constants/permissions';

// ─── Helpers ──────────────────────────────────────────────────────

function findAdminGuard(): CanActivateFn {
  // El guard de admin está aplicado en app.routes.ts, en la entrada
  // del layout privado bajo el path 'admin'.
  const dashRoute = APP_ROUTES.find(r => r.path === '');
  expect(dashRoute, 'root dashboard route not found').toBeDefined();

  const adminEntry = (dashRoute!.children ?? []).find(r => r.path === 'admin');
  expect(adminEntry, 'admin route not found in app.routes').toBeDefined();
  expect(adminEntry!.canActivate, 'admin route has no canActivate').toBeDefined();
  expect(adminEntry!.canActivate!.length).toBeGreaterThan(0);

  return adminEntry!.canActivate![0] as CanActivateFn;
}

function makeAuth(roleId: number | null) {
  return {
    isAuthenticated: () => true,
    handleExpiredSession: vi.fn(),
    getTokenPayload: () => (roleId == null ? null : { role_id: roleId }),
  } as any;
}

function makePerms() {
  return {
    hasAny: () => false,
    hasAll: () => false,
    hasPermissionOrRole: (_c: string, roleId: number | null, ...fb: number[]) =>
      roleId != null && fb.includes(roleId),
  } as any;
}

function makeRouter() {
  return { navigate: vi.fn() } as any;
}

function runGuard(guard: CanActivateFn, providers: any[]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers });
  return TestBed.runInInjectionContext(() => guard({} as any, {} as any));
}

// ─── Estructura de ADMIN_ROUTES ───────────────────────────────────

describe('ADMIN_ROUTES — estructura', () => {
  it('expone 3 rutas: "" (redirect), "roles", "roles/:id"', () => {
    const paths = ADMIN_ROUTES.map(r => r.path);
    expect(paths.sort()).toEqual(['', 'roles', 'roles/:id']);
  });

  it('la ruta "" redirige a "roles"', () => {
    const root = ADMIN_ROUTES.find(r => r.path === '') as Route;
    expect(root).toBeDefined();
    expect(root.redirectTo).toBe('roles');
    expect(root.pathMatch).toBe('full');
  });

  it('"roles" usa loadComponent', () => {
    const r = ADMIN_ROUTES.find(r => r.path === 'roles') as Route;
    expect(r).toBeDefined();
    expect(typeof r.loadComponent).toBe('function');
  });

  it('"roles/:id" usa loadComponent', () => {
    const r = ADMIN_ROUTES.find(r => r.path === 'roles/:id') as Route;
    expect(r).toBeDefined();
    expect(typeof r.loadComponent).toBe('function');
  });
});

// ─── Guard de /admin en app.routes.ts ─────────────────────────────

describe('/admin — paridad por rol (shadow mode: admin + monitor permitidos)', () => {
  const guard = () => findAdminGuard();

  const cases: Array<[string, number, boolean]> = [
    ['admin',   ROLE_IDS.ADMIN,   true],
    ['monitor', ROLE_IDS.MONITOR, true],
    ['editor',  ROLE_IDS.EDITOR,  false],
    ['viewer',  ROLE_IDS.VIEWER,  false],
  ];

  for (const [name, roleId, expected] of cases) {
    it(`${name} → ${expected}`, () => {
      const auth = makeAuth(roleId);
      const router = makeRouter();
      const perms = makePerms();

      const result = runGuard(guard(), [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: perms },
      ]);

      expect(result).toBe(expected);
      if (!expected) {
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      } else {
        expect(router.navigate).not.toHaveBeenCalled();
      }
    });
  }

  it('usuario sin rol (null) → false y redirige a /dashboard', () => {
    const auth = makeAuth(null);
    const router = makeRouter();
    const perms = makePerms();

    const result = runGuard(guard(), [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
      { provide: PermissionService, useValue: perms },
    ]);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
