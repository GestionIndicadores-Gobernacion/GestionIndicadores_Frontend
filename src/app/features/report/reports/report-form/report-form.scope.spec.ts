// Scoping por rol en ReportFormComponent.
//
// Tests para los métodos privados `filterComponentsByRole` y
// `filterStrategiesByRole`, accedidos vía `(comp as any).foo(...)`.
// Patrón: TestBed + runInInjectionContext para que los field initializers
// con inject() (DestroyRef, AuthService, PermissionService) corran.
// Las dependencias inyectadas vía inject() se reemplazan luego con stubs
// que controlan el rol y el helper bypassesComponentScope.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ReportFormComponent } from './report-form';
import { ROLE_IDS } from '../../../../core/constants/permissions';
import { ComponentModel } from '../../models/component.model';
import { StrategyModel } from '../../models/strategy.model';

// ── Stubs ─────────────────────────────────────────────────────────────

function makeAuth(roleId: number | null) {
  return {
    getTokenPayload: () => (roleId == null ? null : { role_id: roleId }),
  } as any;
}

function makePerms() {
  return {
    bypassesComponentScope: (roleId: number | null | undefined) => {
      if (roleId == null) return false;
      return roleId === ROLE_IDS.ADMIN || roleId === ROLE_IDS.MONITOR;
    },
  } as any;
}

const NOOP = () => undefined;
const stubRoute: any = {
  snapshot: {
    paramMap: { get: () => null },
    queryParamMap: { get: () => null },
  },
};
const stubRouter: any = { navigate: NOOP };
const stubStrategies: any = { getAll: NOOP };
const stubComponents: any = { getAll: NOOP, getById: NOOP };
const stubReports: any = { getById: NOOP, create: NOOP, update: NOOP };
const stubActionPlanSvc: any = { getPrefillForReport: NOOP };
const stubToast: any = { success: NOOP, error: NOOP, info: NOOP };
const stubCdr: any = { detectChanges: NOOP };

// ── Datos de prueba ───────────────────────────────────────────────────

function makeComponent(id: number, strategy_id: number): ComponentModel {
  return {
    id,
    strategy_id,
    name: `comp-${id}`,
    created_at: '',
    updated_at: '',
  };
}

function makeStrategy(id: number): StrategyModel {
  return {
    id,
    name: `strat-${id}`,
    objective: '',
    product_goal_description: '',
    annual_goals: [],
    metrics: [],
    total_goal: 0,
    created_at: '',
    updated_at: '',
  };
}

// Catálogo: estrategias S1, S2, S3; componentes: C1->S1, C2->S1, C3->S2, C4->S3.
const ALL_COMPONENTS: ComponentModel[] = [
  makeComponent(1, 10),
  makeComponent(2, 10),
  makeComponent(3, 20),
  makeComponent(4, 30),
];
const ALL_STRATEGIES: StrategyModel[] = [
  makeStrategy(10),
  makeStrategy(20),
  makeStrategy(30),
];

// ── Factoría ──────────────────────────────────────────────────────────

