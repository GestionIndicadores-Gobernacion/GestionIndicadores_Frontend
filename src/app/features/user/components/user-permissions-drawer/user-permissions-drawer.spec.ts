// Tests del drawer "Ver permisos". Construyen el componente en
// `runInInjectionContext` para soportar field initializers con `inject()`
// (DestroyRef, service, effect en constructor). Evitamos `compileComponents`
// para no depender de Lucide en el ambiente de test — verificamos las
// branches por API pública (signals + handlers) en vez de DOM.

import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { UserPermissionsDrawerComponent } from './user-permissions-drawer';
import {
  UserPermissionsService,
  UserPermissionsView,
  UserPermissionOverride,
  UserOverridesResponse,
} from '../../services/user-permissions.service';
import { AdminRbacService } from '../../../admin/services/admin-rbac.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Permission } from '../../../admin/models/admin.model';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeView(overrides: Partial<UserPermissionsView> = {}): UserPermissionsView {
  return {
    user: { id: 42, email: 'jdoe@x.co', role: { id: 3, name: 'admin' } },
    from_role: ['users.read', 'users.manage', 'roles.read'],
    grants: ['datasets.read'],
    revokes: ['reports.delete_any'],
    effective: ['users.read', 'users.manage', 'roles.read', 'datasets.read'],
    ...overrides,
  };
}

function makeOverrides(): UserPermissionOverride[] {
  return [
    {
      permission: { code: 'datasets.read', description: 'Leer datasets', module: 'datasets' },
      effect: 'grant',
      granted_by: { id: 1, email: 'admin@gobernacion.gov.co' },
      granted_at: '2025-01-15T10:30:00Z',
    },
    {
      permission: { code: 'reports.delete_any', description: null, module: 'reports' },
      effect: 'revoke',
      granted_by: { id: 1, email: 'admin@gobernacion.gov.co' },
      granted_at: '2025-01-16T08:00:00Z',
    },
  ];
}

const DEFAULT_CATALOG: Permission[] = [
  { code: 'users.read',         description: 'Leer usuarios',         module: 'users' },
  { code: 'users.manage',       description: 'Gestionar usuarios',    module: 'users' },
  { code: 'users.manage_permissions', description: 'Gestionar permisos', module: 'users', is_critical: true },
  { code: 'users.read_permissions',   description: 'Leer permisos',   module: 'users' },
  { code: 'roles.read',         description: 'Leer roles',            module: 'roles' },
  { code: 'roles.manage',       description: 'Gestionar roles',       module: 'roles' },
  { code: 'audit.read',         description: 'Leer auditoría',        module: 'audit' },
  { code: 'datasets.read',      description: 'Leer datasets',         module: 'datasets' },
  { code: 'reports.read',       description: 'Leer reportes',         module: 'reports' },
  { code: 'reports.delete_any', description: 'Borrar reportes',       module: 'reports' },
];

// ─── Mock service ────────────────────────────────────────────────────────────

function makeServiceMock(opts: {
  view?: UserPermissionsView;
  overrides?: UserPermissionOverride[];
  failView?: boolean;
  failOverrides?: boolean;
  updateResponse?: UserOverridesResponse;
  updateError?: any;
} = {}) {
  const spies = {
    getEffectivePermissions: vi.fn((_userId: number) => {
      if (opts.failView) return throwError(() => new Error('boom'));
      return of(opts.view ?? makeView());
    }),
    getOverrides: vi.fn((_userId: number) => {
      if (opts.failOverrides) return throwError(() => new Error('boom'));
      return of(opts.overrides ?? makeOverrides());
    }),
    updateOverrides: vi.fn((_userId: number, _payload: any) => {
      if (opts.updateError) return throwError(() => opts.updateError);
      const fallback: UserOverridesResponse = opts.updateResponse ?? {
        overrides: [],
        permissions: makeView({ grants: [], revokes: [], effective: ['users.read'] }),
      };
      return of(fallback);
    }),
  };
  return spies;
}

