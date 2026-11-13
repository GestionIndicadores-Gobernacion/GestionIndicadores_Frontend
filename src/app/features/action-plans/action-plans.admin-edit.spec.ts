/**
 * Corrección administrativa de actividades YA reportadas.
 *
 *  - ActionPlanCalendarComponent.canAdminEditReported: rol admin + permiso
 *    ACTION_PLANS_EDIT_REPORTED (paridad con backend `_can_admin_edit_reported`).
 *  - ActionPlanReportModalComponent: gating de `openAdminEdit` y payload con
 *    solo los campos que cambian (lista blanca).
 *
 * Misma estrategia que action-plans.auth.spec.ts: instanciación manual sin
 * templates (Object.create sobre el prototipo + asignación de dependencias).
 */
import { ROLE_IDS, PERMS } from '../../core/constants/permissions';
import { ActionPlanCalendarComponent } from './action-plan-calendar/action-plan-calendar';
import { ActionPlanReportModalComponent } from './modals/action-plan-report-modal/action-plan-report-modal';

function makePerms(set: string[] = []) {
  const s = new Set(set);
  return { hasPermission: (c: string) => s.has(c) } as any;
}

function makeAuth(roleId: number | null) {
  return { getTokenPayload: () => (roleId == null ? null : { role_id: roleId }) } as any;
}

function makeCalendar(roleId: number | null, perms: string[] = []): ActionPlanCalendarComponent {
  const c = Object.create(ActionPlanCalendarComponent.prototype) as ActionPlanCalendarComponent;
  (c as any).authService = makeAuth(roleId);
  (c as any).permissionService = makePerms(perms);
  return c;
}

const REPORTED_ACTIVITY = {
  id: 10,
  name: 'Apoyo jornada',
  deliverable: 'Listado',
  delivery_date: '2026-10-26',
  lugar: 'Toro',
  reported_at: '2026-10-27T15:00:00',
  evidence_url: 'https://drive/evid',
  status: 'Realizado',
};

function makeModal(activity: any, canAdminEdit: boolean): ActionPlanReportModalComponent {
  const m = Object.create(ActionPlanReportModalComponent.prototype) as ActionPlanReportModalComponent;
  Object.assign(m as any, {
    activity: { ...activity },
    canAdminEdit,
    adminEditMode: false,
    adminForm: { name: '', deliverable: '', lugar: '', delivery_date: '', reason: '' },
    adminErrors: {},
    error: '',
    saving: false,
  });
  return m;
}

describe('ActionPlanCalendarComponent.canAdminEditReported', () => {
  const P = PERMS.ACTION_PLANS_EDIT_REPORTED;

  it('admin con el permiso → true', () => {
    expect(makeCalendar(ROLE_IDS.ADMIN, [P]).canAdminEditReported).toBe(true);
  });

  it('admin SIN el permiso (revocado) → false', () => {
    expect(makeCalendar(ROLE_IDS.ADMIN, []).canAdminEditReported).toBe(false);
  });

  it.each([
    ['monitor', ROLE_IDS.MONITOR],
    ['editor', ROLE_IDS.EDITOR],
    ['viewer', ROLE_IDS.VIEWER],
  ])('%s aunque tenga el permiso → false', (_name, roleId) => {
    expect(makeCalendar(roleId, [P]).canAdminEditReported).toBe(false);
  });

  it('sin sesión → false', () => {
    expect(makeCalendar(null, [P]).canAdminEditReported).toBe(false);
  });
});

describe('ActionPlanReportModalComponent — corrección administrativa', () => {
  it('no abre el modo corrección sin permiso', () => {
    const m = makeModal(REPORTED_ACTIVITY, false);
    m.openAdminEdit();
    expect(m.adminEditMode).toBe(false);
  });

  it('no abre el modo corrección si la actividad no está reportada', () => {
    const m = makeModal({ ...REPORTED_ACTIVITY, reported_at: null, evidence_url: null, status: 'En Ejecución' }, true);
    m.openAdminEdit();
    expect(m.adminEditMode).toBe(false);
  });

  it('abre precargado con los valores actuales', () => {
    const m = makeModal(REPORTED_ACTIVITY, true);
    m.openAdminEdit();
    expect(m.adminEditMode).toBe(true);
    expect(m.adminForm.name).toBe('Apoyo jornada');
    expect(m.adminForm.delivery_date).toBe('2026-10-26');
    expect(m.maxCorrectionDate).toBe('2026-10-27');
    expect(m.minCorrectionDate).toBe('2026-01-01');
  });

  it('el payload solo incluye los campos modificados + motivo', () => {
    const m = makeModal(REPORTED_ACTIVITY, true);
    m.openAdminEdit();
    m.adminForm.name = '  APOYO JORNADA VETERINARIA TORO ';
    m.adminForm.reason = 'Solicitud del responsable';
    expect(m.buildAdminPayload()).toEqual({
      name: 'APOYO JORNADA VETERINARIA TORO',
      reason: 'Solicitud del responsable',
    });
  });

  it('valida fecha posterior al reporte y motivo corto sin llamar al backend', () => {
    const m = makeModal(REPORTED_ACTIVITY, true);
    m.openAdminEdit();
    m.adminForm.delivery_date = '2026-10-30';
    m.adminForm.reason = 'corto';
    m.submitAdminEdit();
    expect(m.adminErrors['delivery_date']).toBeTruthy();
    expect(m.adminErrors['reason']).toBeTruthy();
  });
});
