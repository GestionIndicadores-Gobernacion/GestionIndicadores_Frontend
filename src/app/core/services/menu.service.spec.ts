import { TestBed } from '@angular/core/testing';

import { MenuService, MenuItem } from './menu.service';
import { PermissionService } from './permission.service';
import { AuthService } from './auth.service';
import { PERMS, ROLE_IDS } from '../constants/permissions';

// ─── Mocks ────────────────────────────────────────────────────────

function makePermsMock(initial: string[] = []) {
  let set = new Set<string>(initial);
  return {
    snapshot: () => set,
    hasPermission: (c: string) => set.has(c),
    hasAny: (...codes: string[]) =>
      codes.length === 0 || codes.some(c => set.has(c)),
    hasAll: (...codes: string[]) =>
      codes.length === 0 || codes.every(c => set.has(c)),
    hasPermissionOrRole: () => false,
    version: () => 0,
    loadFromAccessToken: () => false,
    loadFromLoginUser: () => false,
    refresh: () => null,
    clear: () => { set = new Set(); },
    setAll: (codes: string[]) => { set = new Set(codes); },
  };
}
type PermsMock = ReturnType<typeof makePermsMock>;

function makeAuthMock(roleId: number | null) {
  return {
    getTokenPayload: () => (roleId == null ? null : { role_id: roleId }),
  };
}
type AuthMock = ReturnType<typeof makeAuthMock>;

function setup(roleId: number | null, permCodes: string[] = []) {
  const perms = makePermsMock(permCodes);
  const auth = makeAuthMock(roleId);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PermissionService, useValue: perms as unknown as PermissionService },
      { provide: AuthService, useValue: auth as unknown as AuthService },
    ],
  });
  const service = TestBed.inject(MenuService);
  return { service, perms, auth };
}

// Helper recursivo: junta labels visibles descendiendo por children.
function collectVisibleLabels(service: MenuService, items: MenuItem[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (!service.canShow(it)) continue;
    out.push(it.label);
    if (it.children && it.children.length > 0) {
      for (const lbl of collectVisibleLabels(service, it.children)) {
        out.push(lbl);
      }
    }
  }
  return out;
}

function findByLabel(items: MenuItem[], label: string): MenuItem | undefined {
  for (const it of items) {
    if (it.label === label) return it;
    if (it.children) {
      const found = findByLabel(it.children, label);
      if (found) return found;
    }
  }
  return undefined;
}

// ─── A) Estructura del menú ───────────────────────────────────────

describe('MenuService - estructura', () => {
  let service: MenuService;

  beforeEach(() => {
    ({ service } = setup(ROLE_IDS.ADMIN));
  });

  it('getMenu() retorna 6 items top-level con labels esperados', () => {
    const menu = service.getMenu();
    const labels = menu.map(i => i.label);
    expect(menu.length).toBe(6);
    expect(labels).toEqual([
      'Dashboard',
      'Reportes PYBA',
      'Bases de datos',
      'Planes de acción',
      'Usuarios',
      'Historial',
    ]);
  });

  it('cada item top-level tiene icono asignado', () => {
    const menu = service.getMenu();
    for (const it of menu) {
      expect(it.icon).toBeTruthy();
    }
  });

  it('Reportes PYBA tiene 3 children con labels exactos', () => {
    const menu = service.getMenu();
    const reportesPyba = findByLabel(menu, 'Reportes PYBA');
    expect(reportesPyba).toBeTruthy();
    const childLabels = (reportesPyba!.children ?? []).map(c => c.label);
    expect(childLabels).toEqual(['Reportes', 'Estrategias', 'Componentes Estratégicos']);
  });

  it('Estrategias tiene 1 child: Plan de Desarrollo', () => {
    const menu = service.getMenu();
    const estrategias = findByLabel(menu, 'Estrategias');
    expect(estrategias).toBeTruthy();
    const childLabels = (estrategias!.children ?? []).map(c => c.label);
    expect(childLabels).toEqual(['Plan de Desarrollo']);
  });
});

// ─── B) Paridad de visibilidad por rol (perms set vacío) ──────────