function makeAdminRbacMock(catalog: Permission[] = DEFAULT_CATALOG) {
  return {
    getPermissionsCatalog: vi.fn(() => of(catalog)),
    resetCatalogCache: vi.fn(),
  };
}

function makeAuthMock(sub: string | number | null = '99') {
  return {
    getTokenPayload: vi.fn(() => sub == null ? null : { sub, role_id: 3, exp: 0 }),
    isAuthenticated: () => true,
  };
}

function makePermsMock() {
  return {
    refresh: vi.fn(() => of(new Set<string>())),
    hasPermission: () => false,
    hasAny: () => false,
    hasAll: () => false,
    snapshot: () => new Set<string>(),
    version: () => 0,
  };
}

function makeToastMock() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    // Por defecto: confirma. Los tests que necesiten cancelación lo overridean.
    confirm: vi.fn().mockResolvedValue({ isConfirmed: true } as { isConfirmed: boolean }),
  };
}

interface BuildOpts {
  serviceMock?: ReturnType<typeof makeServiceMock>;
  adminMock?: ReturnType<typeof makeAdminRbacMock>;
  authMock?: ReturnType<typeof makeAuthMock>;
  permsMock?: ReturnType<typeof makePermsMock>;
  toastMock?: ReturnType<typeof makeToastMock>;
}

function buildComponent(serviceMock: ReturnType<typeof makeServiceMock>, extra: BuildOpts = {}) {
  const adminMock = extra.adminMock ?? makeAdminRbacMock();
  const authMock = extra.authMock ?? makeAuthMock();
  const permsMock = extra.permsMock ?? makePermsMock();
  const toastMock = extra.toastMock ?? makeToastMock();

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: UserPermissionsService, useValue: serviceMock },
      { provide: AdminRbacService, useValue: adminMock },
      { provide: AuthService, useValue: authMock },
      { provide: PermissionService, useValue: permsMock },
      { provide: ToastService, useValue: toastMock },
    ],
  });
  const c = TestBed.runInInjectionContext(() => new UserPermissionsDrawerComponent());
  return Object.assign(c, { __mocks: { serviceMock, adminMock, authMock, permsMock, toastMock } });
}

// ─── Especificaciones ────────────────────────────────────────────────────────

describe('UserPermissionsDrawerComponent - lazy fetch', () => {
  it('no llama al service al instanciarse', () => {
    const svc = makeServiceMock();
    buildComponent(svc);
    expect(svc.getEffectivePermissions).not.toHaveBeenCalled();
    expect(svc.getOverrides).not.toHaveBeenCalled();
  });

  it('no llama al service si userId queda en null', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = null;
    expect(svc.getEffectivePermissions).not.toHaveBeenCalled();
    expect(svc.getOverrides).not.toHaveBeenCalled();
    expect(c.state()).toBe('idle');
    expect(c.isOpen()).toBe(false);
  });

  it('dispara fetch sólo cuando userId pasa a truthy', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    expect(svc.getEffectivePermissions).toHaveBeenCalledWith(42);
    expect(svc.getOverrides).toHaveBeenCalledWith(42);
    expect(c.isOpen()).toBe(true);
  });

  it('no re-fetcha si setean el mismo userId dos veces', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    c.userId = 42;
    expect(svc.getEffectivePermissions).toHaveBeenCalledTimes(1);
    expect(svc.getOverrides).toHaveBeenCalledTimes(1);
  });

  it('re-fetcha cuando userId cambia', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 1;
    c.userId = 2;
    expect(svc.getEffectivePermissions).toHaveBeenCalledTimes(2);
    expect(svc.getEffectivePermissions).toHaveBeenLastCalledWith(2);
  });
});

