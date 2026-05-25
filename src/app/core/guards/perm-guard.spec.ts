import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { permGuard } from './perm-guard';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { PERMS, ROLE_IDS } from '../constants/permissions';

function makeAuthMock(opts: { authed?: boolean; roleId?: number | null } = {}) {
  return {
    isAuthenticated: () => opts.authed ?? true,
    handleExpiredSession: vi.fn(),
    getTokenPayload: () => opts.roleId == null ? null : { role_id: opts.roleId },
  } as any;
}

function makePermsMock(set: string[] = []) {
  const s = new Set(set);
  return {
    hasAny: (...cs: string[]) => cs.length === 0 || cs.some(c => s.has(c)),
    hasAll: (...cs: string[]) => cs.length === 0 || cs.every(c => s.has(c)),
    hasPermissionOrRole: (code: string, roleId: number | null, ...fb: number[]) =>
      s.has(code) || (roleId != null && fb.includes(roleId)),
  } as any;
}

function makeRouter() {
  return { navigate: vi.fn() } as any;
}

function runGuard(guard: ReturnType<typeof permGuard>, providers: any[]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers });
  return TestBed.runInInjectionContext(() => guard({} as any, {} as any));
}

describe('permGuard', () => {

  describe('auth gate', () => {
    it('si no autenticado retorna false y dispara handleExpiredSession("expired")', () => {
      const auth = makeAuthMock({ authed: false });
      const router = makeRouter();
      const perms = makePermsMock([]);
      const guard = permGuard({ perms: [PERMS.USERS_MANAGE] });

      const result = runGuard(guard, [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: perms },
      ]);

      expect(result).toBe(false);
      expect(auth.handleExpiredSession).toHaveBeenCalledWith('expired');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('rescate por rol (modo dual)', () => {
    it('admin sin perm pero con fallbackRoles=[ADMIN] pasa', () => {
      const auth = makeAuthMock({ roleId: ROLE_IDS.ADMIN });
      const router = makeRouter();
      const perms = makePermsMock([]);
      const guard = permGuard({
        perms: [PERMS.USERS_MANAGE],
        fallbackRoles: [ROLE_IDS.ADMIN],
      });

      const result = runGuard(guard, [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: perms },
      ]);

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('bloqueo por rol no autorizado', () => {
    it('editor sin perm y sin estar en fallback es bloqueado y redirigido a /dashboard', () => {
      const auth = makeAuthMock({ roleId: ROLE_IDS.EDITOR });
      const router = makeRouter();
      const perms = makePermsMock([]);
      const guard = permGuard({
        perms: [PERMS.USERS_MANAGE],
        fallbackRoles: [ROLE_IDS.ADMIN],
      });

      const result = runGuard(guard, [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: perms },
      ]);

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('rescate por permiso', () => {
    it('editor con USERS_MANAGE en su set pasa aunque no esté en fallback', () => {
      const auth = makeAuthMock({ roleId: ROLE_IDS.EDITOR });
      const router = makeRouter();
      const perms = makePermsMock([PERMS.USERS_MANAGE]);
      const guard = permGuard({
        perms: [PERMS.USERS_MANAGE],
        fallbackRoles: [ROLE_IDS.ADMIN],
      });

      const result = runGuard(guard, [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: perms },
      ]);

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('mode: "all"', () => {
    it('falla cuando solo tiene parte del set y rol no autorizado', () => {
      const auth = makeAuthMock({ roleId: ROLE_IDS.EDITOR });
      const router = makeRouter();
      const perms = makePermsMock([PERMS.DATASETS_MANAGE]);
      const guard = permGuard({
        perms: [PERMS.DATASETS_MANAGE, PERMS.AUDIT_READ],
        mode: 'all',
        fallbackRoles: [ROLE_IDS.ADMIN],
      });

      const result = runGuard(guard, [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: perms },
      ]);

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('pasa cuando todos los perms del set están presentes', () => {
      const auth = makeAuthMock({ roleId: ROLE_IDS.EDITOR });
      const router = makeRouter();
      const perms = makePermsMock([PERMS.DATASETS_MANAGE, PERMS.AUDIT_READ]);
      const guard = permGuard({
        perms: [PERMS.DATASETS_MANAGE, PERMS.AUDIT_READ],
        mode: 'all',
        fallbackRoles: [ROLE_IDS.ADMIN],
      });

      const result = runGuard(guard, [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: perms },
      ]);

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('redirectTo custom', () => {
    it('cuando no autorizado, redirige a la ruta indicada', () => {
      const auth = makeAuthMock({ roleId: ROLE_IDS.VIEWER });
      const router = makeRouter();
      const perms = makePermsMock([]);
      const guard = permGuard({
        perms: [PERMS.USERS_MANAGE],
        fallbackRoles: [ROLE_IDS.ADMIN],
        redirectTo: '/custom',
      });

      const result = runGuard(guard, [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PermissionService, useValue: perms },
      ]);

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/custom']);
    });
  });

  describe('rutas críticas reales — smoke tests por rol', () => {

    describe('/users — perms=[USERS_MANAGE], fallback=[ADMIN]', () => {
      const opts = { perms: [PERMS.USERS_MANAGE], fallbackRoles: [ROLE_IDS.ADMIN] } as const;

      it('admin pasa', () => {
        const auth = makeAuthMock({ roleId: ROLE_IDS.ADMIN });
        const router = makeRouter();
        const perms = makePermsMock([]);
        const result = runGuard(permGuard(opts), [
          { provide: AuthService, useValue: auth },
          { provide: Router, useValue: router },
          { provide: PermissionService, useValue: perms },
        ]);
        expect(result).toBe(true);
      });

      it('editor sin perm es bloqueado', () => {
        const auth = makeAuthMock({ roleId: ROLE_IDS.EDITOR });
        const router = makeRouter();
        const perms = makePermsMock([]);
        const result = runGuard(permGuard(opts), [
          { provide: AuthService, useValue: auth },
          { provide: Router, useValue: router },
          { provide: PermissionService, useValue: perms },
        ]);
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      });
    });

    describe('/datasets — perms=[DATASETS_MANAGE], fallback=[ADMIN]', () => {
      const opts = { perms: [PERMS.DATASETS_MANAGE], fallbackRoles: [ROLE_IDS.ADMIN] } as const;

      it('admin pasa', () => {
        const auth = makeAuthMock({ roleId: ROLE_IDS.ADMIN });
        const router = makeRouter();
        const perms = makePermsMock([]);
        const result = runGuard(permGuard(opts), [
          { provide: AuthService, useValue: auth },
          { provide: Router, useValue: router },
          { provide: PermissionService, useValue: perms },
        ]);
        expect(result).toBe(true);
      });

      it('monitor sin DATASETS_MANAGE es bloqueado', () => {
        const auth = makeAuthMock({ roleId: ROLE_IDS.MONITOR });
        const router = makeRouter();
        const perms = makePermsMock([]);
        const result = runGuard(permGuard(opts), [
          { provide: AuthService, useValue: auth },
          { provide: Router, useValue: router },
          { provide: PermissionService, useValue: perms },
        ]);
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      });
    });

    describe('/audit-history — perms=[AUDIT_READ], fallback=[ADMIN]', () => {
      const opts = { perms: [PERMS.AUDIT_READ], fallbackRoles: [ROLE_IDS.ADMIN] } as const;

      it('admin pasa', () => {
        const auth = makeAuthMock({ roleId: ROLE_IDS.ADMIN });
        const router = makeRouter();
        const perms = makePermsMock([]);
        const result = runGuard(permGuard(opts), [
          { provide: AuthService, useValue: auth },
          { provide: Router, useValue: router },
          { provide: PermissionService, useValue: perms },
        ]);
        expect(result).toBe(true);
      });

      it('monitor sin AUDIT_READ es bloqueado', () => {
        const auth = makeAuthMock({ roleId: ROLE_IDS.MONITOR });
        const router = makeRouter();
        const perms = makePermsMock([]);
        const result = runGuard(permGuard(opts), [
          { provide: AuthService, useValue: auth },
          { provide: Router, useValue: router },
          { provide: PermissionService, useValue: perms },
        ]);
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      });
    });
  });
});
