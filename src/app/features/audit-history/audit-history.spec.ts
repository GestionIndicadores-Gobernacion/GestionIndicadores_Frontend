import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { of } from 'rxjs';

import { AuditHistoryComponent } from './audit-history';
import { AuditLogService } from '../action-plans/services/audit-log.service';
import { AuditLogModel } from '../action-plans/models/audit-log.model';
import { UsersService } from '../user/services/users.service';
import { LUCIDE_ICON_SET } from '../../shared/icons/lucide-icons';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USERS = [
  { id: 1, first_name: 'Admin',  last_name: 'User' },
  { id: 7, first_name: 'Editor', last_name: 'Persona' },
];

function makeReportLog(id: number, action: AuditLogModel['action'] = 'created'): AuditLogModel {
  return {
    id,
    user_id: 7,
    entity: 'report',
    entity_id: 100 + id,
    action,
    detail: 'Reporte X actualizado',
    created_at: '2026-05-20T10:00:00Z',
  };
}

function makeActionPlanLog(id: number): AuditLogModel {
  return {
    id,
    user_id: 7,
    entity: 'action_plan',
    entity_id: 200 + id,
    action: 'updated',
    detail: null,
    created_at: '2026-05-21T09:30:00Z',
  };
}

function makeRolePermLog(id: number, opts: {
  shadow?: boolean;
  added?: string[];
  removed?: string[];
  badDetail?: string | null;
} = {}): AuditLogModel {
  const detail = opts.badDetail !== undefined
    ? opts.badDetail
    : JSON.stringify({
        role: { id: 3, name: 'admin' },
        added: opts.added ?? ['users.read_permissions'],
        removed: opts.removed ?? ['reports.delete_any'],
        before_count: 30,
        after_count: 30,
        shadow_mode_active: opts.shadow ?? true,
      });
  return {
    id,
    user_id: 1,
    entity: 'role_permissions',
    entity_id: 3,
    action: 'updated',
    detail,
    created_at: '2026-05-22T12:00:00Z',
  };
}

type OverrideItem = { permission_code: string; effect: 'grant' | 'revoke' };
type OverrideChange = { permission_code: string; from: 'grant' | 'revoke'; to: 'grant' | 'revoke' };

function makeUserOverridesLog(id: number, opts: {
  shadow?: boolean;
  added?: OverrideItem[];
  removed?: OverrideItem[];
  changed?: OverrideChange[];
  targetUser?: { id: number; email: string };
  badDetail?: string | null;
} = {}): AuditLogModel {
  const target = opts.targetUser ?? { id: 7, email: 'editor@gobernacion.gov.co' };
  const detail = opts.badDetail !== undefined
    ? opts.badDetail
    : JSON.stringify({
        target_user: target,
        added:   opts.added   ?? [{ permission_code: 'audit.read',     effect: 'grant'  }],
        removed: opts.removed ?? [{ permission_code: 'reports.create', effect: 'revoke' }],
        changed: opts.changed ?? [{ permission_code: 'users.read',     from: 'grant', to: 'revoke' }],
        shadow_mode_active: opts.shadow ?? true,
      });
  return {
    id,
    user_id: 1,
    entity: 'user_permission_overrides',
    entity_id: target.id,
    action: 'updated',
    detail,
    created_at: '2026-05-23T15:00:00Z',
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

function setup(logs: AuditLogModel[] = []): {
  fixture: ComponentFixture<AuditHistoryComponent>;
  component: AuditHistoryComponent;
  auditSpy: ReturnType<typeof vi.fn>;
} {
  const auditSpy = vi.fn((_filters?: { entity?: string }) => of(logs));

  const auditMock = { getAll: auditSpy };
  const usersMock = { getAll: () => of(USERS) };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AuditHistoryComponent],
    providers: [
      { provide: AuditLogService, useValue: auditMock },
      { provide: UsersService,    useValue: usersMock },
      {
        provide: LUCIDE_ICONS,
        multi: true,
        useValue: new LucideIconProvider(LUCIDE_ICON_SET),
      },
    ],
  });

  const fixture = TestBed.createComponent(AuditHistoryComponent);
  return { fixture, component: fixture.componentInstance, auditSpy };
}

