import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { of, throwError } from 'rxjs';

import { RoleDetailComponent } from './role-detail';
import { AdminRbacService } from '../services/admin-rbac.service';
import { Permission, RoleDetail } from '../models/admin.model';
import { LUCIDE_ICON_SET } from '../../../shared/icons/lucide-icons';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { ROLE_IDS } from '../../../core/constants/permissions';

// Catálogo de prueba: cubre los módulos con labels esperados en MODULE_ORDER
// + un permiso "custom" de módulo desconocido para verificar el bucket "Otros".
// Incluye `users.manage` (crítico por fallback) para exercitar D2.
const CATALOG: Permission[] = [
  { code: 'users.read',              description: 'Leer usuarios',         module: 'users' },
  { code: 'users.manage',            description: 'Gestionar usuarios',    module: 'users' },
  { code: 'users.read_permissions',  description: 'Leer permisos',         module: 'users' },
  { code: 'roles.read',              description: 'Leer roles',            module: 'roles' },
  { code: 'roles.manage',            description: 'Gestionar roles',       module: 'roles' },
  { code: 'audit.read',              description: 'Leer auditoría',        module: 'audit' },
  { code: 'datasets.read',           description: 'Leer datasets',         module: 'datasets' },
  { code: 'reports.read',            description: 'Leer reportes',         module: 'reports' },
  { code: 'action_plans.read',       description: 'Leer planes de acción', module: 'action_plans' },
  { code: 'strategies.manage',       description: 'Gestionar estrategias', module: 'strategies' },
  { code: 'components.manage',       description: 'Gestionar componentes', module: 'components' },
  { code: 'public_policies.manage',  description: 'Gestionar políticas',   module: 'public_policies' },
  { code: 'strategy_metrics.manage', description: 'Gestionar métricas',    module: 'strategy_metrics' },
];

const ADMIN_ROLE: RoleDetail = {
  id: 3,
  name: 'admin',
  description: 'Administración global',
  is_system: true,
  permission_count: CATALOG.length,
  user_count: 1,
};

function buildAdminMock(
  role: RoleDetail,
  assigned: Permission[],
  opts: {
    detailError?: boolean;
    catalog?: Permission[];
    updateResponse?: { role: RoleDetail; permissions: Permission[] };
    updateError?: any;
  } = {},
) {
  return {
    getRoles: () => of([role]),
    getRolePermissions: () =>
      opts.detailError
        ? throwError(() => new Error('boom'))
        : of({ role, permissions: assigned }),
    getPermissionsCatalog: () => of(opts.catalog ?? CATALOG),
    updateRolePermissions: vi.fn((_id: number, codes: string[]) => {
      if (opts.updateError) return throwError(() => opts.updateError);
      const fallback = {
        role: { ...role, permission_count: codes.length },
        permissions: codes.map(c => ({ code: c, description: '', module: c.split('.')[0] })),
      };
      return of(opts.updateResponse ?? fallback);
    }),
    resetCatalogCache: () => undefined,
  };
}

function buildAuthMock(currentRoleId: number | null = ROLE_IDS.ADMIN) {
  return {
    getTokenPayload: vi.fn(() =>
      currentRoleId == null ? null : { sub: 1, role_id: currentRoleId, exp: 0 },
    ),
    isAuthenticated: () => true,
  };
}

function buildPermsMock(grantedCodes: string[] = []) {
  const set = new Set(grantedCodes);
  return {
    hasPermission: (c: string) => set.has(c),
    hasAny: (...codes: string[]) => codes.some(c => set.has(c)),
    hasAll: (...codes: string[]) => codes.every(c => set.has(c)),
    version: () => 0,
    refresh: vi.fn(() => of(set)),
    snapshot: () => set,
  };
}

function buildToastMock() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };
}

