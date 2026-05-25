// Verifica contrato HTTP del service: URL exacta, método y deserialización
// directa del body. La forma de los DTOs es contrato con backend (Stream A);
// si cambia, romper el test acá explícitamente.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
  UserPermissionsService,
  UserPermissionsView,
  UserPermissionOverride,
  UserOverridesResponse,
  OverrideEntry,
} from './user-permissions.service';
import { environment } from '../../../../environments/environment';
import { HttpErrorResponse } from '@angular/common/http';

describe('UserPermissionsService', () => {
  let service: UserPermissionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserPermissionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getEffectivePermissions', () => {
    it('GET /users/:id/permissions devuelve el body sin transformaciones', () => {
      const payload: UserPermissionsView = {
        user: { id: 42, email: 'a@b.co', role: { id: 3, name: 'admin' } },
        from_role: ['users.read', 'users.manage'],
        grants: ['datasets.read'],
        revokes: ['reports.delete_any'],
        effective: ['users.read', 'users.manage', 'datasets.read'],
      };

      let received: UserPermissionsView | undefined;
      service.getEffectivePermissions(42).subscribe(res => (received = res));

      const req = httpMock.expectOne(`${environment.apiUrl}/users/42/permissions`);
      expect(req.request.method).toBe('GET');
      req.flush(payload);

      expect(received).toEqual(payload);
    });

    it('respeta el userId en la URL', () => {
      service.getEffectivePermissions(7).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/users/7/permissions`);
      req.flush({} as any);
      expect(req.request.url.endsWith('/users/7/permissions')).toBe(true);
    });
  });

  describe('getOverrides', () => {
    it('GET /users/:id/permissions/overrides devuelve la lista', () => {
      const payload: UserPermissionOverride[] = [
        {
          permission: {
            code: 'datasets.read',
            description: 'Leer datasets',
            module: 'datasets',
          },
          effect: 'grant',
          granted_by: { id: 1, email: 'admin@gobernacion.gov.co' },
          granted_at: '2025-01-15T10:30:00Z',
        },
        {
          permission: {
            code: 'reports.delete_any',
            description: null,
            module: 'reports',
          },
          effect: 'revoke',
          granted_by: null,
          granted_at: '2025-01-16T08:00:00Z',
        },
      ];

      let received: UserPermissionOverride[] | undefined;
      service.getOverrides(42).subscribe(res => (received = res));

      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/42/permissions/overrides`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(payload);

      expect(received).toEqual(payload);
      expect(received?.length).toBe(2);
      expect(received?.[0].effect).toBe('grant');
      expect(received?.[1].effect).toBe('revoke');
    });

    it('respeta el userId en la URL', () => {
      service.getOverrides(99).subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/99/permissions/overrides`,
      );
      req.flush([]);
      expect(req.request.url.endsWith('/users/99/permissions/overrides')).toBe(true);
    });

    it('acepta lista vacía sin romper', () => {
      let received: UserPermissionOverride[] | undefined;
      service.getOverrides(1).subscribe(res => (received = res));

      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/1/permissions/overrides`,
      );
      req.flush([]);

      expect(received).toEqual([]);
    });
  });

  describe('updateOverrides (D3)', () => {
    const SAMPLE_RESPONSE: UserOverridesResponse = {
      overrides: [
        {
          permission: { code: 'datasets.read', description: '', module: 'datasets' },
          effect: 'grant',
          granted_by: { id: 1, email: 'admin@gobernacion.gov.co' },
          granted_at: '2026-05-25T10:00:00Z',
        },
      ],
      permissions: {
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: ['datasets.read'],
        revokes: [],
        effective: ['users.read', 'datasets.read'],
      },
    };

    it('PUT /users/:id/permissions/overrides con body { overrides: [...] }', () => {
      const payload: OverrideEntry[] = [
        { permission_code: 'datasets.read', effect: 'grant' },
        { permission_code: 'reports.delete_any', effect: 'revoke' },
      ];

      let received: UserOverridesResponse | undefined;
      service.updateOverrides(42, payload).subscribe(res => (received = res));

      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/42/permissions/overrides`,
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        overrides: [
          { permission_code: 'datasets.read', effect: 'grant' },
          { permission_code: 'reports.delete_any', effect: 'revoke' },
        ],
      });
      req.flush(SAMPLE_RESPONSE);

      expect(received).toEqual(SAMPLE_RESPONSE);
      expect(received?.overrides.length).toBe(1);
      expect(received?.permissions.effective).toContain('datasets.read');
    });

    it('respeta el userId en la URL', () => {
      service.updateOverrides(7, []).subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/7/permissions/overrides`,
      );
      req.flush(SAMPLE_RESPONSE);
      expect(req.request.url.endsWith('/users/7/permissions/overrides')).toBe(true);
    });

    it('clona los overrides para evitar mutación in-flight', () => {
      const payload: OverrideEntry[] = [
        { permission_code: 'datasets.read', effect: 'grant' },
      ];
      service.updateOverrides(1, payload).subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/1/permissions/overrides`,
      );

      // Mutar el array original NO debe alterar el body in-flight
      (payload as any).push({ permission_code: 'x.y', effect: 'revoke' });
      expect(req.request.body.overrides.length).toBe(1);
      req.flush(SAMPLE_RESPONSE);
    });

    it('propaga el error 403 al observable (lockout)', () => {
      let captured: HttpErrorResponse | undefined;
      service
        .updateOverrides(42, [{ permission_code: 'users.manage', effect: 'revoke' }])
        .subscribe({
          next: () => { throw new Error('should not emit on error'); },
          error: (err: HttpErrorResponse) => (captured = err),
        });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/42/permissions/overrides`,
      );
      req.flush(
        { msg: 'No se puede revocar self' },
        { status: 403, statusText: 'Forbidden' },
      );

      expect(captured?.status).toBe(403);
      expect(captured?.error?.msg).toContain('self');
    });

    it('propaga el error 422 al observable (validación)', () => {
      let captured: HttpErrorResponse | undefined;
      service
        .updateOverrides(42, [{ permission_code: 'x', effect: 'grant' as any }])
        .subscribe({
          next: () => { throw new Error('should not emit on error'); },
          error: (err: HttpErrorResponse) => (captured = err),
        });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/42/permissions/overrides`,
      );
      req.flush(
        { msg: 'Effect inválido' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(captured?.status).toBe(422);
    });

    it('propaga el error 404 al observable (code inexistente)', () => {
      let captured: HttpErrorResponse | undefined;
      service
        .updateOverrides(42, [
          { permission_code: 'does.not.exist', effect: 'grant' },
        ])
        .subscribe({
          next: () => { throw new Error('should not emit on error'); },
          error: (err: HttpErrorResponse) => (captured = err),
        });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/42/permissions/overrides`,
      );
      req.flush(
        { msg: 'Permission code not found' },
        { status: 404, statusText: 'Not Found' },
      );

      expect(captured?.status).toBe(404);
    });
  });
});