// ─── Specs ───────────────────────────────────────────────────────────────────

describe('AuditHistoryComponent', () => {

  it('se crea', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  // ─── Filtros ─────────────────────────────────────────────────────────────

  it('expone "role_permissions" como opción explícita en el dropdown', () => {
    const { component } = setup();
    const values = component.entityOptions.map(o => o.value);
    expect(values).toContain('report');
    expect(values).toContain('action_plan');
    expect(values).toContain('role_permissions');

    const labels = component.entityOptions.map(o => o.label);
    expect(labels).toContain('Cambios de permisos por rol');
  });

  it('aplica el filtro de entity y solo mantiene logs de ese tipo', () => {
    const logs = [
      makeReportLog(1),
      makeActionPlanLog(2),
      makeRolePermLog(3),
    ];
    const { component, fixture } = setup(logs);
    fixture.detectChanges();

    component.filters.entity = 'role_permissions';
    component.applyFilters();

    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].entity).toBe('role_permissions');
  });

  it('filtro vacío ("") restaura el listado completo', () => {
    const logs = [makeReportLog(1), makeRolePermLog(2)];
    const { component, fixture } = setup(logs);
    fixture.detectChanges();

    component.filters.entity = 'report';
    component.applyFilters();
    expect(component.filtered.length).toBe(1);

    component.filters.entity = '';
    component.applyFilters();
    expect(component.filtered.length).toBe(2);
  });

  it('extraEntityOptions agrega entidades desconocidas vistas en logs', () => {
    const exotic: AuditLogModel = {
      id: 99, user_id: 1, entity: 'mystery', entity_id: 1,
      action: 'created', detail: null, created_at: '2026-05-22T12:00:00Z',
    };
    const { component, fixture } = setup([exotic, makeReportLog(1)]);
    fixture.detectChanges();

    const extras = component.extraEntityOptions;
    expect(extras.length).toBe(1);
    expect(extras[0].value).toBe('mystery');
    // report está en entityOptions canónicas; no debe duplicarse en extras.
    expect(extras.some(o => o.value === 'report')).toBe(false);
  });

  it('extraEntityOptions vacío cuando todos los logs son entidades conocidas', () => {
    const { component, fixture } = setup([
      makeReportLog(1),
      makeActionPlanLog(2),
      makeRolePermLog(3),
    ]);
    fixture.detectChanges();
    expect(component.extraEntityOptions).toEqual([]);
  });

  // ─── Detail parsing ──────────────────────────────────────────────────────

  it('rolePermDetail devuelve null para entities no role_permissions', () => {
    const { component } = setup();
    expect(component.rolePermDetail(makeReportLog(1))).toBeNull();
    expect(component.rolePermDetail(makeActionPlanLog(2))).toBeNull();
  });

  it('rolePermDetail devuelve la estructura tipada para detail válido', () => {
    const { component } = setup();
    const parsed = component.rolePermDetail(makeRolePermLog(1, {
      added: ['users.read_permissions', 'roles.read'],
      removed: ['reports.delete_any'],
      shadow: true,
    }));
    expect(parsed).not.toBeNull();
    expect(parsed!.role.name).toBe('admin');
    expect(parsed!.added).toEqual(['users.read_permissions', 'roles.read']);
    expect(parsed!.removed).toEqual(['reports.delete_any']);
    expect(parsed!.shadow_mode_active).toBe(true);
  });

  it('rolePermDetail devuelve null cuando detail está corrupto (fallback genérico)', () => {
    const { component } = setup();
    const bad = makeRolePermLog(1, { badDetail: '{ not-json' });
    expect(component.rolePermDetail(bad)).toBeNull();
  });

  // ─── Expand / collapse ───────────────────────────────────────────────────

  it('toggleExpanded alterna el estado de un log', () => {
    const { component } = setup();
    const log = makeRolePermLog(1);
    expect(component.isExpanded(log)).toBe(false);
    component.toggleExpanded(log);
    expect(component.isExpanded(log)).toBe(true);
    component.toggleExpanded(log);
    expect(component.isExpanded(log)).toBe(false);
  });

  it('expand de un log no afecta a otros', () => {
    const { component } = setup();
    const a = makeRolePermLog(1);
    const b = makeRolePermLog(2);
    component.toggleExpanded(a);
    expect(component.isExpanded(a)).toBe(true);
    expect(component.isExpanded(b)).toBe(false);
  });

  // ─── Render del template ─────────────────────────────────────────────────

  it('renderiza el título "<actor> editó el rol <name>" para role_permissions', () => {
    const { fixture } = setup([makeRolePermLog(1)]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    expect(text).toContain('Admin User');
    expect(text).toContain('editó el rol');
    expect(text).toContain('admin');
  });

  it('renderiza los chips +N permisos / -N permisos con counts correctos', () => {
    const { fixture } = setup([makeRolePermLog(1, {
      added: ['a.x', 'b.y'],
      removed: ['c.z'],
    })]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    // +2 permisos y −1 permiso (signo "menos" Unicode)
    expect(text).toContain('+2 permisos');
    expect(text).toContain('−1 permiso');
  });

  it('renderiza el badge "fase paralela" solo si shadow_mode_active=true', () => {
    const { fixture: fxOn } = setup([makeRolePermLog(1, { shadow: true })]);
    fxOn.detectChanges();
    expect((fxOn.nativeElement.textContent || '').toLowerCase()).toContain('fase paralela');

    const { fixture: fxOff } = setup([makeRolePermLog(2, { shadow: false })]);
    fxOff.detectChanges();
    expect((fxOff.nativeElement.textContent || '').toLowerCase()).not.toContain('fase paralela');
  });

  it('detail expandible solo se muestra después de toggleExpanded', () => {
    const { fixture, component } = setup([makeRolePermLog(1)]);
    fixture.detectChanges();

    const detailEl = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[data-testid="detail-1"]');

    // Cuando no está expandido el contenedor está oculto vía [hidden]=true
    const before = detailEl();
    expect(before).toBeTruthy();
    expect((before as HTMLElement).hidden).toBe(true);

    // Expandir
    component.toggleExpanded(component.paginated[0]);
    fixture.detectChanges();
    const after = detailEl();
    expect(after).toBeTruthy();
    expect((after as HTMLElement).hidden).toBe(false);

    // El detalle muestra los codes añadidos/removidos
    const text = (after as HTMLElement).textContent || '';
    expect(text).toContain('users.read_permissions');
    expect(text).toContain('reports.delete_any');
    expect(text).toContain('Antes:');
    expect(text).toContain('Después:');
  });

  it('fallback genérico cuando entity=role_permissions pero detail está corrupto', () => {
    const corrupted = makeRolePermLog(1, { badDetail: '{ broken' });
    const { fixture } = setup([corrupted]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    // No debe aparecer "editó el rol" (renderer especial) — el parser
    // devuelve null y caemos al template genérico (sólo nombre + detail crudo).
    expect(text).not.toContain('editó el rol');
    // El detail crudo se muestra como italic (truncate). No debe explotar.
    expect(text).toContain('{ broken');
  });

  it('mantiene render genérico intacto para entity=report (sin chips de roles)', () => {
    const { fixture } = setup([makeReportLog(1)]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    expect(text).toContain('Editor Persona');
    expect(text).toContain('Reporte X actualizado');
    // No debe rendear el subtítulo de chips "+N permisos"
    expect(text).not.toContain('+0 permisos');
    expect(text).not.toContain('fase paralela');
  });

  // ─── Estilo / clases auxiliares ──────────────────────────────────────────

  it('entityLabel mapea las tres entities conocidas', () => {
    const { component } = setup();
    expect(component.entityLabel('report')).toBe('Reporte');
    expect(component.entityLabel('action_plan')).toBe('Plan de acción');
    expect(component.entityLabel('role_permissions')).toBe('Permisos de rol');
    expect(component.entityLabel('unknown_thing')).toBe('unknown_thing');
  });

  it('entityBadgeClass usa amber para role_permissions', () => {
    const { component } = setup();
    expect(component.entityBadgeClass('role_permissions')).toContain('amber');
    expect(component.entityBadgeClass('report')).toContain('indigo');
  });

  it('entityIconName devuelve "shield-check" para role_permissions', () => {
    const { component } = setup();
    expect(component.entityIconName('role_permissions')).toBe('shield-check');
  });

  // ─── D3: user_permission_overrides ───────────────────────────────────────

  it('D3: expone "user_permission_overrides" como opción explícita en el dropdown', () => {
    const { component } = setup();
    const values = component.entityOptions.map(o => o.value);
    expect(values).toContain('user_permission_overrides');

    const labels = component.entityOptions.map(o => o.label);
    expect(labels).toContain('Cambios de overrides por usuario');
  });

  it('D3: las opciones del select preservan el orden canónico (role_permissions antes que overrides)', () => {
    const { component } = setup();
    const values = component.entityOptions.map(o => o.value);
    const rolePermIdx = values.indexOf('role_permissions');
    const overridesIdx = values.indexOf('user_permission_overrides');
    expect(rolePermIdx).toBeGreaterThanOrEqual(0);
    expect(overridesIdx).toBeGreaterThan(rolePermIdx);
  });

  it('D3: aplica el filtro de entity user_permission_overrides correctamente', () => {
    const logs = [
      makeReportLog(1),
      makeRolePermLog(2),
      makeUserOverridesLog(3),
    ];
    const { component, fixture } = setup(logs);
    fixture.detectChanges();

    component.filters.entity = 'user_permission_overrides';
    component.applyFilters();

    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].entity).toBe('user_permission_overrides');
  });

  it('D3: userOverridesDetail devuelve null para entities ajenas', () => {
    const { component } = setup();
    expect(component.userOverridesDetail(makeReportLog(1))).toBeNull();
    expect(component.userOverridesDetail(makeActionPlanLog(2))).toBeNull();
    expect(component.userOverridesDetail(makeRolePermLog(3))).toBeNull();
  });

  it('D3: userOverridesDetail devuelve la estructura tipada para detail válido', () => {
    const { component } = setup();
    const parsed = component.userOverridesDetail(makeUserOverridesLog(1, {
      added: [
        { permission_code: 'audit.read', effect: 'grant' },
        { permission_code: 'roles.read', effect: 'revoke' },
      ],
      removed: [{ permission_code: 'reports.create', effect: 'revoke' }],
      changed: [{ permission_code: 'users.read', from: 'grant', to: 'revoke' }],
      shadow: true,
    }));
    expect(parsed).not.toBeNull();
    expect(parsed!.target_user.email).toBe('editor@gobernacion.gov.co');
    expect(parsed!.added.length).toBe(2);
    expect(parsed!.removed.length).toBe(1);
    expect(parsed!.changed.length).toBe(1);
    expect(parsed!.shadow_mode_active).toBe(true);
  });

  it('D3: renderiza el título "<actor> editó overrides de <email>" para user_permission_overrides', () => {
    const { fixture } = setup([makeUserOverridesLog(1)]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    expect(text).toContain('Admin User');
    expect(text).toContain('editó overrides de');
    expect(text).toContain('editor@gobernacion.gov.co');
  });

  it('D3: renderiza los chips +A grants / -B revokes / ±C cambios', () => {
    const { fixture } = setup([makeUserOverridesLog(1, {
      added: [
        { permission_code: 'a.x', effect: 'grant' },
        { permission_code: 'b.y', effect: 'grant' },
        { permission_code: 'c.z', effect: 'revoke' },
      ],
      removed: [],
      changed: [
        { permission_code: 'd.q', from: 'grant', to: 'revoke' },
        { permission_code: 'e.r', from: 'revoke', to: 'grant' },
      ],
    })]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    expect(text).toContain('+2 grants');
    expect(text).toContain('−1 revoke');  // signo Unicode
    expect(text).toContain('±2 cambios');
  });

  it('D3: renderiza el badge "fase paralela" solo si shadow_mode_active=true', () => {
    const { fixture: fxOn } = setup([makeUserOverridesLog(1, { shadow: true })]);
    fxOn.detectChanges();
    expect((fxOn.nativeElement.textContent || '').toLowerCase()).toContain('fase paralela');

    const { fixture: fxOff } = setup([makeUserOverridesLog(2, { shadow: false })]);
    fxOff.detectChanges();
    expect((fxOff.nativeElement.textContent || '').toLowerCase()).not.toContain('fase paralela');
  });

  it('D3: expand/collapse muestra y oculta el detalle de overrides con las 4 sub-secciones', () => {
    const { fixture, component } = setup([makeUserOverridesLog(1, {
      added: [
        { permission_code: 'audit.read',     effect: 'grant' },
        { permission_code: 'reports.delete', effect: 'revoke' },
      ],
      removed: [{ permission_code: 'old.perm', effect: 'grant' }],
      changed: [{ permission_code: 'users.read', from: 'grant', to: 'revoke' }],
    })]);
    fixture.detectChanges();

    const detailEl = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[data-testid="detail-1"]');

    const before = detailEl();
    expect(before).toBeTruthy();
    expect((before as HTMLElement).hidden).toBe(true);

    component.toggleExpanded(component.paginated[0]);
    fixture.detectChanges();
    const after = detailEl();
    expect(after).toBeTruthy();
    expect((after as HTMLElement).hidden).toBe(false);

    const text = (after as HTMLElement).textContent || '';
    // Las 4 sub-secciones
    expect(text).toContain('Otorgados');
    expect(text).toContain('Revocados');
    expect(text).toContain('Cambiados');
    expect(text).toContain('Removidos');
    // Codes de cada bucket
    expect(text).toContain('audit.read');
    expect(text).toContain('reports.delete');
    expect(text).toContain('users.read');
    expect(text).toContain('old.perm');
    // Cambio from → to
    expect(text).toContain('grant');
    expect(text).toContain('revoke');
    // Línea informativa "Aplicado a ..."
    expect(text).toContain('Aplicado a:');
    expect(text).toContain('editor@gobernacion.gov.co');
  });

  it('D3: expand de un log de overrides no afecta a otros logs', () => {
    const { component } = setup();
    const a = makeUserOverridesLog(1);
    const b = makeUserOverridesLog(2);
    component.toggleExpanded(a);
    expect(component.isExpanded(a)).toBe(true);
    expect(component.isExpanded(b)).toBe(false);
  });

  it('D3: fallback genérico cuando entity=user_permission_overrides pero detail corrupto', () => {
    const corrupted = makeUserOverridesLog(1, { badDetail: '{ broken' });
    const { fixture } = setup([corrupted]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    // No debe rendear el título especial
    expect(text).not.toContain('editó overrides de');
    // El detail crudo aparece (truncate)
    expect(text).toContain('{ broken');
  });

  it('D3: entityLabel mapea user_permission_overrides → "Overrides"', () => {
    const { component } = setup();
    expect(component.entityLabel('user_permission_overrides')).toBe('Overrides');
  });

  it('D3: entityBadgeClass usa violet para user_permission_overrides', () => {
    const { component } = setup();
    expect(component.entityBadgeClass('user_permission_overrides')).toContain('violet');
  });

  it('D3: entityIconName devuelve "user-cog" para user_permission_overrides', () => {
    const { component } = setup();
    expect(component.entityIconName('user_permission_overrides')).toBe('user-cog');
  });

  it('D3: filterByEffect parte la lista por grant/revoke', () => {
    const { component } = setup();
    const items: OverrideItem[] = [
      { permission_code: 'a', effect: 'grant'  },
      { permission_code: 'b', effect: 'revoke' },
      { permission_code: 'c', effect: 'grant'  },
    ];
    expect(component.filterByEffect(items, 'grant').map(i => i.permission_code)).toEqual(['a', 'c']);
    expect(component.filterByEffect(items, 'revoke').map(i => i.permission_code)).toEqual(['b']);
  });

  // ─── Backward compat con D2 ──────────────────────────────────────────────

  it('D3 no regresiona: render de role_permissions (D2) sigue intacto', () => {
    const { fixture } = setup([makeRolePermLog(1)]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    expect(text).toContain('editó el rol');
    expect(text).toContain('admin');
    expect(text).not.toContain('editó overrides de');
    // Chip +N permisos (no +N grants) - D2 sigue intacto
    expect(text).toContain('+1 permiso');
  });

  it('D3 no regresiona: render genérico para report sigue funcionando sin chips de overrides', () => {
    const { fixture } = setup([makeReportLog(1)]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent || '';
    expect(text).toContain('Reporte X actualizado');
    expect(text).not.toContain('editó overrides de');
    expect(text).not.toContain('±0 cambios');
  });
});
