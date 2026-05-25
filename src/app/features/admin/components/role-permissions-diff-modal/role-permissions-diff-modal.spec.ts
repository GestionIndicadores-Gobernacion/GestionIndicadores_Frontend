// Tests del modal de confirmación de diff. Construimos el componente en
// `runInInjectionContext` (igual patrón que el drawer de permisos)
// porque tiene `effect()` en constructor y queremos verificar branches
// por API pública (signals + handlers) sin compileComponents/Lucide.

import { TestBed } from '@angular/core/testing';

import { RolePermissionsDiffModalComponent } from './role-permissions-diff-modal';
import { RoleDetail, RolePermissionsDiff } from '../../models/admin.model';

// ─── Fixtures ────────────────────────────────────────────────────────

const ADMIN_ROLE: RoleDetail = {
  id: 3,
  name: 'admin',
  description: 'Administración global',
  is_system: true,
  permission_count: 30,
  user_count: 2,
};

const EDITOR_ROLE: RoleDetail = {
  id: 2,
  name: 'editor',
  description: 'Editor',
  is_system: true,
  permission_count: 15,
  user_count: 5,
};

const EMPTY_DIFF: RolePermissionsDiff = { added: [], removed: [] };

function build(): RolePermissionsDiffModalComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [] });
  return TestBed.runInInjectionContext(
    () => new RolePermissionsDiffModalComponent(),
  );
}

// ─── Especificaciones ────────────────────────────────────────────────

describe('RolePermissionsDiffModalComponent - apertura', () => {
  it('isOpen() es false antes de setear role', () => {
    const c = build();
    expect(c.isOpen()).toBe(false);
  });

  it('isOpen() pasa a true cuando se setea role no-null', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    expect(c.isOpen()).toBe(true);
  });

  it('isOpen() vuelve a false cuando se resetea role a null', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    c.role = null;
    expect(c.isOpen()).toBe(false);
  });
});

describe('RolePermissionsDiffModalComponent - diff signals', () => {
  it('expone added y removed desde el input diff', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    c.diff = { added: ['users.read', 'reports.read'], removed: ['audit.read'] };

    expect(c.added()).toEqual(['users.read', 'reports.read']);
    expect(c.removed()).toEqual(['audit.read']);
  });

  it('hasAdded / hasRemoved reflejan los conteos', () => {
    const c = build();
    c.role = ADMIN_ROLE;

    c.diff = EMPTY_DIFF;
    expect(c.hasAdded()).toBe(false);
    expect(c.hasRemoved()).toBe(false);

    c.diff = { added: ['x.y'], removed: [] };
    expect(c.hasAdded()).toBe(true);
    expect(c.hasRemoved()).toBe(false);

    c.diff = { added: [], removed: ['x.y'] };
    expect(c.hasAdded()).toBe(false);
    expect(c.hasRemoved()).toBe(true);
  });

  it('diff input null cae a estructura vacía (defensivo)', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    // Cast por contrato del template: si el caller pasa undefined/null
    // por error, no queremos crashear.
    (c as any).diff = null;
    expect(c.added()).toEqual([]);
    expect(c.removed()).toEqual([]);
  });
});

describe('RolePermissionsDiffModalComponent - inputs varios', () => {
  it('totalUsers se setea en la instancia', () => {
    const c = build();
    c.totalUsers = 5;
    expect(c.totalUsers).toBe(5);
  });

  it('shadowMode se setea en la instancia', () => {
    const c = build();
    c.shadowMode = true;
    expect(c.shadowMode).toBe(true);
  });

  it('isSelfRole se setea en la instancia', () => {
    const c = build();
    c.isSelfRole = true;
    expect(c.isSelfRole).toBe(true);
  });

  it('saving por defecto es false', () => {
    const c = build();
    expect(c.saving).toBe(false);
  });
});

describe('RolePermissionsDiffModalComponent - emisiones', () => {
  it('onConfirmClick emite (confirm) cuando no está saving', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    const spy = vi.fn();
    c.confirm.subscribe(spy);

    c.onConfirmClick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onConfirmClick NO emite si está saving', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    c.saving = true;
    const spy = vi.fn();
    c.confirm.subscribe(spy);

    c.onConfirmClick();
    expect(spy).not.toHaveBeenCalled();
  });

  it('onCancelClick emite (cancel) cuando no está saving', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    const spy = vi.fn();
    c.cancel.subscribe(spy);

    c.onCancelClick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onCancelClick NO emite si está saving', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    c.saving = true;
    const spy = vi.fn();
    c.cancel.subscribe(spy);

    c.onCancelClick();
    expect(spy).not.toHaveBeenCalled();
  });

  it('onBackdropClick emite (cancel) cuando no está saving', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    const spy = vi.fn();
    c.cancel.subscribe(spy);

    c.onBackdropClick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onBackdropClick NO emite si está saving (evita cancelar pedido en curso)', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    c.saving = true;
    const spy = vi.fn();
    c.cancel.subscribe(spy);

    c.onBackdropClick();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('RolePermissionsDiffModalComponent - body lock', () => {
  // jsdom expone `document` — el effect agrega/quita la clase global.
  beforeEach(() => {
    document.body.classList.remove('overflow-hidden');
  });

  it('agrega overflow-hidden al body cuando se abre', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    // El effect corre sincrónicamente porque el signal cambió tras
    // construcción y Angular flushea en el siguiente microtask. Para
    // evitar depender del timing, simulamos lectura explícita.
    TestBed.tick();
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
  });

  it('libera overflow-hidden al cerrar', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    TestBed.tick();
    c.role = null;
    TestBed.tick();
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);
  });

  it('ngOnDestroy libera el body-lock como salvavidas', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    TestBed.tick();
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);

    c.ngOnDestroy();
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);
  });
});

describe('RolePermissionsDiffModalComponent - distintos roles', () => {
  it('acepta role editor sin issues', () => {
    const c = build();
    c.role = EDITOR_ROLE;
    expect(c.role?.id).toBe(2);
    expect(c.isOpen()).toBe(true);
  });

  it('role getter refleja el último valor seteado', () => {
    const c = build();
    c.role = ADMIN_ROLE;
    expect(c.role).toEqual(ADMIN_ROLE);
    c.role = EDITOR_ROLE;
    expect(c.role).toEqual(EDITOR_ROLE);
  });
});