function setup(
  role: RoleDetail = ADMIN_ROLE,
  assigned: Permission[] = [],
  opts: {
    paramId?: string | null;
    detailError?: boolean;
    catalog?: Permission[];
    currentRoleId?: number | null;
    grantedCodes?: string[];
    updateResponse?: { role: RoleDetail; permissions: Permission[] };
    updateError?: any;
  } = {},
): {
  fixture: ComponentFixture<RoleDetailComponent>;
  component: RoleDetailComponent;
  adminMock: ReturnType<typeof buildAdminMock>;
  permsMock: ReturnType<typeof buildPermsMock>;
  toastMock: ReturnType<typeof buildToastMock>;
  authMock: ReturnType<typeof buildAuthMock>;
} {
  const paramMap = convertToParamMap({
    id: opts.paramId === undefined ? String(role.id) : (opts.paramId ?? ''),
  });
  const stubRoute = {
    snapshot: { paramMap },
  } as unknown as ActivatedRoute;

  const adminMock = buildAdminMock(role, assigned, opts);
  const authMock = buildAuthMock(
    opts.currentRoleId === undefined ? ROLE_IDS.ADMIN : opts.currentRoleId,
  );
  const permsMock = buildPermsMock(opts.grantedCodes ?? []);
  const toastMock = buildToastMock();

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RoleDetailComponent],
    providers: [
      provideRouter([]),
      { provide: AdminRbacService, useValue: adminMock },
      { provide: ActivatedRoute, useValue: stubRoute },
      { provide: AuthService, useValue: authMock },
      { provide: PermissionService, useValue: permsMock },
      { provide: ToastService, useValue: toastMock },
      {
        provide: LUCIDE_ICONS,
        multi: true,
        useValue: new LucideIconProvider(LUCIDE_ICON_SET),
      },
    ],
  });

  const fixture = TestBed.createComponent(RoleDetailComponent);
  return {
    fixture,
    component: fixture.componentInstance,
    adminMock,
    permsMock,
    toastMock,
    authMock,
  };
}