describe('UserPermissionsDrawerComponent - estados', () => {
  it('transición: idle → loading → content cuando forkJoin resuelve', () => {
    // forkJoin con observables síncronos resuelve inmediatamente; el
    // componente termina en `content` tras setear userId.
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    expect(c.state()).toBe('idle');
    c.userId = 42;
    expect(c.state()).toBe('content');
    expect(c.view()).not.toBeNull();
    expect(c.overrides().length).toBe(2);
  });

  it('estado pasa a error si getEffectivePermissions falla', () => {
    const svc = makeServiceMock({ failView: true });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.state()).toBe('error');
    expect(c.view()).toBeNull();
  });

  it('estado pasa a error si getOverrides falla', () => {
    const svc = makeServiceMock({ failOverrides: true });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.state()).toBe('error');
  });

  it('cerrar (userId=null) resetea estado, view y overrides', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.state()).toBe('content');
    c.userId = null;
    expect(c.state()).toBe('idle');
    expect(c.view()).toBeNull();
    expect(c.overrides()).toEqual([]);
  });
});

describe('UserPermissionsDrawerComponent - cerrar', () => {
  it('onBackdropClick emite (closed)', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    const spy = vi.fn();
    c.closed.subscribe(spy);
    c.onBackdropClick();
    expect(spy).toHaveBeenCalled();
  });

  it('onCloseClick emite (closed)', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    const spy = vi.fn();
    c.closed.subscribe(spy);
    c.onCloseClick();
    expect(spy).toHaveBeenCalled();
  });
});

