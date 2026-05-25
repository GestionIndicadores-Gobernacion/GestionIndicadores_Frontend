import { PERMS, ALL_PERMISSION_CODES, ROLE_IDS, PermCode } from './permissions';

/**
 * Snapshot literal extraído de
 * `GestionIndicadores_Backend/app/shared/permissions/catalog.py`
 * (valores de las constantes `PERM_*`). Si el backend cambia, este
 * snapshot debe actualizarse de la mano y los tests fallarán hasta
 * que ambos catálogos vuelvan a coincidir.
 */
const BACKEND_PERMISSION_CODES_SNAPSHOT: readonly string[] = [
  'users.read_basic',
  'users.read',
  'users.manage',
  'users.assign_components',
  'users.manage_permissions',
  'roles.read',
  'roles.manage',
  'audit.read',
  'strategies.manage',
  'components.manage',
  'strategy_metrics.manage',
  'public_policies.manage',
  'datasets.read',
  'datasets.manage',
  'datasets.import',
  'reports.create',
  'reports.read',
  'reports.update_own',
  'reports.update_any',
  'reports.delete_own',
  'reports.delete_any',
  'action_plans.create',
  'action_plans.read',
  'action_plans.update_own',
  'action_plans.update_any',
  'action_plans.delete_own',
  'action_plans.delete_any',
  'action_plans.report_activity',
  'action_plans.add_evidence',
  'action_plans.dashboard',
];

describe('permissions catalog', () => {
  describe('ALL_PERMISSION_CODES', () => {
    it('no contiene duplicados', () => {
      expect(new Set(ALL_PERMISSION_CODES).size).toBe(ALL_PERMISSION_CODES.length);
    });

    it('tiene exactamente 30 permisos', () => {
      expect(ALL_PERMISSION_CODES.length).toBe(30);
    });

    it('cada code respeta el formato <modulo>.<accion> en minúsculas', () => {
      const pattern = /^[a-z_]+\.[a-z_]+$/;
      for (const code of ALL_PERMISSION_CODES) {
        expect(code).toMatch(pattern);
        expect(code).toBe(code.toLowerCase());
      }
    });

    it('está congelado (Object.isFrozen)', () => {
      expect(Object.isFrozen(ALL_PERMISSION_CODES)).toBe(true);
    });
  });

  describe('PERMS ↔ ALL_PERMISSION_CODES', () => {
    it('cada valor de PERMS aparece en ALL_PERMISSION_CODES', () => {
      const codes = new Set<PermCode>(ALL_PERMISSION_CODES);
      for (const value of Object.values(PERMS)) {
        expect(codes.has(value)).toBe(true);
      }
    });

    it('cada code de ALL_PERMISSION_CODES está en PERMS', () => {
      const permValues = new Set<string>(Object.values(PERMS));
      for (const code of ALL_PERMISSION_CODES) {
        expect(permValues.has(code)).toBe(true);
      }
    });

    it('PERMS y ALL_PERMISSION_CODES tienen el mismo tamaño', () => {
      expect(Object.keys(PERMS).length).toBe(ALL_PERMISSION_CODES.length);
    });
  });

  describe('paridad con backend (catalog.py)', () => {
    it('snapshot del backend tiene 30 codes', () => {
      expect(BACKEND_PERMISSION_CODES_SNAPSHOT.length).toBe(30);
    });

    it('ALL_PERMISSION_CODES coincide exactamente con el snapshot del backend', () => {
      const frontSet = new Set<string>(ALL_PERMISSION_CODES);
      const backSet = new Set<string>(BACKEND_PERMISSION_CODES_SNAPSHOT);

      const missingInFront = [...backSet].filter((c) => !frontSet.has(c));
      const extraInFront = [...frontSet].filter((c) => !backSet.has(c));

      const diff = {
        missingInFront,
        extraInFront,
      };

      expect(
        missingInFront.length === 0 && extraInFront.length === 0,
        `Divergencia frontend ↔ backend en catálogo de permisos: ${JSON.stringify(diff, null, 2)}`,
      ).toBe(true);

      expect(frontSet).toEqual(backSet);
    });
  });

  describe('ROLE_IDS', () => {
    it('tiene exactamente 4 entradas', () => {
      expect(Object.keys(ROLE_IDS).length).toBe(4);
    });

    it('los IDs son únicos', () => {
      const ids = Object.values(ROLE_IDS);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('los IDs son enteros del 1 al 4', () => {
      const ids = Object.values(ROLE_IDS);
      const sorted = [...ids].sort((a, b) => a - b);
      expect(sorted).toEqual([1, 2, 3, 4]);
      for (const id of ids) {
        expect(typeof id).toBe('number');
        expect(Number.isInteger(id)).toBe(true);
      }
    });

    it('todas las claves esperadas están presentes', () => {
      expect(Object.keys(ROLE_IDS).sort()).toEqual(['ADMIN', 'EDITOR', 'MONITOR', 'VIEWER']);
    });
  });
});