describe('RoleDetailComponent', () => {

  it('se crea', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  // ─── Agrupación por módulo ───────────────────────────────────────

  it('agrupa permisos en secciones — una por módulo presente en el catálogo', () => {
    const { fixture, component } = setup(ADMIN_ROLE, []);
    fixture.detectChanges();

    // CATALOG cubre 10 módulos distintos (users, roles, audit, datasets,
    // reports, action_plans, strategies, components, public_policies,
    // strategy_metrics). Hay 10 secciones esperadas.
    expect(component.sections.length).toBe(10);

    const sectionEls = fixture.nativeElement.querySelectorAll('section[data-module]');
    expect(sectionEls.length).toBe(10);
  });

  it('mantiene el orden definido en MODULE_ORDER', () => {
    const { fixture, component } = setup(ADMIN_ROLE, []);
    fixture.detectChanges();

    const order = component.sections.map(s => s.key);
    expect(order).toEqual([
      'users',
      'roles',
      'audit',
      'strategies',
      'components',
      'strategy_metrics',
      'public_policies',
      'datasets',
      'reports',
      'action_plans',
    ]);
  });

  it('users.read_permissions queda en módulo users (no en roles)', () => {
    const customCatalog: Permission[] = [
      // Backend devolviendo, por error, el code en módulo 'roles' — debemos
      // re-resolverlo al módulo 'users'.
      { code: 'users.read_permissions', description: 'Leer permisos', module: 'roles' },
      { code: 'roles.read',             description: 'Leer roles',    module: 'roles' },
    ];

    const { component, fixture } = setup(ADMIN_ROLE, [], { catalog: customCatalog });
    fixture.detectChanges();

    const usersSection = component.sections.find(s => s.key === 'users');
    const rolesSection = component.sections.find(s => s.key === 'roles');
    expect(usersSection?.permissions.map(p => p.code)).toContain('users.read_permissions');
    expect(rolesSection?.permissions.map(p => p.code)).not.toContain('users.read_permissions');
  });

  it('agrupa permisos con módulo desconocido bajo "Otros"', () => {
    const odd: Permission[] = [
      { code: 'custom.test', description: 'Custom', module: 'custom' },
      { code: 'users.read',  description: 'Leer usuarios', module: 'users' },
    ];

    const { component, fixture } = setup(ADMIN_ROLE, [], { catalog: odd });
    fixture.detectChanges();

    const otros = component.sections.find(s => s.key === 'otros');
    expect(otros).toBeTruthy();
    expect(otros!.permissions.map(p => p.code)).toEqual(['custom.test']);
  });

  // ─── Marcado de checkboxes según asignación ──────────────────────

  it('marca isAssigned=true para permisos en la lista del rol', () => {
    const assigned: Permission[] = [
      { code: 'users.read',  description: '', module: 'users' },
      { code: 'roles.read',  description: '', module: 'roles' },
    ];

    const { component, fixture } = setup(ADMIN_ROLE, assigned);
    fixture.detectChanges();

    expect(component.isAssigned('users.read')).toBe(true);
    expect(component.isAssigned('roles.read')).toBe(true);
    expect(component.isAssigned('audit.read')).toBe(false);
    expect(component.isAssigned('does.not.exist')).toBe(false);
  });

  it('renderiza el checkbox HTML con el atributo checked correcto', () => {
    const assigned: Permission[] = [
      { code: 'users.read', description: '', module: 'users' },
    ];

    const { fixture } = setup(ADMIN_ROLE, assigned);
    fixture.detectChanges();

    const checkedInput = fixture.nativeElement.querySelector(
      'input[aria-label="users.read"]',
    ) as HTMLInputElement;
    const uncheckedInput = fixture.nativeElement.querySelector(
      'input[aria-label="audit.read"]',
    ) as HTMLInputElement;

    expect(checkedInput).toBeTruthy();
    expect(checkedInput.checked).toBe(true);
    expect(uncheckedInput).toBeTruthy();
    expect(uncheckedInput.checked).toBe(false);
  });

  it('TODOS los checkboxes están deshabilitados (read-only en D1)', () => {
    const assigned: Permission[] = [
      { code: 'users.read', description: '', module: 'users' },
    ];

    const { fixture } = setup(ADMIN_ROLE, assigned);
    fixture.detectChanges();

    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];

    expect(inputs.length).toBe(CATALOG.length);
    for (const input of inputs) {
      expect(input.disabled).toBe(true);
    }
  });

  // ─── Header y contadores ─────────────────────────────────────────

  it('muestra contador "X de Y permisos asignados"', () => {
    const assigned: Permission[] = [
      { code: 'users.read', description: '', module: 'users' },
      { code: 'audit.read', description: '', module: 'audit' },
    ];

    const { fixture, component } = setup(ADMIN_ROLE, assigned);
    fixture.detectChanges();

    expect(component.assignedCount).toBe(2);
    expect(component.catalogCount).toBe(CATALOG.length);

    const text: string = fixture.nativeElement.textContent || '';
    // El template imprime "<X> de <Y> permisos asignados"
    expect(text).toContain(`${assigned.length}`);
    expect(text).toContain(`${CATALOG.length}`);
    expect(text).toContain('permisos asignados');
  });

  it('renderiza el banner shadow mode', () => {
    const { fixture } = setup(ADMIN_ROLE, []);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector(
      '[data-testid="shadow-mode-banner"]',
    );
    expect(banner).toBeTruthy();
  });

  it('renderiza enlace "Volver al listado" apuntando a /admin/roles', () => {
    const { fixture } = setup(ADMIN_ROLE, []);
    fixture.detectChanges();
    const back = fixture.nativeElement.querySelector('a[href="/admin/roles"]');
    expect(back).toBeTruthy();
  });

  it('formatUserCount cubre los tres casos canónicos', () => {
    const { component } = setup(ADMIN_ROLE, []);
    // ngOnInit pobla role desde el mock síncrono; no necesitamos
    // detectChanges (que dispararía la rama de error con un icono
    // mal mapeado en page-state).
    component.ngOnInit();
    expect(component.formatUserCount()).toBe('1');

    (component as any).role = { ...ADMIN_ROLE, user_count: 0 };
    expect(component.formatUserCount()).toBe('0');

    (component as any).role = { ...ADMIN_ROLE, user_count: undefined };
    expect(component.formatUserCount()).toBe('-');
  });

  // ─── Manejo de errores y edge cases ───────────────────────────────

  it('pageState = error cuando falla getRolePermissions', () => {
    const { component } = setup(ADMIN_ROLE, [], { detailError: true });
    // Llamada directa a ngOnInit: evitamos detectChanges porque el
    // template de error en page-state usa un icono ("alert-triangle")
    // que no está en LUCIDE_ICON_SET — bug pre-existente del proyecto.
    component.ngOnInit();
    expect(component.pageState).toBe('error');
    expect(component.loadError).toBe(true);
  });

  it('pageState = error cuando el param id no es numérico', () => {
    const { component } = setup(ADMIN_ROLE, [], { paramId: 'abc' });
    component.ngOnInit();
    expect(component.pageState).toBe('error');
  });

  it('describe devuelve em-dash si role no tiene description', () => {
    const { component } = setup({ id: 1, name: 'x' }, []);
    expect(component.describe(null)).toBe('—');
    expect(component.describe({ id: 1, name: 'x' })).toBe('—');
    expect(component.describe({ id: 1, name: 'x', description: '   ' })).toBe('—');
    expect(component.describe({ id: 1, name: 'x', description: 'Hola' })).toBe('Hola');
  });

  // ─────────────────────────────────────────────────────────────────
  // D2 — Modo edición
  // ─────────────────────────────────────────────────────────────────

  describe('D2 — modo edición', () => {

    const EDITOR_ROLE: RoleDetail = {
      id: 2,
      name: 'editor',
      description: 'Editor',
      is_system: true,
      permission_count: 1,
      user_count: 5,
    };

    it('arranca en read-only y se enciende con enterEditMode()', () => {
      const { fixture, component } = setup(ADMIN_ROLE, [
        { code: 'users.read', description: '', module: 'users' },
      ]);
      fixture.detectChanges();

      expect(component.isEditMode()).toBe(false);
      component.enterEditMode();
      expect(component.isEditMode()).toBe(true);

      // El snapshot original se copia a selectedCodes
      expect([...component.selectedCodes()]).toEqual(['users.read']);
      expect([...component.originalCodes()]).toEqual(['users.read']);
    });

    it('togglePerm IGNORA críticos del rol admin (silenciosamente)', () => {
      // 'users.manage' es crítico por fallback. ADMIN_ROLE → no se puede
      // toglear.
      const { fixture, component } = setup(ADMIN_ROLE, [
        { code: 'users.manage', description: '', module: 'users' },
      ]);
      fixture.detectChanges();
      component.enterEditMode();

      const before = [...component.selectedCodes()].sort();
      component.togglePerm('users.manage');
      const after = [...component.selectedCodes()].sort();
      expect(after).toEqual(before);
    });

    it('togglePerm funciona normalmente en rol editor (críticos no aplican)', () => {
      const { fixture, component } = setup(EDITOR_ROLE, [
        { code: 'users.manage', description: '', module: 'users' },
      ]);
      fixture.detectChanges();
      component.enterEditMode();

      expect(component.selectedCodes().has('users.manage')).toBe(true);
      component.togglePerm('users.manage');
      expect(component.selectedCodes().has('users.manage')).toBe(false);

      // Y puede agregar de nuevo
      component.togglePerm('users.manage');
      expect(component.selectedCodes().has('users.manage')).toBe(true);
    });

    it('togglePerm es no-op en read-only', () => {
      const { fixture, component } = setup(EDITOR_ROLE, [
        { code: 'users.read', description: '', module: 'users' },
      ]);
      fixture.detectChanges();

      expect(component.isEditMode()).toBe(false);
      component.togglePerm('users.read');
      // No cambia nada
      expect([...component.selectedCodes()]).toEqual(['users.read']);
    });

    it('dirty se computa correctamente', () => {
      const { fixture, component } = setup(EDITOR_ROLE, [
        { code: 'users.read', description: '', module: 'users' },
      ]);
      fixture.detectChanges();

      expect(component.dirty()).toBe(false);

      component.enterEditMode();
      expect(component.dirty()).toBe(false);

      component.togglePerm('audit.read');
      expect(component.dirty()).toBe(true);

      // Volver al estado original → dirty=false
      component.togglePerm('audit.read');
      expect(component.dirty()).toBe(false);
    });

    it('diff lista added/removed correctamente y ordenado', () => {
      const { fixture, component } = setup(EDITOR_ROLE, [
        { code: 'users.read', description: '', module: 'users' },
        { code: 'audit.read', description: '', module: 'audit' },
      ]);
      fixture.detectChanges();

      component.enterEditMode();
      component.togglePerm('reports.read'); // add
      component.togglePerm('datasets.read'); // add
      component.togglePerm('users.read');    // remove

      const d = component.diff();
      expect(d.added).toEqual(['datasets.read', 'reports.read']); // ordenado
      expect(d.removed).toEqual(['users.read']);
    });

    it('cancelEdit sin dirty no pide confirm y vuelve a read-only', () => {
      const { fixture, component } = setup(EDITOR_ROLE, []);
      fixture.detectChanges();
      component.enterEditMode();
      expect(component.isEditMode()).toBe(true);

      const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.cancelEdit();
      expect(spy).not.toHaveBeenCalled();
      expect(component.isEditMode()).toBe(false);
      spy.mockRestore();
    });

    it('cancelEdit con dirty=true pide confirm y respeta cancelación', () => {
      const { fixture, component } = setup(EDITOR_ROLE, []);
      fixture.detectChanges();
      component.enterEditMode();
      component.togglePerm('users.read');
      expect(component.dirty()).toBe(true);

      const spy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.cancelEdit();
      expect(spy).toHaveBeenCalled();
      // El usuario dijo "no descartar" → seguimos en edit mode con cambios
      expect(component.isEditMode()).toBe(true);
      expect(component.dirty()).toBe(true);

      // Ahora dice "sí, descartar"
      spy.mockReturnValue(true);
      component.cancelEdit();
      expect(component.isEditMode()).toBe(false);
      expect(component.dirty()).toBe(false);

      spy.mockRestore();
    });

    it('openDiffModal requiere dirty + role', () => {
      const { fixture, component } = setup(EDITOR_ROLE, []);
      fixture.detectChanges();
      component.enterEditMode();

      // dirty=false → no abre
      component.openDiffModal();
      expect(component.roleForModal()).toBeNull();

      component.togglePerm('users.read');
      component.openDiffModal();
      expect(component.roleForModal()).not.toBeNull();
      expect(component.roleForModal()?.id).toBe(EDITOR_ROLE.id);
    });

    it('applyDiff llama service y refresca PermissionService cuando es self-edit', () => {
      // El currentUserRoleId = ADMIN_ROLE.id, y el role en pantalla = ADMIN_ROLE.
      const { fixture, component, adminMock, permsMock, toastMock } = setup(
        ADMIN_ROLE,
        [{ code: 'users.read', description: '', module: 'users' }],
        { currentRoleId: ROLE_IDS.ADMIN },
      );
      fixture.detectChanges();
      component.enterEditMode();
      component.togglePerm('reports.read'); // add

      component.applyDiff();

      expect(adminMock.updateRolePermissions).toHaveBeenCalledTimes(1);
      expect(adminMock.updateRolePermissions).toHaveBeenCalledWith(
        ADMIN_ROLE.id,
        expect.arrayContaining(['users.read', 'reports.read']),
      );
      expect(toastMock.success).toHaveBeenCalledWith('Permisos actualizados');
      expect(permsMock.refresh).toHaveBeenCalledTimes(1);
      expect(component.isEditMode()).toBe(false);
      expect(component.saving()).toBe(false);
    });

    it('applyDiff NO refresca PermissionService cuando NO es self-edit', () => {
      // current user = ADMIN; role en pantalla = EDITOR → no es self-edit
      const { fixture, component, permsMock } = setup(
        EDITOR_ROLE,
        [{ code: 'users.read', description: '', module: 'users' }],
        { currentRoleId: ROLE_IDS.ADMIN },
      );
      fixture.detectChanges();
      component.enterEditMode();
      component.togglePerm('reports.read');

      component.applyDiff();
      expect(permsMock.refresh).not.toHaveBeenCalled();
    });

    it('applyDiff con error muestra toast y NO sale del edit mode', () => {
      const error = { status: 403, error: { msg: 'No se puede' } };
      const { fixture, component, toastMock } = setup(
        ADMIN_ROLE,
        [{ code: 'users.manage', description: '', module: 'users' }],
        { updateError: error },
      );
      fixture.detectChanges();
      component.enterEditMode();
      component.togglePerm('reports.read');

      component.applyDiff();
      expect(toastMock.error).toHaveBeenCalled();
      // saving liberado
      expect(component.saving()).toBe(false);
      // edit mode preservado para que el usuario pueda revisar
      expect(component.isEditMode()).toBe(true);
    });

    it('isSelfRole es true cuando role.id === currentUserRoleId', () => {
      const { component, fixture } = setup(ADMIN_ROLE, [], {
        currentRoleId: ROLE_IDS.ADMIN,
      });
      fixture.detectChanges();
      expect(component.isSelfRole()).toBe(true);
    });

    it('isSelfRole es false cuando role.id !== currentUserRoleId', () => {
      const { component, fixture } = setup(EDITOR_ROLE, [], {
        currentRoleId: ROLE_IDS.ADMIN,
      });
      fixture.detectChanges();
      expect(component.isSelfRole()).toBe(false);
    });

    it('banner self-edit aparece en el DOM cuando corresponde', () => {
      const { fixture } = setup(ADMIN_ROLE, [], {
        currentRoleId: ROLE_IDS.ADMIN,
      });
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector(
        '[data-testid="role-detail-self-edit-banner"]',
      );
      expect(banner).toBeTruthy();
    });

    it('banner self-edit ausente cuando no es self-edit', () => {
      const { fixture } = setup(EDITOR_ROLE, [], {
        currentRoleId: ROLE_IDS.ADMIN,
      });
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector(
        '[data-testid="role-detail-self-edit-banner"]',
      );
      expect(banner).toBeFalsy();
    });

    it('botón Editar visible cuando el current user tiene roles.manage', () => {
      const { fixture } = setup(EDITOR_ROLE, [], {
        currentRoleId: ROLE_IDS.ADMIN,
        grantedCodes: ['roles.manage'],
      });
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector(
        '[data-testid="role-detail-edit-btn"]',
      );
      expect(btn).toBeTruthy();
    });

    it('botón Editar visible por fallback de rol admin aún sin perm', () => {
      // current user es admin pero sin perms.manage → fallback abre el botón
      const { fixture } = setup(EDITOR_ROLE, [], {
        currentRoleId: ROLE_IDS.ADMIN,
        grantedCodes: [],
      });
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector(
        '[data-testid="role-detail-edit-btn"]',
      );
      expect(btn).toBeTruthy();
    });

    it('botón Editar OCULTO sin roles.manage ni fallback admin', () => {
      // current user es editor (rol 2), sin perm roles.manage y SIN fallback
      // (ROLE_IDS.ADMIN = 3; el editor no entra).
      const { fixture } = setup(EDITOR_ROLE, [], {
        currentRoleId: ROLE_IDS.EDITOR,
        grantedCodes: [],
      });
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector(
        '[data-testid="role-detail-edit-btn"]',
      );
      expect(btn).toBeFalsy();
    });

    it('checkboxes críticos quedan disabled en edit mode para rol admin', () => {
      const { fixture, component } = setup(ADMIN_ROLE, []);
      fixture.detectChanges();
      component.enterEditMode();
      fixture.detectChanges();

      // users.manage es crítico por fallback.
      const criticalCheckbox = fixture.nativeElement.querySelector(
        'input[aria-label="users.manage"]',
      ) as HTMLInputElement;
      expect(criticalCheckbox).toBeTruthy();
      expect(criticalCheckbox.disabled).toBe(true);

      // En cambio, audit.read no es crítico → debe estar habilitado.
      const auditCheckbox = fixture.nativeElement.querySelector(
        'input[aria-label="audit.read"]',
      ) as HTMLInputElement;
      expect(auditCheckbox).toBeTruthy();
      expect(auditCheckbox.disabled).toBe(false);
    });

    it('checkboxes críticos NO bloqueados para rol editor', () => {
      const { fixture, component } = setup(EDITOR_ROLE, []);
      fixture.detectChanges();
      component.enterEditMode();
      fixture.detectChanges();

      const criticalCheckbox = fixture.nativeElement.querySelector(
        'input[aria-label="users.manage"]',
      ) as HTMLInputElement;
      expect(criticalCheckbox.disabled).toBe(false);
    });

    it('isLockedCritical solo cierto si role.name === admin y permiso crítico', () => {
      const { component } = setup(EDITOR_ROLE, []);
      // En editor ningún permiso queda lockeado, incluso si es crítico.
      const critical = { code: 'users.manage', description: '', module: 'users' };
      expect(component.isLockedCritical(critical)).toBe(false);
    });

    it('isLockedCritical true para admin + permiso crítico, false para no crítico', () => {
      const { component, fixture } = setup(ADMIN_ROLE, []);
      fixture.detectChanges();

      const critical = { code: 'roles.manage', description: '', module: 'roles' };
      const nonCritical = { code: 'reports.read', description: '', module: 'reports' };
      expect(component.isLockedCritical(critical)).toBe(true);
      expect(component.isLockedCritical(nonCritical)).toBe(false);
    });

    it('respeta backend is_critical override (true) aunque code no esté en fallback', () => {
      const oddCatalog: Permission[] = [
        { code: 'reports.read', description: '', module: 'reports', is_critical: true },
      ];
      const { component, fixture } = setup(ADMIN_ROLE, [], { catalog: oddCatalog });
      fixture.detectChanges();

      expect(component.isLockedCritical(oddCatalog[0])).toBe(true);
    });

    it('counter de diff visible en header durante edit mode', () => {
      const { fixture, component } = setup(EDITOR_ROLE, []);
      fixture.detectChanges();
      component.enterEditMode();
      component.togglePerm('users.read');
      fixture.detectChanges();

      const counter = fixture.nativeElement.querySelector(
        '[data-testid="role-detail-edit-counter"]',
      );
      expect(counter).toBeTruthy();
      const text = (counter?.textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('+1');
      expect(text).toContain('0 removidos');
    });

    it('banner dirty visible solo cuando isEditMode && dirty', () => {
      const { fixture, component } = setup(EDITOR_ROLE, []);
      fixture.detectChanges();

      // read-only: ausente
      expect(
        fixture.nativeElement.querySelector('[data-testid="role-detail-dirty-banner"]'),
      ).toBeFalsy();

      component.enterEditMode();
      fixture.detectChanges();
      // edit mode sin cambios: ausente
      expect(
        fixture.nativeElement.querySelector('[data-testid="role-detail-dirty-banner"]'),
      ).toBeFalsy();

      component.togglePerm('users.read');
      fixture.detectChanges();
      // edit mode con cambios: visible
      expect(
        fixture.nativeElement.querySelector('[data-testid="role-detail-dirty-banner"]'),
      ).toBeTruthy();
    });

    it('closeDiffModal no cierra si está saving', () => {
      const { component, fixture } = setup(ADMIN_ROLE, []);
      fixture.detectChanges();
      component.enterEditMode();
      component.togglePerm('reports.read');
      component.openDiffModal();
      expect(component.roleForModal()).not.toBeNull();

      // Simulamos saving=true
      (component as any).saving.set(true);
      component.closeDiffModal();
      // Sigue abierto
      expect(component.roleForModal()).not.toBeNull();
    });

    it('save exitoso hidrata originalCodes con la response del backend', () => {
      const updateResponse = {
        role: { ...ADMIN_ROLE, permission_count: 2 },
        permissions: [
          { code: 'users.read', description: '', module: 'users' },
          { code: 'reports.read', description: '', module: 'reports' },
        ],
      };
      const { fixture, component } = setup(ADMIN_ROLE, [], { updateResponse });
      fixture.detectChanges();
      component.enterEditMode();
      component.togglePerm('reports.read');
      component.applyDiff();

      expect([...component.originalCodes()].sort()).toEqual([
        'reports.read',
        'users.read',
      ]);
      expect(component.isEditMode()).toBe(false);
    });

    it('describeError mapea 403/404/otros a mensajes legibles', () => {
      const { component } = setup(ADMIN_ROLE, []);
      const desc = (component as any).describeError.bind(component);

      expect(desc({ status: 403, error: { msg: 'X' } })).toBe('X');
      expect(desc({ status: 403 })).toContain('crítico');
      expect(desc({ status: 404, error: { detail: 'Y' } })).toBe('Y');
      expect(desc({ status: 404 })).toContain('catálogo');
      expect(desc({ status: 500 })).toContain('guardar');
    });

  });
});
