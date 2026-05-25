import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Route, Router } from '@angular/router';

import { REPORTS_ROUTES } from './reports.routes';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ROLE_IDS } from '../../../core/constants/permissions';

// Localiza una ruta de primer nivel por su `path`.
function findRoute(path: string): Route | undefined {
  return REPORTS_ROUTES.find(r => r.path === path);
}

function makeAuth(roleId: number | null) {
  return {
    isAuthenticated: () => true,
    handleExpiredSession: vi.fn(),
    getTokenPayload: () => roleId == null ? null : { role_id: roleId },
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

function getCanActivate(route: Route | undefined): CanActivateFn {
  expect(route, 'route not found in REPORTS_ROUTES').toBeDefined();
  expect(route!.canActivate, 'route has no canActivate').toBeDefined();
  expect(route!.canActivate!.length).toBeGreaterThan(0);
  return route!.canActivate![0] as CanActivateFn;
}

describe('REPORTS_ROUTES — migración adminGuard → permGuard', () => {

  describe('estructura', () => {
    it('strategies está definida como ruta de primer nivel con canActivate', () => {
      const r = findRoute('strategies');
      expect(r).toBeDefined();
      expect(r!.canActivate).toBeDefined();
      expect(r!.canActivate!.length).toBe(1);
    });

    it('components está definida como ruta de primer nivel con canActivate', () => {
      const r = findRoute('components');
      expect(r).toBeDefined();
      expect(r!.canActivate).toBeDefined();
      expect(r!.canActivate!.length).toBe(1);
    });
  });

  describe('/reports/strategies — paridad por rol', () => {
    const guard = () => getCanActivate(findRoute('strategies'));

    const cases: Array<[string, number, boolean]> = [
      ['admin',   ROLE_IDS.ADMIN,   true],
      ['editor',  ROLE_IDS.EDITOR,  false],
      ['monitor', ROLE_IDS.MONITOR, false],
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
  });

  describe('/reports/components — paridad por rol', () => {
    const guard = () => getCanActivate(findRoute('components'));

    const cases: Array<[string, number, boolean]> = [
      ['admin',   ROLE_IDS.ADMIN,   true],
      ['editor',  ROLE_IDS.EDITOR,  false],
      ['monitor', ROLE_IDS.MONITOR, false],
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
  });
});
