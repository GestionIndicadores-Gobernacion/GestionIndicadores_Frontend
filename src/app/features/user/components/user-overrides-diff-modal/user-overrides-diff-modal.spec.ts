// Tests del modal de diff de overrides (D3). Misma estrategia que el
// `role-permissions-diff-modal`: usar `runInInjectionContext` para
// componentes con `effect()` en constructor y verificar branches por
// API pública sin compileComponents/Lucide.

import { TestBed } from '@angular/core/testing';

import { UserOverridesDiffModalComponent } from './user-overrides-diff-modal';
import { OverridesDiff } from '../user-permissions-drawer/user-permissions-drawer';

// ─── Fixtures ────────────────────────────────────────────────────────

const TARGET_USER = {
  id: 42,
  email: 'jdoe@gobernacion.gov.co',
  role: { id: 2, name: 'editor' },
};

const TARGET_ADMIN = {
  id: 1,
  email: 'admin@gobernacion.gov.co',
  role: { id: 3, name: 'admin' },
  is_main_admin: true,
};

const EMPTY_DIFF: OverridesDiff = { added: [], removed: [], changed: [] };

function build(): UserOverridesDiffModalComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [] });
  return TestBed.runInInjectionContext(
    () => new UserOverridesDiffModalComponent(),
  );
}

// ─── Especificaciones ────────────────────────────────────────────────

describe('UserOverridesDiffModalComponent - apertura', () => {
  it('isOpen() es false antes de setear targetUser', () => {
    const c = build();
    expect(c.isOpen()).toBe(false);
  });

  it('isOpen() pasa a true cuando targetUser != null', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    expect(c.isOpen()).toBe(true);
  });

  it('isOpen() vuelve a false cuando targetUser se setea a null', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    c.targetUser = null;
    expect(c.isOpen()).toBe(false);
  });

  it('displayName devuelve el email', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    expect(c.displayName()).toBe('jdoe@gobernacion.gov.co');
  });

  it('displayName cae a "Usuario #id" si no hay email', () => {
    const c = build();
    c.targetUser = { ...TARGET_USER, email: '' };
    expect(c.displayName()).toBe('Usuario #42');
  });
});

describe('UserOverridesDiffModalComponent - particionado del diff', () => {
  it('separa added en grants y revokes', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    c.diff = {
      added: [
        { permission_code: 'a.x', effect: 'grant' },
        { permission_code: 'b.y', effect: 'revoke' },
        { permission_code: 'c.z', effect: 'grant' },
      ],
      removed: [],
      changed: [],
    };

    expect(c.addedGrants().length).toBe(2);
    expect(c.addedRevokes().length).toBe(1);
    expect(c.addedGrants().map(g => g.permission_code)).toEqual(['a.x', 'c.z']);
    expect(c.addedRevokes()[0].permission_code).toBe('b.y');
  });

  it('hasAddedGrants / hasAddedRevokes / hasRemoved / hasChanged correctos', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    c.diff = EMPTY_DIFF;
    expect(c.hasAddedGrants()).toBe(false);
    expect(c.hasAddedRevokes()).toBe(false);
    expect(c.hasRemoved()).toBe(false);
    expect(c.hasChanged()).toBe(false);

    c.diff = {
      added: [
        { permission_code: 'a', effect: 'grant' },
        { permission_code: 'b', effect: 'revoke' },
      ],
      removed: [{ permission_code: 'c', effect: 'grant' }],
      changed: [{ permission_code: 'd', from: 'grant', to: 'revoke' }],
    };
    expect(c.hasAddedGrants()).toBe(true);
    expect(c.hasAddedRevokes()).toBe(true);
    expect(c.hasRemoved()).toBe(true);
    expect(c.hasChanged()).toBe(true);
  });

  it('diff null cae a estructura vacía (defensivo)', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    (c as any).diff = null;
    expect(c.addedGrants()).toEqual([]);
    expect(c.addedRevokes()).toEqual([]);
    expect(c.removedItems()).toEqual([]);
    expect(c.changedItems()).toEqual([]);
  });
});

describe('UserOverridesDiffModalComponent - inputs varios', () => {
  it('isSelfTarget, isMainAdminTarget, isAdminTarget se setean', () => {
    const c = build();
    c.isSelfTarget = true;
    c.isMainAdminTarget = true;
    c.isAdminTarget = true;
    expect(c.isSelfTarget).toBe(true);
    expect(c.isMainAdminTarget).toBe(true);
    expect(c.isAdminTarget).toBe(true);
  });

  it('shadowMode se setea', () => {
    const c = build();
    c.shadowMode = true;
    expect(c.shadowMode).toBe(true);
  });

  it('effectiveWouldBeEmpty / hasCriticalGrantToNonAdmin se setean', () => {
    const c = build();
    c.effectiveWouldBeEmpty = true;
    c.hasCriticalGrantToNonAdmin = true;
    expect(c.effectiveWouldBeEmpty).toBe(true);
    expect(c.hasCriticalGrantToNonAdmin).toBe(true);
  });

  it('criticalGrantList se setea', () => {
    const c = build();
    c.criticalGrantList = ['users.manage', 'roles.manage'];
    expect(c.criticalGrantList.length).toBe(2);
  });

  it('saving por defecto es false', () => {
    const c = build();
    expect(c.saving).toBe(false);
  });
});

describe('UserOverridesDiffModalComponent - emisiones', () => {
  it('onConfirmClick emite (confirm)', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    const spy = vi.fn();
    c.confirm.subscribe(spy);
    c.onConfirmClick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onConfirmClick NO emite si saving', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    c.saving = true;
    const spy = vi.fn();
    c.confirm.subscribe(spy);
    c.onConfirmClick();
    expect(spy).not.toHaveBeenCalled();
  });

  it('onCancelClick emite (cancel)', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    const spy = vi.fn();
    c.cancel.subscribe(spy);
    c.onCancelClick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onCancelClick NO emite si saving', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    c.saving = true;
    const spy = vi.fn();
    c.cancel.subscribe(spy);
    c.onCancelClick();
    expect(spy).not.toHaveBeenCalled();
  });

  it('onBackdropClick emite (cancel)', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    const spy = vi.fn();
    c.cancel.subscribe(spy);
    c.onBackdropClick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onBackdropClick NO emite si saving', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    c.saving = true;
    const spy = vi.fn();
    c.cancel.subscribe(spy);
    c.onBackdropClick();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('UserOverridesDiffModalComponent - body lock', () => {
  beforeEach(() => {
    document.body.classList.remove('overflow-hidden');
  });

  it('agrega overflow-hidden al abrir', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    TestBed.tick();
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
  });

  it('libera overflow-hidden al cerrar', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    TestBed.tick();
    c.targetUser = null;
    TestBed.tick();
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);
  });

  it('ngOnDestroy libera body-lock', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    TestBed.tick();
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
    c.ngOnDestroy();
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);
  });
});

describe('UserOverridesDiffModalComponent - distintos targets', () => {
  it('acepta target main_admin sin issues', () => {
    const c = build();
    c.targetUser = TARGET_ADMIN;
    expect(c.targetUser?.id).toBe(1);
    expect(c.isOpen()).toBe(true);
  });

  it('targetUser getter refleja el último valor seteado', () => {
    const c = build();
    c.targetUser = TARGET_USER;
    expect(c.targetUser).toEqual(TARGET_USER);
    c.targetUser = TARGET_ADMIN;
    expect(c.targetUser).toEqual(TARGET_ADMIN);
  });
});
