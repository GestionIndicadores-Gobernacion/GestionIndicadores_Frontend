import { parseAuditDetail, parseUserOverridesAuditDetail } from './parse-audit-detail';

describe('parseAuditDetail', () => {

  const VALID = JSON.stringify({
    role: { id: 3, name: 'admin' },
    added: ['users.read_permissions'],
    removed: ['reports.delete_any'],
    before_count: 30,
    after_count: 30,
    shadow_mode_active: true,
  });

  // ─── Parse correcto del shape D2 ───────────────────────────────────────────

  it('parsea el shape canónico de Stream A', () => {
    const out = parseAuditDetail('role_permissions', VALID);
    expect(out).not.toBeNull();
    expect(out!.role).toEqual({ id: 3, name: 'admin' });
    expect(out!.added).toEqual(['users.read_permissions']);
    expect(out!.removed).toEqual(['reports.delete_any']);
    expect(out!.before_count).toBe(30);
    expect(out!.after_count).toBe(30);
    expect(out!.shadow_mode_active).toBe(true);
  });

  it('parsea added/removed vacíos como []', () => {
    const out = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'viewer' },
      added: [],
      removed: [],
      before_count: 5,
      after_count: 5,
      shadow_mode_active: false,
    }));
    expect(out).not.toBeNull();
    expect(out!.added).toEqual([]);
    expect(out!.removed).toEqual([]);
    expect(out!.shadow_mode_active).toBe(false);
  });

  // ─── Entity gating ─────────────────────────────────────────────────────────

  it('devuelve null si entity no es role_permissions', () => {
    expect(parseAuditDetail('report', VALID)).toBeNull();
    expect(parseAuditDetail('action_plan', VALID)).toBeNull();
    expect(parseAuditDetail('', VALID)).toBeNull();
    expect(parseAuditDetail(null, VALID)).toBeNull();
    expect(parseAuditDetail(undefined, VALID)).toBeNull();
  });

  // ─── Detail inválido / vacío ───────────────────────────────────────────────

  it('devuelve null si detail no es string parseable', () => {
    expect(parseAuditDetail('role_permissions', null)).toBeNull();
    expect(parseAuditDetail('role_permissions', undefined)).toBeNull();
    expect(parseAuditDetail('role_permissions', '')).toBeNull();
    expect(parseAuditDetail('role_permissions', '   ')).toBeNull();
    expect(parseAuditDetail('role_permissions', '{not-json')).toBeNull();
    expect(parseAuditDetail('role_permissions', '"just a string"')).toBeNull();
    expect(parseAuditDetail('role_permissions', '[1,2,3]')).toBeNull();
    expect(parseAuditDetail('role_permissions', 'null')).toBeNull();
  });

  // ─── Shape inesperado ──────────────────────────────────────────────────────

  it('devuelve null si falta el campo role', () => {
    const out = parseAuditDetail('role_permissions', JSON.stringify({
      added: [], removed: [], before_count: 0, after_count: 0, shadow_mode_active: false,
    }));
    expect(out).toBeNull();
  });

  it('devuelve null si role.id no es número', () => {
    const out = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 'three', name: 'admin' },
      added: [], removed: [], before_count: 0, after_count: 0, shadow_mode_active: false,
    }));
    expect(out).toBeNull();
  });

  it('devuelve null si role.name está vacío o no es string', () => {
    const a = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: '' },
      added: [], removed: [], before_count: 0, after_count: 0, shadow_mode_active: false,
    }));
    const b = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 42 },
      added: [], removed: [], before_count: 0, after_count: 0, shadow_mode_active: false,
    }));
    expect(a).toBeNull();
    expect(b).toBeNull();
  });

  it('devuelve null si added o removed no son arrays', () => {
    const a = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'admin' },
      added: 'users.read', removed: [],
      before_count: 0, after_count: 0, shadow_mode_active: false,
    }));
    const b = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'admin' },
      added: [], removed: { not: 'array' },
      before_count: 0, after_count: 0, shadow_mode_active: false,
    }));
    expect(a).toBeNull();
    expect(b).toBeNull();
  });

  it('descarta elementos no-string dentro de added/removed sin fallar', () => {
    const out = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'admin' },
      added: ['users.read', 99, null, 'roles.read'],
      removed: [true, 'reports.delete_any'],
      before_count: 0, after_count: 0, shadow_mode_active: false,
    }));
    expect(out).not.toBeNull();
    expect(out!.added).toEqual(['users.read', 'roles.read']);
    expect(out!.removed).toEqual(['reports.delete_any']);
  });

  it('devuelve null si before_count/after_count no son enteros >= 0', () => {
    const a = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'admin' },
      added: [], removed: [],
      before_count: -1, after_count: 5, shadow_mode_active: false,
    }));
    const b = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'admin' },
      added: [], removed: [],
      before_count: 5, after_count: 3.5, shadow_mode_active: false,
    }));
    const c = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'admin' },
      added: [], removed: [],
      before_count: '5', after_count: 5, shadow_mode_active: false,
    }));
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(c).toBeNull();
  });

  it('shadow_mode_active distinto de true se normaliza a false', () => {
    const t = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'admin' },
      added: [], removed: [],
      before_count: 0, after_count: 0, shadow_mode_active: 1,
    }));
    expect(t).not.toBeNull();
    expect(t!.shadow_mode_active).toBe(false);

    const u = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 1, name: 'admin' },
      added: [], removed: [],
      before_count: 0, after_count: 0,
    }));
    expect(u).not.toBeNull();
    expect(u!.shadow_mode_active).toBe(false);
  });

  it('tolera campos extra sin romper', () => {
    const out = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 3, name: 'admin', extra: 'ignored' },
      added: ['x'], removed: ['y'],
      before_count: 1, after_count: 2, shadow_mode_active: true,
      future_field: 'no problem',
      another: [1, 2, 3],
    }));
    expect(out).not.toBeNull();
    expect(out!.added).toEqual(['x']);
    expect(out!.removed).toEqual(['y']);
    expect(out!.role.id).toBe(3);
  });

  it('nunca lanza excepción frente a inputs malformados', () => {
    // Una batería de inputs adversariales que históricamente rompen
    // parsers ingenuos. Ninguno debe throwar.
    const inputs: Array<[string | null | undefined, string | null | undefined]> = [
      ['role_permissions', '{'],
      ['role_permissions', '}{'],
      ['role_permissions', 'undefined'],
      ['role_permissions', 'NaN'],
      ['role_permissions', '0'],
      ['role_permissions', 'true'],
      ['role_permissions', JSON.stringify({ role: null })],
      ['role_permissions', JSON.stringify({ role: { id: 1 } })],
      ['role_permissions', JSON.stringify({ role: { id: 1, name: 'x' }, added: null })],
      ['role_permissions', JSON.stringify([])],
      ['role_permissions' as any, 12345 as any], // detail no string
    ];
    for (const [entity, detail] of inputs) {
      expect(() => parseAuditDetail(entity, detail)).not.toThrow();
      expect(parseAuditDetail(entity, detail)).toBeNull();
    }
  });

  // ─── Backward-compat: user_permission_overrides NO debe colarse por aquí ───

  it('parseAuditDetail devuelve null para entity=user_permission_overrides (es otra función)', () => {
    const out = parseAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'editor@gobernacion.gov.co' },
      added: [{ permission_code: 'audit.read', effect: 'grant' }],
      removed: [],
      changed: [],
      shadow_mode_active: true,
    }));
    expect(out).toBeNull();
  });
});