function buildComp(
  roleId: number | null,
  componentAssignments: { component_id: number }[],
): ReportFormComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });

  const instance = TestBed.runInInjectionContext(
    () =>
      new ReportFormComponent(
        stubRoute,
        stubRouter,
        stubStrategies,
        stubComponents,
        stubReports,
        stubActionPlanSvc,
        stubToast,
        stubCdr,
      ),
  );

  // Sobrescribir las deps inyectadas vía inject() con stubs controlados.
  (instance as any).authService = makeAuth(roleId);
  (instance as any).permissionService = makePerms();
  (instance as any).currentUser = { component_assignments: componentAssignments };
  (instance as any).allComponents = ALL_COMPONENTS;
  return instance;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('ReportFormComponent.filterComponentsByRole (scoping)', () => {
  it('admin -> ve TODOS los componentes', () => {
    const comp = buildComp(ROLE_IDS.ADMIN, []);
    const result = (comp as any).filterComponentsByRole(ALL_COMPONENTS);
    expect(result.length).toBe(ALL_COMPONENTS.length);
    expect(result.map((c: ComponentModel) => c.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it('monitor -> ve TODOS los componentes', () => {
    const comp = buildComp(ROLE_IDS.MONITOR, []);
    const result = (comp as any).filterComponentsByRole(ALL_COMPONENTS);
    expect(result.length).toBe(ALL_COMPONENTS.length);
  });

  it('editor con assignments=[1,2] -> sólo componentes 1 y 2', () => {
    const comp = buildComp(ROLE_IDS.EDITOR, [
      { component_id: 1 },
      { component_id: 2 },
    ]);
    const result = (comp as any).filterComponentsByRole(ALL_COMPONENTS);
    expect(result.map((c: ComponentModel) => c.id).sort()).toEqual([1, 2]);
  });

  it('viewer (rol restringido) -> filtra por assignments (cambio menor vs. previo)', () => {
    // Previamente caía al return-all del default. Ahora se filtra.
    // Si viewer no tiene assignments, no ve nada.
    const compEmpty = buildComp(ROLE_IDS.VIEWER, []);
    expect(
      (compEmpty as any).filterComponentsByRole(ALL_COMPONENTS).length,
    ).toBe(0);

    const compWith = buildComp(ROLE_IDS.VIEWER, [{ component_id: 3 }]);
    const result = (compWith as any).filterComponentsByRole(ALL_COMPONENTS);
    expect(result.map((c: ComponentModel) => c.id)).toEqual([3]);
  });

  it('rol desconocido -> filtra por assignments (mismo trato que editor)', () => {
    const comp = buildComp(99, [{ component_id: 4 }]);
    const result = (comp as any).filterComponentsByRole(ALL_COMPONENTS);
    expect(result.map((c: ComponentModel) => c.id)).toEqual([4]);
  });
});

describe('ReportFormComponent.filterStrategiesByRole (scoping)', () => {
  it('admin -> ve TODAS las estrategias', () => {
    const comp = buildComp(ROLE_IDS.ADMIN, []);
    const result = (comp as any).filterStrategiesByRole(ALL_STRATEGIES);
    expect(result.map((s: StrategyModel) => s.id).sort()).toEqual([10, 20, 30]);
  });

  it('monitor -> ve TODAS las estrategias', () => {
    const comp = buildComp(ROLE_IDS.MONITOR, []);
    const result = (comp as any).filterStrategiesByRole(ALL_STRATEGIES);
    expect(result.map((s: StrategyModel) => s.id).sort()).toEqual([10, 20, 30]);
  });

  it('editor con assignments=[1,2] -> solo estrategia 10 (S1)', () => {
    const comp = buildComp(ROLE_IDS.EDITOR, [
      { component_id: 1 },
      { component_id: 2 },
    ]);
    const result = (comp as any).filterStrategiesByRole(ALL_STRATEGIES);
    expect(result.map((s: StrategyModel) => s.id)).toEqual([10]);
  });

  it('editor con assignments=[2,3] -> estrategias 10 y 20', () => {
    const comp = buildComp(ROLE_IDS.EDITOR, [
      { component_id: 2 },
      { component_id: 3 },
    ]);
    const result = (comp as any).filterStrategiesByRole(ALL_STRATEGIES);
    expect(result.map((s: StrategyModel) => s.id).sort()).toEqual([10, 20]);
  });

  it('viewer sin assignments -> sin estrategias (cambio menor vs. previo)', () => {
    const comp = buildComp(ROLE_IDS.VIEWER, []);
    const result = (comp as any).filterStrategiesByRole(ALL_STRATEGIES);
    expect(result).toEqual([]);
  });

  it('rol desconocido con assignments=[4] -> solo estrategia 30', () => {
    const comp = buildComp(99, [{ component_id: 4 }]);
    const result = (comp as any).filterStrategiesByRole(ALL_STRATEGIES);
    expect(result.map((s: StrategyModel) => s.id)).toEqual([30]);
  });
});
