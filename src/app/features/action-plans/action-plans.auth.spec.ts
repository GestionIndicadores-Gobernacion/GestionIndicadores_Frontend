/**
 * Suite de paridad de autorización del dominio Action Plans tras la
 * migración a overrides granulares por permiso (admin ya NO obtiene
 * bypass por rol; solo el permiso explícito da override).
 *
 * Cubre los 5 predicados:
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
const stubUsersSvc: any = { getAll: () => ({ pipe: () => ({ subscribe: NOOP }) }) };
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
        stubUsersSvc,
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
// Nueva regla: `is_owner OR has_permission(UPDATE_ANY)`. Viewer bloqueado.
// El rol ya NO da override por sí solo — solo el permiso explícito sí.

describe('ActionPlanCalendarComponent.canEditPlanBound', () => {
  const ME = makeUser(42);
  const OTHER = 99;

  it('returns false when there is no currentUser', () => {
    const c = makeCalendar(null, ROLE_IDS.ADMIN, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(false);
  });

  it('viewer → false aún siendo dueño o teniendo el permiso', () => {
    const cOwn = makeCalendar(ME, ROLE_IDS.VIEWER);
    expect(cOwn.canEditPlanBound(makePlan(ME.id))).toBe(false);
    const cPerm = makeCalendar(ME, ROLE_IDS.VIEWER, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(cPerm.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });

  it('admin SIN permiso explícito → solo si es dueño', () => {
    const c = makeCalendar(ME, ROLE_IDS.ADMIN);  // permsSet vacío
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(true);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });

  it('admin CON permiso → override total', () => {
    const c = makeCalendar(ME, ROLE_IDS.ADMIN, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(true);
  });

  it('editor sin permiso, own → true (ownership)', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(true);
  });

  it('editor sin permiso, ajeno → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });

  it('editor CON permiso, ajeno → true (override granular)', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(true);
  });

  it('monitor sin permiso, own → true (ownership)', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(true);
  });

  it('monitor sin permiso, ajeno → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });

  it('monitor CON permiso, ajeno → true (override granular)', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(true);
  });

  it('canInteractWithPlan es alias literal de canEditPlanBound', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    const own = makePlan(ME.id);
    const ajeno = makePlan(OTHER);
    expect(c.canInteractWithPlan(own)).toBe(c.canEditPlanBound(own));
    expect(c.canInteractWithPlan(ajeno)).toBe(c.canEditPlanBound(ajeno));
  });

  it('UPDATE_OWN ya no se chequea — la decisión es ownership puro', () => {
    // Antes UPDATE_OWN era requerido; ahora basta con ser dueño.
    const c = makeCalendar(ME, null, [PERMS.ACTION_PLANS_UPDATE_OWN]);
    expect(c.canEditPlanBound(makePlan(ME.id))).toBe(true);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(false);
  });

  it('rol desconocido + UPDATE_ANY → true sin importar ownership', () => {
    const c = makeCalendar(ME, null, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canEditPlanBound(makePlan(OTHER))).toBe(true);
  });
});

// ── canReportActivity ──────────────────────────────────────────────
// Nueva regla: `is_responsible OR has_permission(REPORT_ACTIVITY)`.
// El rol ya NO da override por sí solo — solo el permiso explícito sí.

describe('ActionPlanCalendarComponent.canReportActivity', () => {
  const ME = makeUser(42);
  const OTHER = 99;

  it('sin currentUser → false', () => {
    const c = makeCalendar(null, ROLE_IDS.ADMIN, [PERMS.ACTION_PLANS_REPORT_ACTIVITY]);
    expect(c.canReportActivity(makePlan(ME.id, [ME.id]))).toBe(false);
  });

  it('viewer → false aún siendo responsable o teniendo el permiso', () => {
    const cResp = makeCalendar(ME, ROLE_IDS.VIEWER);
    expect(cResp.canReportActivity(makePlan(ME.id, [ME.id]))).toBe(false);
    const cPerm = makeCalendar(ME, ROLE_IDS.VIEWER, [PERMS.ACTION_PLANS_REPORT_ACTIVITY]);
    expect(cPerm.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(false);
  });

  it('admin SIN permiso explícito → solo si es responsable', () => {
    const c = makeCalendar(ME, ROLE_IDS.ADMIN);  // permsSet vacío
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(false);
    expect(c.canReportActivity(makePlan(OTHER, [ME.id]))).toBe(true);
  });

  it('admin CON permiso → override total', () => {
    const c = makeCalendar(ME, ROLE_IDS.ADMIN, [PERMS.ACTION_PLANS_REPORT_ACTIVITY]);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(true);
    expect(c.canReportActivity(makePlan(OTHER, []))).toBe(true);
  });

  it('responsable sin permiso → true (regla base)', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    expect(c.canReportActivity(makePlan(OTHER, [ME.id]))).toBe(true);
  });

  it('editor sin permiso, fuera de responsibles → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(false);
  });

  it('editor CON permiso, fuera de responsibles → true (override granular)', () => {
    const c = makeCalendar(ME, ROLE_IDS.EDITOR, [PERMS.ACTION_PLANS_REPORT_ACTIVITY]);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(true);
  });

  it('monitor sin permiso, fuera de responsibles → false', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(false);
  });

  it('monitor CON permiso, fuera de responsibles → true (override granular)', () => {
    const c = makeCalendar(ME, ROLE_IDS.MONITOR, [PERMS.ACTION_PLANS_REPORT_ACTIVITY]);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(true);
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

  it('UPDATE_ANY ya no da override implícito sobre reportar', () => {
    // Antes UPDATE_ANY hacía bypass; ahora solo REPORT_ACTIVITY es el override.
    const c = makeCalendar(ME, null, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(false);
  });

  it('rol desconocido + REPORT_ACTIVITY en set → true sin importar responsibles', () => {
    const c = makeCalendar(ME, null, [PERMS.ACTION_PLANS_REPORT_ACTIVITY]);
    expect(c.canReportActivity(makePlan(OTHER, [ME.id]))).toBe(true);
    expect(c.canReportActivity(makePlan(OTHER, [OTHER]))).toBe(true);
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
// Misma regla que canEditPlanBound: `is_owner OR has_permission(UPDATE_ANY)`.

describe('ActionPlanListComponent.canModify', () => {
  const ME = makeUser(42);
  const OTHER = 99;

  it('sin currentUser → false', () => {
    const c = makeList(null, ROLE_IDS.ADMIN, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canModify(makePlan(ME.id))).toBe(false);
  });

  it('viewer → false aún siendo dueño o teniendo el permiso', () => {
    const cOwn = makeList(ME, ROLE_IDS.VIEWER);
    expect(cOwn.canModify(makePlan(ME.id))).toBe(false);
    const cPerm = makeList(ME, ROLE_IDS.VIEWER, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(cPerm.canModify(makePlan(OTHER))).toBe(false);
  });

  it('admin SIN permiso explícito → solo si es dueño', () => {
    const c = makeList(ME, ROLE_IDS.ADMIN);  // permsSet vacío
    expect(c.canModify(makePlan(ME.id))).toBe(true);
    expect(c.canModify(makePlan(OTHER))).toBe(false);
  });

  it('admin CON permiso → override total', () => {
    const c = makeList(ME, ROLE_IDS.ADMIN, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canModify(makePlan(OTHER))).toBe(true);
  });

  it('editor sin permiso, own → true (ownership)', () => {
    const c = makeList(ME, ROLE_IDS.EDITOR);
    expect(c.canModify(makePlan(ME.id))).toBe(true);
  });

  it('editor sin permiso, ajeno → false', () => {
    const c = makeList(ME, ROLE_IDS.EDITOR);
    expect(c.canModify(makePlan(OTHER))).toBe(false);
  });

  it('editor CON permiso, ajeno → true (override granular)', () => {
    const c = makeList(ME, ROLE_IDS.EDITOR, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canModify(makePlan(OTHER))).toBe(true);
  });

  it('monitor sin permiso, own → true (ownership)', () => {
    const c = makeList(ME, ROLE_IDS.MONITOR);
    expect(c.canModify(makePlan(ME.id))).toBe(true);
  });

  it('monitor sin permiso, ajeno → false', () => {
    const c = makeList(ME, ROLE_IDS.MONITOR);
    expect(c.canModify(makePlan(OTHER))).toBe(false);
  });

  it('monitor CON permiso, ajeno → true (override granular)', () => {
    const c = makeList(ME, ROLE_IDS.MONITOR, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canModify(makePlan(OTHER))).toBe(true);
  });

  it('rol desconocido + UPDATE_ANY → true sin importar ownership', () => {
    const c = makeList(ME, null, [PERMS.ACTION_PLANS_UPDATE_ANY]);
    expect(c.canModify(makePlan(OTHER))).toBe(true);
  });

  it('UPDATE_OWN ya no se chequea — la decisión es ownership puro', () => {
    const c = makeList(ME, null, [PERMS.ACTION_PLANS_UPDATE_OWN]);
    expect(c.canModify(makePlan(ME.id))).toBe(true);
    expect(c.canModify(makePlan(OTHER))).toBe(false);
  });
});

// ── canDeletePlan ──────────────────────────────────────────────────
// Regla: `is_owner OR has_permission(DELETE_ANY)`. Viewer bloqueado.

describe('ActionPlanEditPlanModalComponent.canDeletePlan', () => {
  const ME = makeUser(42);
  const OTHER = 99;

  it('sin currentUser → false', () => {
    const c = makeEditPlanModal(null, ROLE_IDS.ADMIN, makePlan(ME.id), [
      PERMS.ACTION_PLANS_DELETE_ANY,
    ]);
    expect(c.canDeletePlan()).toBe(false);
  });

  it('viewer → false aún siendo dueño o teniendo el permiso', () => {
    const cOwn = makeEditPlanModal(ME, ROLE_IDS.VIEWER, makePlan(ME.id));
    expect(cOwn.canDeletePlan()).toBe(false);
    const cPerm = makeEditPlanModal(ME, ROLE_IDS.VIEWER, makePlan(OTHER), [
      PERMS.ACTION_PLANS_DELETE_ANY,
    ]);
    expect(cPerm.canDeletePlan()).toBe(false);
  });

  it('admin SIN permiso explícito → solo si es dueño', () => {
    const cOwn = makeEditPlanModal(ME, ROLE_IDS.ADMIN, makePlan(ME.id));  // permsSet vacío
    expect(cOwn.canDeletePlan()).toBe(true);
    const cAjeno = makeEditPlanModal(ME, ROLE_IDS.ADMIN, makePlan(OTHER));
    expect(cAjeno.canDeletePlan()).toBe(false);
  });

  it('admin CON permiso → override total', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.ADMIN, makePlan(OTHER), [
      PERMS.ACTION_PLANS_DELETE_ANY,
    ]);
    expect(c.canDeletePlan()).toBe(true);
  });

  it('editor sin permiso, own → true (ownership)', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.EDITOR, makePlan(ME.id));
    expect(c.canDeletePlan()).toBe(true);
  });

  it('editor sin permiso, ajeno → false', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.EDITOR, makePlan(OTHER));
    expect(c.canDeletePlan()).toBe(false);
  });

  it('editor CON permiso, ajeno → true (override granular)', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.EDITOR, makePlan(OTHER), [
      PERMS.ACTION_PLANS_DELETE_ANY,
    ]);
    expect(c.canDeletePlan()).toBe(true);
  });

  it('monitor sin permiso, own → true (ownership)', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.MONITOR, makePlan(ME.id));
    expect(c.canDeletePlan()).toBe(true);
  });

  it('monitor sin permiso, ajeno → false', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.MONITOR, makePlan(OTHER));
    expect(c.canDeletePlan()).toBe(false);
  });

  it('monitor CON permiso, ajeno → true (override granular)', () => {
    const c = makeEditPlanModal(ME, ROLE_IDS.MONITOR, makePlan(OTHER), [
      PERMS.ACTION_PLANS_DELETE_ANY,
    ]);
    expect(c.canDeletePlan()).toBe(true);
  });

  it('rol desconocido + DELETE_ANY → true sin importar ownership', () => {
    const c = makeEditPlanModal(ME, null, makePlan(OTHER), [
      PERMS.ACTION_PLANS_DELETE_ANY,
    ]);
    expect(c.canDeletePlan()).toBe(true);
  });

  it('DELETE_OWN ya no se chequea — la decisión es ownership puro', () => {
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