describe('MenuService - visibilidad por rol (perms vacíos, decisión sólo por rol)', () => {
  it('admin (3) ve todo el menú', () => {
    const { service } = setup(ROLE_IDS.ADMIN, []);
    const visible = collectVisibleLabels(service, service.getMenu());
    expect(visible).toEqual([
      'Dashboard',
      'Reportes PYBA',
      'Reportes',
      'Estrategias',
      'Plan de Desarrollo',
      'Componentes Estratégicos',
      'Bases de datos',
      'Gestión de Base de Datos y Tablas',
      'Planes de acción',
      'Calendario',
      'Usuarios',
      'Historial',
    ]);
  });

  it('editor (2) ve Dashboard, Reportes PYBA (Reportes) y Planes de acción (Calendario)', () => {
    const { service } = setup(ROLE_IDS.EDITOR, []);
    const visible = collectVisibleLabels(service, service.getMenu());
    expect(visible).toEqual([
      'Dashboard',
      'Reportes PYBA',
      'Reportes',
      'Planes de acción',
      'Calendario',
    ]);
  });

  it('monitor (4) ve Dashboard, Reportes PYBA (Reportes) y Planes de acción (Calendario)', () => {
    const { service } = setup(ROLE_IDS.MONITOR, []);
    const visible = collectVisibleLabels(service, service.getMenu());
    expect(visible).toEqual([
      'Dashboard',
      'Reportes PYBA',
      'Reportes',
      'Planes de acción',
      'Calendario',
    ]);
  });

  it('viewer (1) ve sólo Dashboard y Reportes PYBA (Reportes)', () => {
    const { service } = setup(ROLE_IDS.VIEWER, []);
    const visible = collectVisibleLabels(service, service.getMenu());
    expect(visible).toEqual([
      'Dashboard',
      'Reportes PYBA',
      'Reportes',
    ]);
  });
});

// ─── C) Dual mode (perm || role) ──────────────────────────────────

describe('MenuService - dual mode (perm OR role)', () => {
  it('usuario sin rol coincidente pero con perm en el set → ve el item', () => {
    const { service } = setup(999, [PERMS.USERS_MANAGE]);
    const usuarios = findByLabel(service.getMenu(), 'Usuarios')!;
    expect(service.canShow(usuarios)).toBe(true);
  });

  it('usuario con rol coincidente y perms vacíos → ve el item (shadow mode)', () => {
    const { service } = setup(ROLE_IDS.ADMIN, []);
    const usuarios = findByLabel(service.getMenu(), 'Usuarios')!;
    expect(service.canShow(usuarios)).toBe(true);
  });

  it('usuario sin perm y sin rol coincidente → no ve el item', () => {
    const { service } = setup(ROLE_IDS.VIEWER, []);
    const usuarios = findByLabel(service.getMenu(), 'Usuarios')!;
    expect(service.canShow(usuarios)).toBe(false);
  });
});

// ─── D) Reglas atómicas de canShow ────────────────────────────────

describe('MenuService - reglas canShow', () => {
  it('item sin roles y sin perms → siempre true (Dashboard)', () => {
    const { service } = setup(null, []);
    const dashboard = findByLabel(service.getMenu(), 'Dashboard')!;
    expect(service.canShow(dashboard)).toBe(true);
  });

  it('item con disabled:true → false aunque tenga el perm y el rol', () => {
    const { service } = setup(ROLE_IDS.ADMIN, [PERMS.USERS_MANAGE]);
    const disabledItem: MenuItem = {
      label: 'X',
      disabled: true,
      roles: [ROLE_IDS.ADMIN],
      perms: [PERMS.USERS_MANAGE],
    };
    expect(service.canShow(disabledItem)).toBe(false);
  });

  it('permsMode:all exige todos los perms — con sólo uno → false', () => {
    const { service } = setup(null, [PERMS.USERS_MANAGE]);
    const item: MenuItem = {
      label: 'X',
      perms: [PERMS.USERS_MANAGE, PERMS.AUDIT_READ],
      permsMode: 'all',
    };
    expect(service.canShow(item)).toBe(false);
  });

  it('permsMode:any (default) — con al menos uno → true', () => {
    const { service } = setup(null, [PERMS.USERS_MANAGE]);
    const item: MenuItem = {
      label: 'X',
      perms: [PERMS.USERS_MANAGE, PERMS.AUDIT_READ],
    };
    expect(service.canShow(item)).toBe(true);
  });
});

// ─── E) hasVisibleChildren ────────────────────────────────────────

describe('MenuService - hasVisibleChildren', () => {
  it('item sin children → false', () => {
    const { service } = setup(ROLE_IDS.ADMIN, []);
    const item: MenuItem = { label: 'X' };
    expect(service.hasVisibleChildren(item)).toBe(false);
  });

  it('al menos un child visible → true; todos ocultos → false', () => {
    const { service } = setup(ROLE_IDS.VIEWER, []);
    const itemConVisible: MenuItem = {
      label: 'Parent',
      children: [
        { label: 'Visible', roles: [ROLE_IDS.VIEWER] },
        { label: 'Oculto', roles: [ROLE_IDS.ADMIN] },
      ],
    };
    expect(service.hasVisibleChildren(itemConVisible)).toBe(true);

    const itemTodosOcultos: MenuItem = {
      label: 'Parent',
      children: [
        { label: 'Oculto1', roles: [ROLE_IDS.ADMIN] },
        { label: 'Oculto2', roles: [ROLE_IDS.ADMIN] },
      ],
    };
    expect(service.hasVisibleChildren(itemTodosOcultos)).toBe(false);
  });
});
