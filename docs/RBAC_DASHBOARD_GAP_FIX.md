# Fix: gap en `/action-plans/dashboard`

## Diagnóstico

**Síntoma**: la ruta `/action-plans/dashboard` está protegida sólo por `viewerGuard` (heredado del padre `/action-plans`). Editor y monitor pueden navegar por URL directa aunque la UI sólo muestre el botón a admin y monitor.

**Comportamiento previo a C4**: idéntico. La lógica `canViewDashboard = role === 'admin' || role === 'monitor'` gateaba sólo el botón. Cualquier no-viewer que escribiera la URL entraba. Es un **gap pre-existente, NO una regresión** introducida por la migración.

**Quién es afectado**:
- **editor** (rol 2): entra por URL aunque la UI no le ofrece el link.
- **viewer** (rol 1): bloqueado por `viewerGuard` (sin cambio).
- **admin** (rol 3) y **monitor** (rol 4): acceso intencionado.

**Severidad**: media. El componente del dashboard lee datos agregados que no son sensibles per se, pero la intención del producto era restringirlo a admin + monitor.

## Fix mínimo seguro

Aplicar `permGuard` específico al child route `/action-plans/dashboard`. El parent `viewerGuard` queda intacto (sigue bloqueando viewer); el child añade la restricción adicional.

### Diff propuesto

Archivo: `GestionIndicadores_Frontend/src/app/features/action-plans/action-plans.routes.ts`

```ts
import { Routes } from '@angular/router';
import { permGuard } from '../../core/guards/perm-guard';
import { PERMS, ROLE_IDS } from '../../core/constants/permissions';

export const ACTION_PLANS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'calendar',
    pathMatch: 'full',
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./action-plan-calendar/action-plan-calendar')
        .then(m => m.ActionPlanCalendarComponent),
  },
  {
    path: 'dashboard',
    canActivate: [permGuard({
      perms: [PERMS.ACTION_PLANS_DASHBOARD],
      fallbackRoles: [ROLE_IDS.ADMIN, ROLE_IDS.MONITOR],
    })],
    loadComponent: () =>
      import('./action-plan-dashboard/action-plan-dashboard')
        .then(m => m.ActionPlanDashboardComponent),
  },
];
```

## Impacto funcional

| Rol     | Antes (estado actual)             | Después (con fix)                |
|---------|-----------------------------------|----------------------------------|
| admin   | accede                            | accede (igual)                   |
| monitor | accede                            | accede (igual)                   |
| editor  | accedía por URL directa           | bloqueado, redirect a /dashboard |
| viewer  | bloqueado                         | bloqueado (igual)                |

**¿Cambia el comportamiento histórico?** Sí — editores que conocían la URL pierden acceso. Pero:

- La UI nunca les ofreció el link → 99 % de los editores no notarán.
- Alinea acceso por URL con la intención de la UI.
- Backend NO tiene gate equivalente hoy (`canViewDashboard` viene sólo del frontend) → el fix también cerraría exfiltración de datos si el componente cargara info sensible en el futuro.

**Recomendación**: aplicar ahora; es estrictamente más seguro y coherente con la intención del producto.

## Tests sugeridos

Extender `action-plans.routes.spec.ts` (o crear uno para action-plans):

```ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ACTION_PLANS_ROUTES } from './action-plans.routes';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { PERMS, ROLE_IDS } from '../../core/constants/permissions';

function findRoute(path: string) {
  return ACTION_PLANS_ROUTES.find(r => r.path === path)!;
}

function makeAuth(roleId: number | null) {
  return {
    isAuthenticated: () => true,
    handleExpiredSession: vi.fn(),
    getTokenPayload: () => roleId == null ? null : { role_id: roleId },
  } as any;
}
function makePerms(set: string[] = []) {
  const s = new Set(set);
  return {
    hasAny: (...c: string[]) => c.length === 0 || c.some(x => s.has(x)),
    hasAll: (...c: string[]) => c.length === 0 || c.every(x => s.has(x)),
    hasPermissionOrRole: (code: string, rid: number | null, ...fb: number[]) =>
      s.has(code) || (rid != null && fb.includes(rid)),
  } as any;
}
function runGuard(roleId: number | null, perms: string[] = []) {
  const router = { navigate: vi.fn() } as any;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: makeAuth(roleId) },
      { provide: PermissionService, useValue: makePerms(perms) },
      { provide: Router, useValue: router },
    ],
  });
  const fn = (findRoute('dashboard').canActivate as any)[0];
  const result = TestBed.runInInjectionContext(() => fn({} as any, {} as any));
  return { result, router };
}

describe('ACTION_PLANS_ROUTES > dashboard guard', () => {
  it('admin → permite', () => {
    expect(runGuard(ROLE_IDS.ADMIN).result).toBe(true);
  });
  it('monitor → permite', () => {
    expect(runGuard(ROLE_IDS.MONITOR).result).toBe(true);
  });
  it('editor → bloquea + redirect a /dashboard', () => {
    const { result, router } = runGuard(ROLE_IDS.EDITOR);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
  it('viewer → bloquea (el parent viewerGuard también, este es defensa en profundidad)', () => {
    expect(runGuard(ROLE_IDS.VIEWER).result).toBe(false);
  });
  it('dual mode: roleId desconocido + ACTION_PLANS_DASHBOARD en set → permite', () => {
    expect(runGuard(99, [PERMS.ACTION_PLANS_DASHBOARD]).result).toBe(true);
  });
});
```

## Decisión

Apply now, junto con el resto de la validación operativa. Razones:

- Una sola edición (4 líneas + 2 imports).
- Cero impacto en admin y monitor (los únicos usuarios "esperados" del dashboard).
- Cierra un gap conocido y trazable en `RBAC_C7_INVENTORY.md` §5.3.
- Permite quitar el item de la sección de riesgos del inventario.

Si se prefiere postergar a la etapa 4 del shutdown plan (cuando se migran consumidores de `viewerGuard`), también es válido — el riesgo no es alto y nada bloquea esa decisión.

**No se aplicó automáticamente** en esta fase para mantener el alcance "sólo validación operativa, sin git operations". Listo para ejecutarse en un PR separado de < 10 líneas.