describe('parseUserOverridesAuditDetail', () => {

  const VALID = JSON.stringify({
    target_user: { id: 5, email: 'editor@gobernacion.gov.co' },
    added:   [{ permission_code: 'audit.read', effect: 'grant' }],
    removed: [{ permission_code: 'reports.create', effect: 'revoke' }],
    changed: [{ permission_code: 'users.read', from: 'grant', to: 'revoke' }],
    shadow_mode_active: true,
  });

  // ─── Parse correcto del shape D3 ───────────────────────────────────────────

  it('parsea el shape canónico de Stream A (D3)', () => {
    const out = parseUserOverridesAuditDetail('user_permission_overrides', VALID);
    expect(out).not.toBeNull();
    expect(out!.target_user).toEqual({ id: 5, email: 'editor@gobernacion.gov.co' });
    expect(out!.added).toEqual([{ permission_code: 'audit.read', effect: 'grant' }]);
    expect(out!.removed).toEqual([{ permission_code: 'reports.create', effect: 'revoke' }]);
    expect(out!.changed).toEqual([{ permission_code: 'users.read', from: 'grant', to: 'revoke' }]);
    expect(out!.shadow_mode_active).toBe(true);
  });

  it('parsea added/removed/changed vacíos como []', () => {
    const out = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 2, email: 'viewer@gobernacion.gov.co' },
      added: [],
      removed: [],
      changed: [],
      shadow_mode_active: false,
    }));
    expect(out).not.toBeNull();
    expect(out!.added).toEqual([]);
    expect(out!.removed).toEqual([]);
    expect(out!.changed).toEqual([]);
    expect(out!.shadow_mode_active).toBe(false);
  });

  // ─── Entity gating ─────────────────────────────────────────────────────────

  it('devuelve null si entity no es user_permission_overrides', () => {
    expect(parseUserOverridesAuditDetail('role_permissions', VALID)).toBeNull();
    expect(parseUserOverridesAuditDetail('report', VALID)).toBeNull();
    expect(parseUserOverridesAuditDetail('action_plan', VALID)).toBeNull();
    expect(parseUserOverridesAuditDetail('', VALID)).toBeNull();
    expect(parseUserOverridesAuditDetail(null, VALID)).toBeNull();
    expect(parseUserOverridesAuditDetail(undefined, VALID)).toBeNull();
  });

  // ─── Detail inválido / vacío ───────────────────────────────────────────────

  it('devuelve null si detail no es string parseable', () => {
    expect(parseUserOverridesAuditDetail('user_permission_overrides', null)).toBeNull();
    expect(parseUserOverridesAuditDetail('user_permission_overrides', undefined)).toBeNull();
    expect(parseUserOverridesAuditDetail('user_permission_overrides', '')).toBeNull();
    expect(parseUserOverridesAuditDetail('user_permission_overrides', '   ')).toBeNull();
    expect(parseUserOverridesAuditDetail('user_permission_overrides', '{not-json')).toBeNull();
    expect(parseUserOverridesAuditDetail('user_permission_overrides', '"just a string"')).toBeNull();
    expect(parseUserOverridesAuditDetail('user_permission_overrides', '[1,2,3]')).toBeNull();
    expect(parseUserOverridesAuditDetail('user_permission_overrides', 'null')).toBeNull();
    expect(parseUserOverridesAuditDetail('user_permission_overrides', 12345 as any)).toBeNull();
  });

  // ─── Shape inesperado ──────────────────────────────────────────────────────

  it('devuelve null si falta target_user', () => {
    const out = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      added: [], removed: [], changed: [], shadow_mode_active: false,
    }));
    expect(out).toBeNull();
  });

  it('devuelve null si target_user.id no es número', () => {
    const out = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 'five', email: 'x@y.com' },
      added: [], removed: [], changed: [], shadow_mode_active: false,
    }));
    expect(out).toBeNull();
  });

  it('devuelve null si target_user.email está vacío o no es string', () => {
    const a = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: '' },
      added: [], removed: [], changed: [], shadow_mode_active: false,
    }));
    const b = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 42 },
      added: [], removed: [], changed: [], shadow_mode_active: false,
    }));
    expect(a).toBeNull();
    expect(b).toBeNull();
  });

  it('devuelve null si added/removed/changed no son arrays', () => {
    const a = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'x@y.com' },
      added: 'whoops', removed: [], changed: [],
      shadow_mode_active: false,
    }));
    const b = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'x@y.com' },
      added: [], removed: { not: 'array' }, changed: [],
      shadow_mode_active: false,
    }));
    const c = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'x@y.com' },
      added: [], removed: [], changed: null,
      shadow_mode_active: false,
    }));
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(c).toBeNull();
  });

  it('descarta items malformados dentro de added/removed sin fallar', () => {
    const out = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'x@y.com' },
      added: [
        { permission_code: 'audit.read', effect: 'grant' },
        { permission_code: 'no.effect' },                          // effect ausente
        { permission_code: 'bad.effect', effect: 'whatever' },     // effect inválido
        { permission_code: 42, effect: 'grant' },                  // code no-string
        'not-an-object',                                            // primitivo
        null,                                                       // null
        { permission_code: 'roles.read', effect: 'revoke' },
      ],
      removed: [
        { permission_code: '', effect: 'grant' },                   // code vacío
        { permission_code: 'reports.create', effect: 'revoke' },
      ],
      changed: [],
      shadow_mode_active: false,
    }));
    expect(out).not.toBeNull();
    expect(out!.added).toEqual([
      { permission_code: 'audit.read', effect: 'grant' },
      { permission_code: 'roles.read', effect: 'revoke' },
    ]);
    expect(out!.removed).toEqual([
      { permission_code: 'reports.create', effect: 'revoke' },
    ]);
  });

  it('descarta items malformados dentro de changed sin fallar', () => {
    const out = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'x@y.com' },
      added: [],
      removed: [],
      changed: [
        { permission_code: 'users.read', from: 'grant', to: 'revoke' },
        { permission_code: 'a', from: 'grant' },                    // falta to
        { permission_code: 'b', from: 'grant', to: 'XYZ' },         // to inválido
        { permission_code: 'c', from: 0, to: 'revoke' },            // from inválido
        { permission_code: '', from: 'grant', to: 'revoke' },       // code vacío
        { permission_code: 'audit.read', from: 'revoke', to: 'grant' },
      ],
      shadow_mode_active: true,
    }));
    expect(out).not.toBeNull();
    expect(out!.changed).toEqual([
      { permission_code: 'users.read', from: 'grant', to: 'revoke' },
      { permission_code: 'audit.read', from: 'revoke', to: 'grant' },
    ]);
  });

  it('shadow_mode_active distinto de true se normaliza a false', () => {
    const t = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'x@y.com' },
      added: [], removed: [], changed: [],
      shadow_mode_active: 1,
    }));
    expect(t).not.toBeNull();
    expect(t!.shadow_mode_active).toBe(false);

    const u = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'x@y.com' },
      added: [], removed: [], changed: [],
    }));
    expect(u).not.toBeNull();
    expect(u!.shadow_mode_active).toBe(false);
  });

  it('tolera campos extra sin romper', () => {
    const out = parseUserOverridesAuditDetail('user_permission_overrides', JSON.stringify({
      target_user: { id: 5, email: 'x@y.com', extra: 'ignored' },
      added: [{ permission_code: 'a', effect: 'grant', extra_field: 1 }],
      removed: [],
      changed: [],
      shadow_mode_active: true,
      future_field: 'no problem',
      other: [1, 2, 3],
    }));
    expect(out).not.toBeNull();
    expect(out!.added).toEqual([{ permission_code: 'a', effect: 'grant' }]);
    expect(out!.target_user.id).toBe(5);
  });

  it('nunca lanza excepción frente a inputs malformados', () => {
    const inputs: Array<[string | null | undefined, unknown]> = [
      ['user_permission_overrides', '{'],
      ['user_permission_overrides', '}{'],
      ['user_permission_overrides', 'undefined'],
      ['user_permission_overrides', 'NaN'],
      ['user_permission_overrides', '0'],
      ['user_permission_overrides', 'true'],
      ['user_permission_overrides', JSON.stringify({ target_user: null })],
      ['user_permission_overrides', JSON.stringify({ target_user: { id: 1 } })],
      ['user_permission_overrides', JSON.stringify({
        target_user: { id: 1, email: 'x@y.com' },
        added: null, removed: [], changed: [],
      })],
      ['user_permission_overrides', JSON.stringify([])],
      ['user_permission_overrides', 12345],
      ['user_permission_overrides', {}],
      ['user_permission_overrides', null],
    ];
    for (const [entity, detail] of inputs) {
      expect(() => parseUserOverridesAuditDetail(entity, detail)).not.toThrow();
      expect(parseUserOverridesAuditDetail(entity, detail)).toBeNull();
    }
  });

  // ─── Backward compat: parseAuditDetail (D2) sigue funcionando ─────────────

  it('backward compat: parseAuditDetail sigue parseando role_permissions intacto', () => {
    const out = parseAuditDetail('role_permissions', JSON.stringify({
      role: { id: 3, name: 'admin' },
      added: ['users.read_permissions'],
      removed: ['reports.delete_any'],
      before_count: 30,
      after_count: 30,
      shadow_mode_active: true,
    }));
    expect(out).not.toBeNull();
    expect(out!.role).toEqual({ id: 3, name: 'admin' });
    expect(out!.added).toEqual(['users.read_permissions']);
    expect(out!.removed).toEqual(['reports.delete_any']);
    expect(out!.shadow_mode_active).toBe(true);
  });
});
