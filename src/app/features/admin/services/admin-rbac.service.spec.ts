import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { AdminRbacService } from './admin-rbac.service';
import { environment } from '../../../../environments/environment';
import {
  Permission,
  RoleDetail,
  RolePermissionsResponse,
} from '../models/admin.model';

describe('AdminRbacService', () => {
  let service: AdminRbacService;
  let httpMock: HttpTestingController;

  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminRbacService,
      ],
    });
    service = TestBed.inject(AdminRbacService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se instancia', () => {
    expect(service).toBeTruthy();
  });

  // ─── getRoles ────────────────────────────────────────────────────────

  describe('getRoles', () => {
    it('llama GET /roles y devuelve el array tal cual cuando viene como array', async () => {
      const expected: RoleDetail[] = [
        { id: 1, name: 'viewer', is_system: true, permission_count: 5, user_count: 2 },
        { id: 3, name: 'admin',  is_system: true, permission_count: 30, user_count: 1 },
      ];

      const promise = new Promise<void>(resolve => {
        service.getRoles().subscribe(roles => {
          expect(roles).toEqual(expected);
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles`);
      expect(req.request.method).toBe('GET');
      req.flush(expected);

      await promise;
    });

    it('acepta shape envuelto en { roles: [...] }', async () => {
      const promise = new Promise<void>(resolve => {
        service.getRoles().subscribe(roles => {
          expect(roles.length).toBe(1);
          expect(roles[0].name).toBe('editor');
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles`);
      req.flush({ roles: [{ id: 2, name: 'editor' }] });

      await promise;
    });

    it('degrada cuando el backend solo emite {id, name} (campos extra undefined)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const promise = new Promise<void>(resolve => {
        service.getRoles().subscribe(roles => {
          expect(roles.length).toBe(1);
          expect(roles[0].permission_count).toBeUndefined();
          expect(roles[0].user_count).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles`);
      req.flush([{ id: 1, name: 'viewer' }]);

      await promise;
      warn.mockRestore();
    });

    it('lista vacía no rompe', async () => {
      const promise = new Promise<void>(resolve => {
        service.getRoles().subscribe(roles => {
          expect(roles).toEqual([]);
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles`);
      req.flush([]);

      await promise;
    });
  });

  // ─── getRolePermissions ─────────────────────────────────────────────

  describe('getRolePermissions', () => {
    it('llama GET /roles/:id/permissions con el id correcto', async () => {
      const promise = new Promise<void>(resolve => {
        service.getRolePermissions(7).subscribe(res => {
          expect(res.role.id).toBe(7);
          expect(res.permissions.length).toBe(2);
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles/7/permissions`);
      expect(req.request.method).toBe('GET');
      req.flush({
        role: { id: 7, name: 'custom', is_system: false, permission_count: 2, user_count: 0 },
        permissions: [
          { code: 'users.read', description: 'Leer usuarios', module: 'users' },
          { code: 'audit.read', description: 'Leer auditoría', module: 'audit' },
        ],
      });

      await promise;
    });

    it('loguea warning si la respuesta no trae role o permissions', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const promise = new Promise<void>(resolve => {
        service.getRolePermissions(1).subscribe(() => {
          expect(warn).toHaveBeenCalled();
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles/1/permissions`);
      req.flush({ /* shape incompleto */ } as any);

      await promise;
      warn.mockRestore();
    });
  });

  // ─── getPermissionsCatalog ──────────────────────────────────────────

  describe('getPermissionsCatalog', () => {
    it('llama GET /permissions y normaliza la respuesta como array', async () => {
      const expected: Permission[] = [
        { code: 'users.read', description: 'Leer usuarios', module: 'users' },
        { code: 'roles.read', description: 'Leer roles', module: 'roles' },
      ];

      const promise = new Promise<void>(resolve => {
        service.getPermissionsCatalog().subscribe(perms => {
          expect(perms).toEqual(expected);
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/permissions`);
      expect(req.request.method).toBe('GET');
      req.flush(expected);

      await promise;
    });

    it('cachea el catálogo: una sola request HTTP aunque haya múltiples suscripciones', async () => {
      // Primera suscripción: dispara la request
      const p1 = new Promise<void>(resolve => {
        service.getPermissionsCatalog().subscribe(() => resolve());
      });

      const req = httpMock.expectOne(`${apiUrl}/permissions`);
      req.flush([
        { code: 'audit.read', description: 'Leer auditoría', module: 'audit' },
      ]);

      await p1;

      // Segunda suscripción: debe servirse desde la cache (no nueva HTTP).
      let count = 0;
      service.getPermissionsCatalog().subscribe(perms => {
        count = perms.length;
      });

      // expectNone == no debe haber requests pendientes adicionales
      httpMock.expectNone(`${apiUrl}/permissions`);
      expect(count).toBe(1);
    });

    it('resetCatalogCache() invalida la cache y permite recargar', async () => {
      const p1 = new Promise<void>(resolve => {
        service.getPermissionsCatalog().subscribe(() => resolve());
      });
      const req1 = httpMock.expectOne(`${apiUrl}/permissions`);
      req1.flush([]);
      await p1;

      service.resetCatalogCache();

      const p2 = new Promise<void>(resolve => {
        service.getPermissionsCatalog().subscribe(() => resolve());
      });
      const req2 = httpMock.expectOne(`${apiUrl}/permissions`);
      req2.flush([{ code: 'x.y', description: '', module: 'x' }]);
      await p2;
    });

    it('infiere el módulo cuando el backend no lo envía', async () => {
      const promise = new Promise<void>(resolve => {
        service.getPermissionsCatalog().subscribe(perms => {
          expect(perms[0].module).toBe('action_plans');
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/permissions`);
      req.flush([
        { code: 'action_plans.create', description: 'Crear plan' } as any,
      ]);

      await promise;
    });

    it('acepta shape envuelto en { permissions: [...] }', async () => {
      const promise = new Promise<void>(resolve => {
        service.getPermissionsCatalog().subscribe(perms => {
          expect(perms.length).toBe(1);
          expect(perms[0].code).toBe('users.read');
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/permissions`);
      req.flush({
        permissions: [{ code: 'users.read', description: 'Leer', module: 'users' }],
      });

      await promise;
    });
  });

  // ─── updateRolePermissions ───────────────────────────────────────────

  describe('updateRolePermissions', () => {
    it('llama PUT /roles/:id/permissions con la URL correcta y el body esperado', async () => {
      const expected: RolePermissionsResponse = {
        role: { id: 2, name: 'editor', is_system: true, permission_count: 2, user_count: 5 },
        permissions: [
          { code: 'users.read', description: 'Leer usuarios', module: 'users' },
          { code: 'reports.read', description: 'Leer reportes', module: 'reports' },
        ],
      };

      const promise = new Promise<void>(resolve => {
        service
          .updateRolePermissions(2, ['users.read', 'reports.read'])
          .subscribe(res => {
            expect(res).toEqual(expected);
            resolve();
          });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles/2/permissions`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        permission_codes: ['users.read', 'reports.read'],
      });
      req.flush(expected);

      await promise;
    });

    it('devuelve directamente el shape { role, permissions } de la respuesta', async () => {
      const promise = new Promise<void>(resolve => {
        service.updateRolePermissions(3, []).subscribe(res => {
          // Conteos del role vienen actualizados del backend.
          expect(res.role.permission_count).toBe(0);
          expect(res.permissions).toEqual([]);
          resolve();
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles/3/permissions`);
      req.flush({
        role: { id: 3, name: 'admin', is_system: true, permission_count: 0, user_count: 1 },
        permissions: [],
      });

      await promise;
    });

    it('clona el array de codes para no mutarlo después en el caller', async () => {
      // El caller suele pasar un set/array que sigue vivo; el service debe
      // armar su propio array para que el body HTTP sea estable.
      const original: string[] = ['a.b', 'c.d'];

      const promise = new Promise<void>(resolve => {
        service.updateRolePermissions(1, original).subscribe(() => resolve());
      });

      // Mutamos `original` antes de que la request salga.
      original.push('mutated.after');

      const req = httpMock.expectOne(`${apiUrl}/roles/1/permissions`);
      // El body NO debe contener 'mutated.after' — fue clonado.
      expect(req.request.body).toEqual({ permission_codes: ['a.b', 'c.d'] });
      req.flush({
        role: { id: 1, name: 'viewer', is_system: true, permission_count: 2, user_count: 0 },
        permissions: [
          { code: 'a.b', description: '', module: 'a' },
          { code: 'c.d', description: '', module: 'c' },
        ],
      });

      await promise;
    });

    it('propaga error 403 cuando el backend rechaza por críticos del admin', async () => {
      const promise = new Promise<void>(resolve => {
        service
          .updateRolePermissions(3, ['users.read'])
          .subscribe({
            next: () => {
              throw new Error('debió fallar');
            },
            error: (err: HttpErrorResponse) => {
              expect(err.status).toBe(403);
              resolve();
            },
          });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles/3/permissions`);
      req.flush(
        { msg: 'No se pueden quitar permisos críticos del rol admin' },
        { status: 403, statusText: 'Forbidden' },
      );

      await promise;
    });

    it('propaga error 404 cuando algún code no existe', async () => {
      const promise = new Promise<void>(resolve => {
        service
          .updateRolePermissions(2, ['perm.no.existe'])
          .subscribe({
            next: () => {
              throw new Error('debió fallar');
            },
            error: (err: HttpErrorResponse) => {
              expect(err.status).toBe(404);
              resolve();
            },
          });
      });

      const req = httpMock.expectOne(`${apiUrl}/roles/2/permissions`);
      req.flush(
        { detail: 'Code no existe: perm.no.existe' },
        { status: 404, statusText: 'Not Found' },
      );

      await promise;
    });

    it('invalida la cache del catálogo tras éxito (idempotente y defensivo)', async () => {
      // Llenamos la cache primero
      const p1 = new Promise<void>(resolve => {
        service.getPermissionsCatalog().subscribe(() => resolve());
      });
      const reqCat = httpMock.expectOne(`${apiUrl}/permissions`);
      reqCat.flush([{ code: 'users.read', description: '', module: 'users' }]);
      await p1;

      // PUT exitoso debe invalidar la cache
      const p2 = new Promise<void>(resolve => {
        service.updateRolePermissions(2, ['users.read']).subscribe(() => resolve());
      });
      const reqPut = httpMock.expectOne(`${apiUrl}/roles/2/permissions`);
      reqPut.flush({
        role: { id: 2, name: 'editor', is_system: true, permission_count: 1, user_count: 0 },
        permissions: [{ code: 'users.read', description: '', module: 'users' }],
      });
      await p2;

      // Próxima lectura del catálogo dispara una nueva request HTTP.
      const p3 = new Promise<void>(resolve => {
        service.getPermissionsCatalog().subscribe(() => resolve());
      });
      const reqCat2 = httpMock.expectOne(`${apiUrl}/permissions`);
      reqCat2.flush([]);
      await p3;
    });
  });
});
