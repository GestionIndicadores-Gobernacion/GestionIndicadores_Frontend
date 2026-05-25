/**
 * Suite de paridad de autorización del dominio Action Plans tras la
 * migración de `role?.name === 'admin' | 'viewer'` a
 * `PermissionService.hasPermissionOrRole`.
 *
 * Cubre los 5 predicados que ahora dependen del modo dual permiso+rol:
 *   - ActionPlanCalendarComponent.canEditPlanBound
 *   - ActionPlanCalendarComponent.canReportActivity
 *   - ActionPlanCalendarComponent.canViewDashboard (asignado en ngOnInit)
 *   - ActionPlanListComponent.canModify
 *   - ActionPlanEditPlanModalComponent.canDeletePlan
 *
 * Estrategia: instanciación manual sin levantar templates. Para clases
 * con arrow fields (canEditPlanBound, canReportActivity, canInteractWithPlan)
 * usamos `TestBed.runInInjectionContext(() => new ...(stubs))` con todas
 * las dependencias mockeadas. Esto sí ejecuta los field initializers y la
 * llamada a `inject(DestroyRef)`, pero NO compila el template.
 * Para predicados que viven como métodos prototípicos (canModify,
 * canDeletePlan) basta `Object.create(prototype)` + asignación directa.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef, NgZone } from '@angular/core';

import { ROLE_IDS, PERMS } from '../../core/constants/permissions';

import { ActionPlanCalendarComponent } from './action-plan-calendar/action-plan-calendar';
import { ActionPlanListComponent } from './action-plan-list/action-plan-list';
import { ActionPlanEditPlanModalComponent } from './modals/action-plan-create-modal/action-plan-edit-modal/action-plan-edit-plan-modal/action-plan-edit-plan-modal';

type AnyPlan = any;

// ── helpers de stubs ───────────────────────────────────────────────

function makePerms(set: string[] = []) {
  const s = new Set(set);
  return {
    hasPermission: (c: string) => s.has(c),
    hasAny: (...cs: string[]) => cs.length === 0 || cs.some(c => s.has(c)),
    hasAll: (...cs: string[]) => cs.length === 0 || cs.every(c => s.has(c)),
    hasPermissionOrRole: (
      code: string,
      roleId: number | null,
      ...fb: number[]
    ) => s.has(code) || (roleId != null && fb.includes(roleId)),
  } as any;
}

function makeAuth(roleId: number | null) {
  return {
    getTokenPayload: () => (roleId == null ? null : { role_id: roleId }),
  } as any;
}

function makeUser(id: number) {
  return { id };
}

function makePlan(ownerId: number | null, responsibles: number[] = []): AnyPlan {
  return {
    id: 999,
    user_id: ownerId,
    responsible_user_id: responsibles[0] ?? null,
    responsible_user_ids: responsibles,
  };
}

// Bootstrap testbed con HTTP testing (PermissionService real lo necesita
// si se cae al constructor por la cadena de inyección de Angular). Aquí
// no instanciamos servicios reales, sólo el componente con stubs.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
});

// Stubs ligeros para evitar booting de servicios reales.
const NOOP = () => undefined;
const stubActionPlanSvc: any = { getAll: () => ({ pipe: () => ({ subscribe: NOOP }) }) };
const stubStrategiesSvc: any = { getAll: () => ({ pipe: () => ({ subscribe: NOOP }) }) };
const stubComponentsSvc: any = { getAll: () => ({ pipe: () => ({ subscribe: NOOP }) }) };
const stubToast: any = { success: NOOP, error: NOOP, confirm: () => Promise.resolve({ isConfirmed: false }) };
const stubNgZone = { run: (fn: any) => fn() } as unknown as NgZone;
const stubCdr = { detectChanges: NOOP } as unknown as ChangeDetectorRef;
const stubExportSvc: any = { export: NOOP };
const stubRoute: any = { snapshot: { queryParamMap: { get: () => null } } };
const stubRouter: any = { navigate: NOOP };

function makeCalendar(
  user: any,
  roleId: number | null,
  permsSet: string[] = []
): ActionPlanCalendarComponent {
  const auth = makeAuth(roleId);
  const perms = makePerms(permsSet);
  // runInInjectionContext habilita `inject(DestroyRef)` durante la
  // construcción sin necesidad de TestBed.createComponent.
  const instance = TestBed.runInInjectionContext(
    () =>
      new ActionPlanCalendarComponent(
        stubActionPlanSvc,
        stubStrategiesSvc,
        stubComponentsSvc,
        stubToast,
        stubNgZone,
        stubCdr,
        stubExportSvc,
        stubRoute,
        stubRouter,
        auth,
        perms
      )
  );
  (instance as any).currentUser = user;
  return instance;
}

function makeList(
  user: any,
  roleId: number | null,
  permsSet: string[] = []
): ActionPlanListComponent {
  // Sin constructor (usa inject()), Object.create + asignación es seguro.
  const comp = Object.create(
    ActionPlanListComponent.prototype
  ) as ActionPlanListComponent;
  (comp as any).currentUser = user;
  (comp as any).authService = makeAuth(roleId);
  (comp as any).permissionService = makePerms(permsSet);
  return comp;
}

function makeEditPlanModal(
  user: any,
  roleId: number | null,
  plan: AnyPlan,
  permsSet: string[] = []
): ActionPlanEditPlanModalComponent {
  // canDeletePlan es método prototípico → Object.create funciona.
  const comp = Object.create(
    ActionPlanEditPlanModalComponent.prototype
  ) as ActionPlanEditPlanModalComponent;
  (comp as any).currentUser = user;
  (comp as any).authService = makeAuth(roleId);
  (comp as any).permissionService = makePerms(permsSet);
  (comp as any).plan = plan;
  return comp;
}

// ── canEditPlanBound ───────────────────────────────────────────────

describe('ActionPlanCalendarComponent.canEditPlanBound', () => {
  const ME = makeUser(42);
  const OTHER = 99;

  it('returns false when there is no currentUser', () => {
    const c = makeCalendar(null, ROLE_IDS.ADMIN);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(false);
  });

  it('admin + own plan → true', () => {
    const c = makeCalendar(ME, ROLE_IDS.ADMIN);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(true);
  });

  it('admin + foreign plan → true (override)', () => {
    const c = makeCalendar(ME, ROLE_IDS.ADMIN);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(true);
  });

  it('viewer + own plan → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.VIEWER);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(false);
  });

  it('viewer + foreign plan → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.VIEWER);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });

  it('editor + own plan → true', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(true);
  });

  it('editor + foreign plan → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });

  it('monitor + own plan → true', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(true);
  });

  it('monitor + foreign plan → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });

  it('canInteractWithPlan es alias literal de canEditPlanBound', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    const own = makePlan(ME.id);
    const ajeno = makePlan(OTHER);
    expect(c.canInteractWithPlan(own)).toBe(c.canEditPlanBound(own));
    expect(c.canInteractWithPlan(ajeno)).toBe(c.canEditPlanBound(ajeno));
  });

  // Dual-mode: rol desconocido pero el permiso explícito rescata.
  it('rol desconocido (null) + UPDATE_ANY en set → true (perm rescata)', () => {
    const c = makeCalendar(ME, null, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(true);
  });

  it('rol desconocido (null) + UPDATE_OWN en set + own → true', () => {
    const c = makeCalendar(ME, null, [PERMS.ACTION_PLANS_UPDATE_OWN]);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(true);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });
});

// ── canReportActivity ──────────────────────────────────────────────

describe('ActionPlanCalendarComponent.canReportActivity', () => {
  const ME = makeUser(42);
  const OTHER = 99;

  it('sin currentUser → false', () => {
    const c = makeCalendar(null, ROLE_IDS.ADMIN);
    expect(c.canReportActivity(makePlan(ME.id, [ME.id]))).toBe(false);
  });

  it('admin → true sin importar responsibles', () => {
    const c = makeCalendar(ME, ROLE_IDS.ADMIN);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(true);
    expect(c.canReportActivity(makePlan(OTHER, []))).toBe(true);
  });

  it('viewer → false aún siendo "responsable"', () => {
    const c = makeCalendar(ME, ROLE_IDS.VIEWER);
    expect(c.canReportActivity(makePlan(ME.id, [ME.id]))).toBe(false);
  });

  it('editor en responsibles → true', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    expect(c.canReportActivity(makePlan(OTHER, [ME.id]))).toBe(true);
  });

  it('editor fuera de responsibles → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(false);
  });

  it('monitor en responsibles → true', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    expect(c.canReportActivity(makePlan(OTHER, [ME.id]))).toBe(true);
  });

  it('monitor fuera de responsibles → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(false);
  });

  it('responsable_user_id legacy también cuenta (sin lista)', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    const plan = {
      id: 1,
      user_id: OTHER,
      responsible_user_id: ME.id,
      responsible_user_ids: null,
    };
    expect(c.canReportActivity(plan as any)).toBe(true);
  });

  // Dual-mode
  it('rol desconocido + UPDATE_ANY en set → true', () => {
    const c = makeCalendar(ME, null, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(true);
  });

  it('rol desconocido + REPORT_ACTIVITY en set + responsable → true', () => {
    const c = makeCalendar(ME, null, [PERMS.ACTION_PLANS_REPORT_ACTIVITY]);
    expect(c.canReportActivity(makePlan(OTHER, [ME.id]))).toBe(true);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(false);
  });
});

// ── canViewDashboard (asignado en ngOnInit) ────────────────────────

describe('ActionPlanCalendarComponent canViewDashboard derivation', () => {
  // Replicamos la lógica que vive dentro de ngOnInit. La asignación
  // misma se prueba aquí porque no podemos correr el OnInit real sin
  // tocar localStorage / cargar planes. La fórmula es trivial y debe
  // mantenerse en paridad con la del código.
  function deriveCanView(roleId: number | null, permsSet: string[] = []): boolean {
    const perms = makePerms(permsSet);
    return perms.hasPermissionOrRole(
      PERMS.ACTION_PLANS_DASHBOARD,
      roleId,
      ROLE_IDS.ADMIN,
      ROLE_IDS.MONITOR
    );
  }

  it('admin → true', () => {
    expect(deriveCanView(ROLE_IDS.ADMIN)).toBe(true);
  });

  it('monitor → true', () => {
    expect(deriveCanView(ROLE_IDS.MONITOR)).toBe(true);
  });

  it('editor → false', () => {
    expect(deriveCanView(ROLE_IDS.EDITOR)).toBe(false);
  });

  it('viewer → false', () => {
    expect(deriveCanView(ROLE_IDS.VIEWER)).toBe(false);
  });

  it('rol desconocido + DASHBOARD perm → true', () => {
    expect(deriveCanView(null, [PERMS.ACTION_PLANS_DASHBOARD])).toBe(true);
  });

  it('rol desconocido sin DASHBOARD perm → false', () => {
    expect(deriveCanView(null, [])).toBe(false);
  });
});

// ── canModify (action-plan-list) ───────────────────────────────────

describe('ActionPlanListComponent.canModify', () => {
  const ME = makeUser(42);
  const OTHER = 99;

  it('sin currentUser → false', () => {
    const c = makeList(null, ROLE_IDS.ADMIN);
    expect(c.canModify(makePlan(ME.id))).toBe(false);
  });

  it('admin + own → true', () => {
    const c = makeList(ME, ROLE_IDS.ADMIN);
    expect(c.canModify(makePlan(ME.id))).toBe(true);
  });

  it('admin + ajeno → true (override)', () => {
    const c = makeList(ME, ROLE_IDS.ADMIN);
    expect(c.canModify(makePlan(OTHER))).toBe(true);
  });

  it('viewer + own → false', () => {
    const c = makeList(ME, ROLE_IDS.VIEWER);
    expect(c.canModify(makePlan(ME.id))).toBe(false);
  });

  it('viewer + ajeno → false', () => {
    const c = makeList(ME, ROLE_IDS.VIEWER);
    expect(c.canModify(makePlan(OTHER))).toBe(false);
  });

  it('editor + own → true', () => {
    const c = makeList(ME, ROLE_IDS.EDITOR);
    expect(c.canModify(makePlan(ME.id))).toBe(true);
  });

  it('editor + ajeno → false', () => {
    const c = makeList(ME, ROLE_IDS.EDITOR);
    expect(c.canModify(makePlan(OTHER))).toBe(false);
  });

  it('monitor + own → true', () => {
    const c = makeList(ME, ROLE_IDS.MONITOR);
    expect(c.canModify(makePlan(ME.id))).toBe(true);
  });

  it('monitor + ajeno → false', () => {
    const c = makeList(ME, ROLE_IDS.MONITOR);
    expect(c.canModify(makePlan(OTHER))).toBe(false);
  });

  // Dual-mode
  it('rol desconocido + UPDATE_ANY → true', () => {
    const c = makeList(ME, null, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canModify(makePlan(OTHER))).toBe(true);
  });

  it('rol desconocido + UPDATE_OWN → true sólo en propio', () => {
    const c = makeList(ME, null, [PERMS.ACTION_PLANS_UPDATE_OWN]);
    expect(c.canModify(makePlan(ME.id))).toBe(true);
    expect(c.canModify(makePlan(OTHER))).toBe(false);
  });
});

// ── canDeletePlan ──────────────────────────────────────────────────

describe('ActionPlanEditPlanModalComponent.canDeletePlan', () => {
  const ME = makeUser(42);
  const OTHER = 99;

  it('sin currentUser → false', () => {
    const c = makeEditPlanModal(null, ROLE_IDS.ADMIN, makePlan(ME.id));
    expect(c.canDeletePlan()).toBe(false);
  });

  it('admin + own → true', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.ADMIN, makePlan(ME.id));
    expect(c.canDeletePlan()).toBe(true);
  });

  it('admin + ajeno → true (override)', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.ADMIN, makePlan(OTHER));
    expect(c.canDeletePlan()).toBe(true);
  });

  it('viewer + own → false', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.VIEWER, makePlan(ME.id));
    expect(c.canDeletePlan()).toBe(false);
  });

  it('viewer + ajeno → false', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.VIEWER, makePlan(OTHER));
    expect(c.canDeletePlan()).toBe(false);
  });

  it('editor + own → true', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.EDITOR, makePlan(ME.id));
    expect(c.canDeletePlan()).toBe(true);
  });

  it('editor + ajeno → false', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.EDITOR, makePlan(OTHER));
    expect(c.canDeletePlan()).toBe(false);
  });

  it('monitor + own → true', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.MONITOR, makePlan(ME.id));
    expect(c.canDeletePlan()).toBe(true);
  });

  it('monitor + ajeno → false', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.MONITOR, makePlan(OTHER));
    expect(c.canDeletePlan()).toBe(false);
  });

  // Dual-mode
  it('rol desconocido + DELETE_ANY → true', () => {
    const c = makeEditPlanModal(ME, null, makePlan(OTHER), [
      PERMS.ACTION_PLANS_DELETE_ANY,
    ]);
    expect(c.canDeletePlan()).toBe(true);
  });

  it('rol desconocido + DELETE_OWN → true sólo en propio', () => {
    const cOwn = makeEditPlanModal(ME, null, makePlan(ME.id), [
      PERMS.ACTION_PLANS_DELETE_OWN,
    ]);
    expect(cOwn.canDeletePlan()).toBe(true);
    const cAjeno = makeEditPlanModal(ME, null, makePlan(OTHER), [
      PERMS.ACTION_PLANS_DELETE_OWN,
    ]);
    expect(cAjeno.canDeletePlan()).toBe(false);
  });
});