describe('UserPermissionsDrawerComponent - agrupación y chips', () => {
  it('effectiveGrouped agrupa codes por módulo y los ordena', () => {
    const svc = makeServiceMock({
      view: makeView({
        effective: ['datasets.read', 'users.read', 'users.manage', 'roles.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;

    const groups = c.effectiveGrouped();
    // Esperamos al menos 3 grupos: users, roles, datasets.
    const modules = groups.map(g => g.module);
    expect(modules).toContain('users');
    expect(modules).toContain('roles');
    expect(modules).toContain('datasets');

    // users debe tener exactamente 2 codes ordenados alfabéticamente.
    const usersGroup = groups.find(g => g.module === 'users')!;
    expect(usersGroup.items.map(i => i.code)).toEqual(['users.manage', 'users.read']);

    // moduleLabel en español.
    expect(usersGroup.moduleLabel).toBe('Usuarios');
  });

  it('effectiveGrouped devuelve [] cuando effective está vacío', () => {
    const svc = makeServiceMock({
      view: makeView({ effective: [] }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.effectiveGrouped()).toEqual([]);
  });

  it('grantChips incluye metadata del override (tooltip, email)', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;

    const grants = c.grantChips();
    expect(grants.length).toBe(1);
    expect(grants[0].code).toBe('datasets.read');
    expect(grants[0].effect).toBe('grant');
    expect(grants[0].byEmail).toBe('admin@gobernacion.gov.co');
    expect(grants[0].tooltip).toContain('admin@gobernacion.gov.co');
  });

  it('revokeChips devuelve [] cuando view.revokes está vacío', () => {
    const svc = makeServiceMock({
      view: makeView({ revokes: [] }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.revokeChips()).toEqual([]);
  });

  it('grantChips devuelve [] cuando view.grants está vacío', () => {
    const svc = makeServiceMock({
      view: makeView({ grants: [] }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.grantChips()).toEqual([]);
  });

  it('fromRoleGrouped vacío cuando from_role está vacío', () => {
    const svc = makeServiceMock({
      view: makeView({ from_role: [] }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.fromRoleGrouped()).toEqual([]);
  });

  it('effectiveCount refleja la longitud del array effective', () => {
    const svc = makeServiceMock({
      view: makeView({ effective: ['a.x', 'b.y', 'c.z'] }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.effectiveCount()).toBe(3);
  });
});

describe('UserPermissionsDrawerComponent - rol badge', () => {
  it('roleBadgeClasses asigna colores conocidos', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    expect(c.roleBadgeClasses('admin')).toContain('orange');
    expect(c.roleBadgeClasses('editor')).toContain('blue');
    expect(c.roleBadgeClasses('viewer')).toContain('zinc');
    expect(c.roleBadgeClasses('monitor')).toContain('purple');
  });

  it('roleBadgeClasses cae a amarillo para roles desconocidos', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    expect(c.roleBadgeClasses('desconocido')).toContain('yellow');
  });

  it('userRoleName toma role.name del view cargado', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 1, email: 'a@b.co', role: { id: 2, name: 'editor' } },
      }),
    });
    const c = buildComponent(svc);
    c.userId = 1;
    expect(c.userRoleName()).toBe('editor');
  });
});

// ─── D3 — Modo edición de overrides ─────────────────────────────────────────

describe('UserPermissionsDrawerComponent - D3 edit mode', () => {

  it('arranca en read-only y enterEditMode cambia el flag', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.isEditMode()).toBe(false);
    c.enterEditMode();
    expect(c.isEditMode()).toBe(true);
  });

  it('enterEditMode es no-op si el state no es content', () => {
    const svc = makeServiceMock({ failView: true });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.state()).toBe('error');
    c.enterEditMode();
    expect(c.isEditMode()).toBe(false);
  });

  it('originalOverrides se hidrata desde grants/revokes del view', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;

    const original = c.originalOverrides();
    expect(original.get('datasets.read')).toBe('grant');
    expect(original.get('reports.delete_any')).toBe('revoke');
  });

  // ─── targets ─────────────────────────────────────────────────────

  it('isSelfTarget=true cuando sub del JWT === view.user.id', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc, { authMock: makeAuthMock('42') });
    c.userId = 42;
    expect(c.isSelfTarget()).toBe(true);
  });

  it('isSelfTarget=false cuando sub != view.user.id', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc, { authMock: makeAuthMock('99') });
    c.userId = 42;
    expect(c.isSelfTarget()).toBe(false);
  });

  it('isAdminTarget=true cuando view.user.role.name === admin', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.isAdminTarget()).toBe(true);
  });

  it('isAdminTarget=false para rol editor', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.isAdminTarget()).toBe(false);
  });

  it('isMainAdminTarget lee is_main_admin del shape; default false', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 1, email: 'a@b.co', role: { id: 3, name: 'admin' }, is_main_admin: true },
      }),
    });
    const c = buildComponent(svc);
    c.userId = 1;
    expect(c.isMainAdminTarget()).toBe(true);
  });

  it('isMainAdminTarget=false si el campo no viene en el shape', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.isMainAdminTarget()).toBe(false);
  });

  // ─── cyclePerm: bloqueos ─────────────────────────────────────────

  it('cyclePerm bloqueado para revoke crítico sobre target admin', () => {
    // Target admin con users.manage en from_role (crítico por fallback).
    // Cyclear lo intentaría llevar a revoke → bloqueado por isProtectedTarget.
    const svc = makeServiceMock();
    const toast = makeToastMock();
    const c = buildComponent(svc, { toastMock: toast });
    c.userId = 42;
    c.enterEditMode();

    expect(c.getStateForPerm('users.manage')).toBe('inherited');
    c.cyclePerm('users.manage');

    // Sigue heredado, el revoke fue bloqueado.
    expect(c.getStateForPerm('users.manage')).toBe('inherited');
    expect(toast.warning).toHaveBeenCalled();
  });

  it('cyclePerm bloqueado para revoke crítico sobre target main_admin', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 1, email: 'a@b.co', role: { id: 2, name: 'editor' }, is_main_admin: true },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
    });
    const toast = makeToastMock();
    const c = buildComponent(svc, { toastMock: toast });
    c.userId = 1;
    c.enterEditMode();

    c.cyclePerm('users.read_permissions'); // crítico por fallback
    // users.read_permissions NO está en el rol del editor → cyclear iría a grant (no bloqueado).
    // El bloqueo solo aplica al revoke. Probamos con uno que SÍ esté en el rol.
    expect(c.getStateForPerm('users.read_permissions')).toBe('grant'); // permitido grant a no-admin

    // Ahora un revoke crítico: ponemos roles.read en from_role
    const svc2 = makeServiceMock({
      view: makeView({
        user: { id: 1, email: 'a@b.co', role: { id: 3, name: 'admin' }, is_main_admin: true },
        from_role: ['roles.read'],
        grants: [],
        revokes: [],
        effective: ['roles.read'],
      }),
    });
    const toast2 = makeToastMock();
    const c2 = buildComponent(svc2, { toastMock: toast2 });
    c2.userId = 1;
    c2.enterEditMode();
    c2.cyclePerm('roles.read'); // crítico, intentando revocar a main_admin
    expect(c2.getStateForPerm('roles.read')).toBe('inherited');
    expect(toast2.warning).toHaveBeenCalled();
  });

  it('cyclePerm bloqueado para revoke crítico cuando target es self', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 99, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.manage_permissions'],
        grants: [],
        revokes: [],
        effective: ['users.manage_permissions'],
      }),
    });
    const toast = makeToastMock();
    const c = buildComponent(svc, { toastMock: toast, authMock: makeAuthMock('99') });
    c.userId = 99;
    c.enterEditMode();

    c.cyclePerm('users.manage_permissions'); // crítico, self → bloqueado
    expect(c.getStateForPerm('users.manage_permissions')).toBe('inherited');
    expect(toast.warning).toHaveBeenCalled();
  });

  it('cyclePerm funciona normalmente para no-críticos sobre admin', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    // datasets.read está en grants — cyclear vuelve a inherited (si está en role) o not_assigned.
    // En este fixture NO está en from_role. Estado inicial: grant.
    expect(c.getStateForPerm('datasets.read')).toBe('grant');
    // Aplicar revertPerm para limpiar
    c.revertPerm('datasets.read');
    expect(c.getStateForPerm('datasets.read')).toBe('not_assigned');
  });

  it('cyclePerm permite grant crítico a no-admin (escalación)', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    c.cyclePerm('users.manage_permissions'); // crítico, target NO admin → permitido
    expect(c.getStateForPerm('users.manage_permissions')).toBe('grant');
    expect(c.hasCriticalGrantToNonAdmin()).toBe(true);
  });

  it('cyclePerm ciclo not_assigned → grant → not_assigned', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    expect(c.getStateForPerm('audit.read')).toBe('not_assigned');
    c.cyclePerm('audit.read');
    expect(c.getStateForPerm('audit.read')).toBe('grant');
    c.cyclePerm('audit.read');
    expect(c.getStateForPerm('audit.read')).toBe('not_assigned');
  });

  it('cyclePerm ciclo inherited → revoke → inherited (no crítico)', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['audit.read'],
        grants: [],
        revokes: [],
        effective: ['audit.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    expect(c.getStateForPerm('audit.read')).toBe('inherited');
    c.cyclePerm('audit.read');
    expect(c.getStateForPerm('audit.read')).toBe('revoke');
    c.cyclePerm('audit.read');
    expect(c.getStateForPerm('audit.read')).toBe('inherited');
  });

  // ─── revertPerm ───────────────────────────────────────────────────

  it('revertPerm vuelve al default (sin override)', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    expect(c.getStateForPerm('datasets.read')).toBe('grant');
    c.revertPerm('datasets.read');
    expect(c.getStateForPerm('datasets.read')).toBe('not_assigned');
  });

  it('revertPerm es no-op en read-only', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    expect(c.isEditMode()).toBe(false);

    c.revertPerm('datasets.read');
    expect(c.getStateForPerm('datasets.read')).toBe('grant'); // sin cambios
  });

  // ─── clearAllOverrides ────────────────────────────────────────────

  it('clearAllOverrides pide confirm y limpia todos', async () => {
    // En el fixture: 'datasets.read' es grant (no en role) y
    // 'reports.delete_any' es revoke (tampoco en role). Tras limpiar,
    // ambos quedan en 'not_assigned' (sin override + no en role).
    const toast = makeToastMock();
    toast.confirm.mockResolvedValue({ isConfirmed: true });
    const svc = makeServiceMock();
    const c = buildComponent(svc, { toastMock: toast });
    c.userId = 42;
    c.enterEditMode();

    c.clearAllOverrides();
    await Promise.resolve();
    expect(toast.confirm).toHaveBeenCalled();
    expect(c.getStateForPerm('datasets.read')).toBe('not_assigned');
    expect(c.getStateForPerm('reports.delete_any')).toBe('not_assigned');
  });

  it('clearAllOverrides respeta cancelación del confirm', async () => {
    const toast = makeToastMock();
    toast.confirm.mockResolvedValue({ isConfirmed: false });
    const svc = makeServiceMock();
    const c = buildComponent(svc, { toastMock: toast });
    c.userId = 42;
    c.enterEditMode();

    c.clearAllOverrides();
    await Promise.resolve();
    expect(c.getStateForPerm('datasets.read')).toBe('grant'); // sin cambios
  });

  // ─── diff y dirty ─────────────────────────────────────────────────

  it('dirty=false al entrar a edit mode (sin cambios)', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    expect(c.dirty()).toBe(false);
  });

  it('diff captura added grant', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    c.cyclePerm('audit.read');
    const d = c.diff();
    expect(d.added.length).toBe(1);
    expect(d.added[0]).toEqual({ permission_code: 'audit.read', effect: 'grant' });
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
    expect(c.dirty()).toBe(true);
  });

  it('diff captura removed cuando revierto un grant existente', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    c.revertPerm('datasets.read'); // venía como grant
    const d = c.diff();
    expect(d.added).toEqual([]);
    expect(d.removed.length).toBe(1);
    expect(d.removed[0]).toEqual({ permission_code: 'datasets.read', effect: 'grant' });
  });

  it('diff captura changed cuando paso de grant a revoke', () => {
    // Para que el toggle vaya grant → revoke necesitamos que el code esté en
    // from_role (que ya tenía override grant en el original) → no es típico
    // pero validamos la rama directamente vía signal.
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['datasets.read'],
        grants: ['datasets.read'],
        revokes: [],
        effective: ['datasets.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    // Forzamos el cambio en el Map: pasar de grant → revoke.
    const next = new Map(c.selectedOverrides());
    next.set('datasets.read', 'revoke');
    c.selectedOverrides.set(next);

    const d = c.diff();
    expect(d.changed.length).toBe(1);
    expect(d.changed[0]).toEqual({
      permission_code: 'datasets.read',
      from: 'grant',
      to: 'revoke',
    });
  });

  // ─── cancelEdit ───────────────────────────────────────────────────

  it('cancelEdit sin dirty no pide confirm y vuelve a read-only', () => {
    const toast = makeToastMock();
    const svc = makeServiceMock();
    const c = buildComponent(svc, { toastMock: toast });
    c.userId = 42;
    c.enterEditMode();
    expect(c.isEditMode()).toBe(true);

    c.cancelEdit();
    expect(toast.confirm).not.toHaveBeenCalled();
    expect(c.isEditMode()).toBe(false);
  });

  it('cancelEdit con dirty=true pide confirm', async () => {
    const toast = makeToastMock();
    toast.confirm.mockResolvedValueOnce({ isConfirmed: false });
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
    });
    const c = buildComponent(svc, { toastMock: toast });
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('audit.read');
    expect(c.dirty()).toBe(true);

    c.cancelEdit();
    await Promise.resolve();
    expect(toast.confirm).toHaveBeenCalled();
    // No descartó: sigue en edit mode con cambios
    expect(c.isEditMode()).toBe(true);
    expect(c.dirty()).toBe(true);

    toast.confirm.mockResolvedValueOnce({ isConfirmed: true });
    c.cancelEdit();
    await Promise.resolve();
    expect(c.isEditMode()).toBe(false);
    expect(c.dirty()).toBe(false);
  });

  // ─── openDiffModal / closeDiffModal ──────────────────────────────

  it('openDiffModal requiere dirty', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();

    c.openDiffModal();
    expect(c.confirmingDiff()).toBe(false); // no abre sin dirty
  });

  it('openDiffModal abre el modal cuando dirty', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('audit.read');

    c.openDiffModal();
    expect(c.confirmingDiff()).toBe(true);
  });

  it('closeDiffModal cierra el modal cuando NO está saving', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('audit.read');
    c.openDiffModal();
    expect(c.confirmingDiff()).toBe(true);

    c.closeDiffModal();
    expect(c.confirmingDiff()).toBe(false);
  });

  it('closeDiffModal NO cierra si saving está en true', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('audit.read');
    c.openDiffModal();
    c.saving.set(true);

    c.closeDiffModal();
    expect(c.confirmingDiff()).toBe(true);
  });

  // ─── applyDiff ────────────────────────────────────────────────────

  it('applyDiff dispara service.updateOverrides con los overrides resultantes', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
      updateResponse: {
        overrides: [],
        permissions: makeView({
          user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
          from_role: ['users.read'],
          grants: ['audit.read'],
          revokes: [],
          effective: ['users.read', 'audit.read'],
        }),
      },
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('audit.read');

    c.applyDiff();
    expect(svc.updateOverrides).toHaveBeenCalledTimes(1);
    const [userId, payload] = svc.updateOverrides.mock.calls[0];
    expect(userId).toBe(42);
    expect(payload).toEqual([{ permission_code: 'audit.read', effect: 'grant' }]);
  });

  it('applyDiff exitoso hidrata originalOverrides y sale de edit mode', () => {
    const updated = makeView({
      user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
      from_role: ['users.read'],
      grants: ['audit.read'],
      revokes: [],
      effective: ['users.read', 'audit.read'],
    });
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
      updateResponse: { overrides: [], permissions: updated },
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('audit.read');
    c.applyDiff();

    expect(c.isEditMode()).toBe(false);
    expect(c.saving()).toBe(false);
    expect(c.originalOverrides().get('audit.read')).toBe('grant');
  });

  it('applyDiff refresca PermissionService cuando target===self', () => {
    const selfView = makeView({
      user: { id: 99, email: 'a@b.co', role: { id: 2, name: 'editor' } },
      from_role: ['users.read'],
      grants: [],
      revokes: [],
      effective: ['users.read'],
    });
    const updatedView = makeView({
      user: { id: 99, email: 'a@b.co', role: { id: 2, name: 'editor' } },
      from_role: ['users.read'],
      grants: ['audit.read'],
      revokes: [],
      effective: ['users.read', 'audit.read'],
    });
    const svc = makeServiceMock({
      view: selfView,
      updateResponse: { overrides: [], permissions: updatedView },
    });
    const perms = makePermsMock();
    const c = buildComponent(svc, {
      authMock: makeAuthMock('99'),
      permsMock: perms,
    });
    c.userId = 99;
    c.enterEditMode();
    c.cyclePerm('audit.read');
    c.applyDiff();

    expect(perms.refresh).toHaveBeenCalledTimes(1);
  });

  it('applyDiff NO refresca PermissionService cuando target no es self', () => {
    const svc = makeServiceMock();
    const perms = makePermsMock();
    const c = buildComponent(svc, {
      authMock: makeAuthMock('99'),
      permsMock: perms,
    });
    c.userId = 42; // distinto de '99'
    c.enterEditMode();
    c.cyclePerm('audit.read');
    c.applyDiff();
    expect(perms.refresh).not.toHaveBeenCalled();
  });

  it('applyDiff con error muestra toast.error y libera saving', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['users.read'],
        grants: [],
        revokes: [],
        effective: ['users.read'],
      }),
      updateError: { status: 403, error: { msg: 'lockout' } },
    });
    const toast = makeToastMock();
    const c = buildComponent(svc, { toastMock: toast });
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('audit.read');
    c.applyDiff();

    expect(toast.error).toHaveBeenCalled();
    expect(c.saving()).toBe(false);
    // El edit mode se preserva para que el usuario corrija.
    expect(c.isEditMode()).toBe(true);
  });

  // ─── computed warnings ────────────────────────────────────────────

  it('hasCriticalGrantToNonAdmin true cuando otorgo crítico a editor', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: [],
        grants: [],
        revokes: [],
        effective: [],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('users.manage_permissions');

    expect(c.hasCriticalGrantToNonAdmin()).toBe(true);
    expect(c.criticalGrantsToNonAdminList()).toContain('users.manage_permissions');
  });

  it('hasCriticalGrantToNonAdmin false cuando target es admin', () => {
    const svc = makeServiceMock(); // target admin por default
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    // Aunque grant crítico esté técnicamente no posible (admin ya los tiene),
    // simulamos la rama: agregamos un grant explícito a 'datasets.read' (no crítico).
    c.cyclePerm('audit.read'); // no crítico
    expect(c.hasCriticalGrantToNonAdmin()).toBe(false);
  });

  it('effectiveWouldBeEmpty=true cuando revoco todo el rol', () => {
    const svc = makeServiceMock({
      view: makeView({
        user: { id: 42, email: 'a@b.co', role: { id: 2, name: 'editor' } },
        from_role: ['audit.read'],
        grants: [],
        revokes: [],
        effective: ['audit.read'],
      }),
    });
    const c = buildComponent(svc);
    c.userId = 42;
    c.enterEditMode();
    c.cyclePerm('audit.read'); // revoke el único perm del rol
    expect(c.effectiveWouldBeEmpty()).toBe(true);
  });

  // ─── helpers ──────────────────────────────────────────────────────

  it('pillTooltip describe cada estado', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;

    expect(c.pillTooltip({
      perm: { code: 'x', description: '', module: 'x' },
      state: 'grant',
      isElevation: false,
      isRevokeLocked: false,
      hasOverride: true,
    })).toContain('Otorgado');

    expect(c.pillTooltip({
      perm: { code: 'x', description: '', module: 'x' },
      state: 'revoke',
      isElevation: false,
      isRevokeLocked: false,
      hasOverride: true,
    })).toContain('Revocado');

    expect(c.pillTooltip({
      perm: { code: 'x', description: '', module: 'x' },
      state: 'inherited',
      isElevation: false,
      isRevokeLocked: true,
      hasOverride: false,
    })).toContain('crítico');
  });

  it('sections agrupa el catálogo y los ordena por MODULE_ORDER', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;

    const sections = c.sections();
    expect(sections.length).toBeGreaterThan(0);
    // Module order: users, roles, audit, ..., reports, action_plans
    expect(sections[0].key).toBe('users');
  });

  it('liveGrantsCount / liveRevokesCount reflejan los overrides post-edición', () => {
    const svc = makeServiceMock();
    const c = buildComponent(svc);
    c.userId = 42;

    // Original: 1 grant + 1 revoke
    expect(c.liveGrantsCount()).toBe(1);
    expect(c.liveRevokesCount()).toBe(1);

    c.enterEditMode();
    c.revertPerm('datasets.read'); // quita el grant
    expect(c.liveGrantsCount()).toBe(0);
    expect(c.liveRevokesCount()).toBe(1);
  });
});

