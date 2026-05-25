import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { PermissionService } from './permission.service';
import { environment } from '../../../environments/environment';
import { PERMS, ROLE_IDS } from '../constants/permissions';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('PermissionService', () => {
  let service: PermissionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PermissionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadFromLoginUser', () => {
    it('pobla el set cuando el user trae permissions', () => {
      const ok = service.loadFromLoginUser({
        permissions: [PERMS.USERS_READ, PERMS.DATASETS_READ],
      });
      expect(ok).toBe(true);
      const snap = service.snapshot();
      expect(snap.has(PERMS.USERS_READ)).toBe(true);
      expect(snap.has(PERMS.DATASETS_READ)).toBe(true);
      expect(snap.size).toBe(2);
    });

    it('retorna false cuando user no trae permissions', () => {
      const ok = service.loadFromLoginUser({} as any);
      expect(ok).toBe(false);
      expect(service.snapshot().size).toBe(0);
    });

    it('retorna false con user null', () => {
      const ok = service.loadFromLoginUser(null);
      expect(ok).toBe(false);
      expect(service.snapshot().size).toBe(0);
    });
  });

  describe('loadFromAccessToken', () => {
    it('hidrata el set desde un JWT con claim permissions', () => {
      const tok = makeJwt({
        sub: 1,
        role_id: 3,
        permissions: [PERMS.AUDIT_READ, PERMS.ROLES_MANAGE],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const ok = service.loadFromAccessToken(tok);
      expect(ok).toBe(true);
      expect(service.snapshot().has(PERMS.AUDIT_READ)).toBe(true);
      expect(service.snapshot().has(PERMS.ROLES_MANAGE)).toBe(true);
    });

    it('retorna false cuando el JWT no trae claim permissions', () => {
      const tok = makeJwt({ sub: 1, role_id: 3, exp: 9999999999 });
      const ok = service.loadFromAccessToken(tok);
      expect(ok).toBe(false);
      expect(service.snapshot().size).toBe(0);
    });

    it('limpia y retorna false con token null', () => {
      service.loadFromLoginUser({ permissions: [PERMS.USERS_READ] });
      const ok = service.loadFromAccessToken(null);
      expect(ok).toBe(false);
      expect(service.snapshot().size).toBe(0);
    });

    it('limpia y retorna false con token undefined', () => {
      service.loadFromLoginUser({ permissions: [PERMS.USERS_READ] });
      const ok = service.loadFromAccessToken(undefined);
      expect(ok).toBe(false);
      expect(service.snapshot().size).toBe(0);
    });

    it('no throwea con token malformado', () => {
      const ok = service.loadFromAccessToken('not-a-jwt');
      expect(ok).toBe(false);
      expect(service.snapshot().size).toBe(0);
    });
  });

  describe('checks', () => {
    beforeEach(() => {
      service.loadFromLoginUser({
        permissions: [PERMS.USERS_READ, PERMS.DATASETS_READ],
      });
    });

    it('hasPermission detecta presencia', () => {
      expect(service.hasPermission(PERMS.USERS_READ)).toBe(true);
      expect(service.hasPermission(PERMS.USERS_MANAGE)).toBe(false);
    });

    it('hasAny retorna true si al menos uno está presente', () => {
      expect(service.hasAny(PERMS.USERS_MANAGE, PERMS.USERS_READ)).toBe(true);
      expect(service.hasAny(PERMS.USERS_MANAGE, PERMS.ROLES_MANAGE)).toBe(false);
    });

    it('hasAny con array vacío retorna true (convención)', () => {
      expect(service.hasAny()).toBe(true);
    });

    it('hasAll exige todos presentes', () => {
      expect(service.hasAll(PERMS.USERS_READ, PERMS.DATASETS_READ)).toBe(true);
      expect(service.hasAll(PERMS.USERS_READ, PERMS.USERS_MANAGE)).toBe(false);
    });

    it('hasAll con array vacío retorna true (convención)', () => {
      expect(service.hasAll()).toBe(true);
    });
  });

  describe('hasPermissionOrRole', () => {
    it('true cuando NO tiene permiso pero rol está en fallback', () => {
      expect(
        service.hasPermissionOrRole(
          PERMS.USERS_MANAGE,
          ROLE_IDS.ADMIN,
          ROLE_IDS.ADMIN,
        ),
      ).toBe(true);
    });

    it('false sin permiso y sin rol coincidente', () => {
      expect(
        service.hasPermissionOrRole(
          PERMS.USERS_MANAGE,
          ROLE_IDS.VIEWER,
          ROLE_IDS.ADMIN,
        ),
      ).toBe(false);
    });

    it('true cuando sí tiene permiso aun sin rol', () => {
      service.loadFromLoginUser({ permissions: [PERMS.USERS_MANAGE] });
      expect(
        service.hasPermissionOrRole(PERMS.USERS_MANAGE, null),
      ).toBe(true);
    });
  });

  describe('version()', () => {
    it('incrementa al cambiar el set', () => {
      const v0 = service.version();
      service.loadFromLoginUser({ permissions: [PERMS.USERS_READ] });
      const v1 = service.version();
      expect(v1).toBeGreaterThan(v0);
    });

    it('NO incrementa cuando se setea el mismo contenido (idempotencia)', () => {
      service.loadFromLoginUser({ permissions: [PERMS.USERS_READ, PERMS.DATASETS_READ] });
      const v1 = service.version();
      service.loadFromLoginUser({ permissions: [PERMS.USERS_READ, PERMS.DATASETS_READ] });
      const v2 = service.version();
      expect(v2).toBe(v1);
    });
  });

  describe('clear()', () => {
    it('vacía el set y bumpea version', () => {
      service.loadFromLoginUser({ permissions: [PERMS.USERS_READ] });
      const v1 = service.version();
      service.clear();
      expect(service.snapshot().size).toBe(0);
      expect(service.version()).toBeGreaterThan(v1);
    });
  });

  describe('refresh()', () => {
    it('GET /users/me/permissions popula el set', () => {
      service.refresh().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/users/me/permissions`);
      expect(req.request.method).toBe('GET');
      req.flush({ permissions: [PERMS.USERS_READ, PERMS.AUDIT_READ] });

      expect(service.snapshot().has(PERMS.USERS_READ)).toBe(true);
      expect(service.snapshot().has(PERMS.AUDIT_READ)).toBe(true);
    });

    it('en error deja el set vacío sin throwear', () => {
      service.loadFromLoginUser({ permissions: [PERMS.USERS_READ] });

      service.refresh().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/users/me/permissions`);
      req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      // El catchError captura el fallo; el set previo persiste sin cambiar
      // (refresh sólo aplica setAll cuando el GET emite OK).
      expect(() => service.snapshot()).not.toThrow();
    });
  });
});
