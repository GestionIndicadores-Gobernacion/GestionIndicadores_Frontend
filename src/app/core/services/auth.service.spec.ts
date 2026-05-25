import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';
import { environment } from '../../../environments/environment';
import { PERMS } from '../constants/permissions';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function setupTestBed() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
}

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let perms: PermissionService;
  let service: AuthService;

  afterEach(() => {
    if (httpMock) httpMock.verify();
    localStorage.clear();
  });

  describe('bootstrap', () => {
    it('llama loadFromAccessToken con el token del localStorage al construirse', () => {
      const tok = makeJwt({
        sub: 1,
        role_id: 3,
        permissions: [PERMS.USERS_READ],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      localStorage.setItem('access_token', tok);

      setupTestBed();
      perms = TestBed.inject(PermissionService);
      const spy = vi.spyOn(perms, 'loadFromAccessToken');

      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);

      expect(spy).toHaveBeenCalledWith(tok);
    });

    it('llama loadFromAccessToken con null si no hay token', () => {
      setupTestBed();
      perms = TestBed.inject(PermissionService);
      const spy = vi.spyOn(perms, 'loadFromAccessToken');

      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);

      expect(spy).toHaveBeenCalledWith(null);
    });
  });

  describe('login()', () => {
    beforeEach(() => {
      setupTestBed();
      perms = TestBed.inject(PermissionService);
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('POST /auth/login, guarda tokens y llama perms.loadFromLoginUser', () => {
      const spyLogin = vi.spyOn(perms, 'loadFromLoginUser');
      const spyToken = vi.spyOn(perms, 'loadFromAccessToken');

      const body = {
        access_token: 'access-xyz',
        refresh_token: 'refresh-xyz',
        user: { id: 1, email: 'a@b.co', permissions: [PERMS.USERS_READ] } as any,
      };

      service.login({ email: 'a@b.co', password: 'pw' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush(body);

      expect(localStorage.getItem('access_token')).toBe('access-xyz');
      expect(localStorage.getItem('refresh_token')).toBe('refresh-xyz');
      expect(spyLogin).toHaveBeenCalledWith(body.user);
      // No cayó al fallback porque loadFromLoginUser retornó true.
      expect(spyToken).not.toHaveBeenCalled();
    });

    it('cae a loadFromAccessToken si user.permissions falta', () => {
      const spyLogin = vi
        .spyOn(perms, 'loadFromLoginUser')
        .mockReturnValue(false);
      const spyToken = vi.spyOn(perms, 'loadFromAccessToken');

      const body = {
        access_token: 'access-xyz',
        refresh_token: 'refresh-xyz',
        user: { id: 1, email: 'a@b.co' } as any,
      };

      service.login({ email: 'a@b.co', password: 'pw' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(body);

      expect(spyLogin).toHaveBeenCalled();
      expect(spyToken).toHaveBeenCalledWith('access-xyz');
    });
  });

  describe('refreshToken()', () => {
    beforeEach(() => {
      localStorage.setItem('refresh_token', 'old-refresh');
      setupTestBed();
      perms = TestBed.inject(PermissionService);
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('tras éxito llama loadFromAccessToken con el nuevo access', () => {
      const spyToken = vi.spyOn(perms, 'loadFromAccessToken');

      service.refreshToken().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush({ access_token: 'new-access' });

      expect(localStorage.getItem('access_token')).toBe('new-access');
      expect(spyToken).toHaveBeenCalledWith('new-access');
    });

    it('persiste también el nuevo refresh si viene en la respuesta', () => {
      service.refreshToken().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      req.flush({ access_token: 'new-access', refresh_token: 'new-refresh' });

      expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
    });
  });

  describe('logout()', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'a');
      localStorage.setItem('refresh_token', 'r');
      localStorage.setItem('user', '{"id":1}');
      setupTestBed();
      perms = TestBed.inject(PermissionService);
      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('llama perms.clear() y limpia localStorage', () => {
      const spyClear = vi.spyOn(perms, 'clear');

      service.logout();

      expect(spyClear).toHaveBeenCalled();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});
