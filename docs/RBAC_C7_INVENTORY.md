# RBAC C7 — Inventario final del frontend

Fecha: 2026-05-25
Estado del backend: `PERM_SHADOW_MODE = on` (Fase B/C parcial — el rol sigue siendo autoritativo en backend; el frontend evalúa permiso primero y mantiene fallback de rol).

Convenciones del documento:
- 100% perms-only = no consulta `role_id`/`role.name` en absoluto para autorización (puede usar `role_id` para scoping no-autorizativo).
- Híbrido (dual) = consume `hasPermissionOrRole(perm, roleId, ...fallbackRoles)` o `permGuard({ perms, fallbackRoles })` o `*appCan` con `fallbackRole`.
- Legacy / role-only = pura comprobación de rol sin permisos.
- Display-only = el texto/badge del rol se muestra como información al usuario, no controla autorización.

---

## 1. Estado por archivo

### 1.1 100 % perms-only

| Archivo | Notas |
|---|---|
| `src/app/core/services/permission.service.ts` | Servicio fuente de verdad de perms. `hasPermission/hasAny/hasAll` son puros perms. `hasPermissionOrRole` y `bypassesComponentScope` se incluyen aquí porque son API explícitamente transitoria/scoping; el servicio en sí no contiene autorización legacy. |
| `src/app/core/constants/permissions.ts` | Catálogo `PERMS` + `ROLE_IDS`. No autoriza nada por sí mismo. |
| `src/app/core/guards/auth-guard.ts` | Solo verifica `isAuthenticated()`. Sin checks de rol/permiso. |
| `src/app/core/guards/guest-guard.ts` | Solo verifica ausencia de sesión. Sin checks de rol/permiso. |
| `src/app/features/datasets/datasets.routes.ts` | No declara guards propios; el padre (`app.routes.ts`) ya aplica `permGuard(DATASETS_MANAGE, fb=ADMIN)`. Sin lógica RBAC dentro del feature. |
| `src/app/features/action-plans/action-plans.routes.ts` | No declara guards propios; el padre aplica `viewerGuard`. Sin lógica RBAC propia. |
| `src/app/layout/dashboard-layout/dashboard-layout.routes.ts` | Sólo declara la ruta lazy del home dashboard; no contiene autorización. |
| `src/app/features/dashboard/home-dashboard/home-dashboard.ts` | Sin checks RBAC propios. Construye secciones desde `MenuService.canShow()` (que sí es híbrido — el filtrado se delega allí). |
| `src/app/features/report/reports/reports-list/components/reports-table/reports-table.ts` | Recibe `isViewer`/`isAdmin` como `@Input`, no consulta perms ni roles. La decisión vive en el padre. |
| `src/app/features/user/users-list/users-list.ts` | No tiene autorización por rol/perm. La protección de ruta `/users` la hace `permGuard(USERS_MANAGE, fb=ADMIN)`. El check de `isMainAdmin` no es RBAC: protege un usuario concreto. |
| `src/app/features/user/user-form/user-form.ts` | El `selectedRoleIsAdmin` mira el nombre del rol que se está editando (es contenido del formulario, no autorización del usuario logueado). |

### 1.2 Híbrido (dual mode `perm || role`)

| Archivo | Predicado / guard | Perm | Fallback rol |
|---|---|---|---|
| `src/app/app.routes.ts` | ruta `/datasets` | `DATASETS_MANAGE` | `ADMIN` |
| `src/app/app.routes.ts` | ruta `/users` | `USERS_MANAGE` | `ADMIN` |
| `src/app/app.routes.ts` | ruta `/audit-history` | `AUDIT_READ` | `ADMIN` |
| `src/app/core/guards/perm-guard.ts` | factory `permGuard({perms, fallbackRoles})` | (varía) | (varía) |
| `src/app/core/services/menu.service.ts` | `MenuService.canShow(item)` evalúa `hasAny(perms)` OR `roles.includes(role_id)` | por item | por item |
| `src/app/shared/directives/can.ts` | directiva `*appCan` con input `fallbackRole` | (varía) | (varía) |
| `src/app/layout/dashboard-layout/sidebar/sidebar.ts` | delega en `MenuService.canShow` | (varía) | (varía) |
| `src/app/features/report/reports/reports.routes.ts` | ruta `reports/strategies` | `STRATEGIES_MANAGE` | `ADMIN` |
| `src/app/features/report/reports/reports.routes.ts` | ruta `reports/components` | `COMPONENTS_MANAGE` | `ADMIN` |
| `src/app/features/report/reports/reports-list/reports-list.ts` | `isAdmin` | `REPORTS_UPDATE_ANY` | `ADMIN` |
| `src/app/features/report/reports/reports-list/reports-list.ts` | `isViewer` (negado) | `REPORTS_CREATE` | `ADMIN, EDITOR, MONITOR` |
| `src/app/features/report/reports/reports-list/reports-list.html` | `*appCan` "Nuevo reporte" botón | `REPORTS_CREATE` | `EDITOR, ADMIN, MONITOR` |
| `src/app/features/report/reports/report-detail/report-detail.ts` | `isViewer` (negado) | `REPORTS_CREATE` | `ADMIN, EDITOR, MONITOR` |
| `src/app/features/report/reports/report-detail/report-detail.html` | `*appCan` "Ver evidencia" | `REPORTS_CREATE` | `EDITOR, ADMIN, MONITOR` |
| `src/app/features/report/reports/report-form/report-form.ts` | `filterComponentsByRole` / `filterStrategiesByRole` (SCOPING, no autorización) | n/a — `bypassesComponentScope(roleId)` | ADMIN, MONITOR |
| `src/app/features/action-plans/action-plan-calendar/action-plan-calendar.ts` | `canEditPlanBound` rama "any" | `ACTION_PLANS_UPDATE_ANY` | `ADMIN` |
| `src/app/features/action-plans/action-plan-calendar/action-plan-calendar.ts` | `canEditPlanBound` rama "own" | `ACTION_PLANS_UPDATE_OWN` | `EDITOR, MONITOR` |
| `src/app/features/action-plans/action-plan-calendar/action-plan-calendar.ts` | `canReportActivity` rama "any" | `ACTION_PLANS_UPDATE_ANY` | `ADMIN` |
| `src/app/features/action-plans/action-plan-calendar/action-plan-calendar.ts` | `canReportActivity` rama "report" | `ACTION_PLANS_REPORT_ACTIVITY` | `EDITOR, MONITOR` |
| `src/app/features/action-plans/action-plan-calendar/action-plan-calendar.ts` | `canViewDashboard` | `ACTION_PLANS_DASHBOARD` | `ADMIN, MONITOR` |
| `src/app/features/action-plans/action-plan-list/action-plan-list.ts` | `canModify` rama "any" | `ACTION_PLANS_UPDATE_ANY` | `ADMIN` |
| `src/app/features/action-plans/action-plan-list/action-plan-list.ts` | `canModify` rama "own" | `ACTION_PLANS_UPDATE_OWN` | `EDITOR, MONITOR` |
| `src/app/features/action-plans/modals/action-plan-create-modal/action-plan-create-modal.ts` | scoping del select de estrategias/componentes en el modal | n/a — `bypassesComponentScope(roleId)` | ADMIN, MONITOR |
| `src/app/features/action-plans/modals/.../action-plan-edit-plan-modal.ts` | `canDeletePlan` rama "any" | `ACTION_PLANS_DELETE_ANY` | `ADMIN` |
| `src/app/features/action-plans/modals/.../action-plan-edit-plan-modal.ts` | `canDeletePlan` rama "own" | `ACTION_PLANS_DELETE_OWN` | `EDITOR, MONITOR` |
| `src/app/features/dashboard/home-dashboard/components/reports-map/components/map-detail/map-detail.ts` | `isViewer` (negado) | `REPORTS_CREATE` | `ADMIN, EDITOR, MONITOR` |

Notas:
- "scoping" no es autorización: filtra qué datos ve el usuario. Lo dejamos en Híbrido para registrarlo, pero su retirada en C7 será distinta — se quedará el helper `bypassesComponentScope` (consulta roles ADMIN/MONITOR explícitamente y no tiene paridad de permiso).

### 1.3 Legacy / role-only (pendiente migración)

| Archivo | Razón pendiente |
|---|---|
| `src/app/core/guards/admin-guard.ts` | Marcado `@deprecated`. Usa `auth.hasRole(3)`. Hoy NO está montado en ninguna ruta (las antiguas migraron a `permGuard`). Sigue exportado y testeado; eliminable cuando se retire `hasRole`. |
| `src/app/core/guards/viewer-guard-guard.ts` | Marcado `@deprecated`. Sigue activo en `/action-plans`, `/users/me`, `/reports/create`, `/reports/new`, `/reports/:id/edit`. Pendiente migrar a `permGuard` o eliminar cuando shadow mode termine. Bloquea por `hasRole(1)`. |
| `src/app/core/services/auth.service.ts` (`hasRole`) | Marcado `@deprecated`. Consumido por `adminGuard` y `viewerGuard`. Removable cuando se retiren esos guards. |
| `src/app/features/user/user-form/user-form.ts` (`isMainAdmin`, `selectedRoleIsAdmin`) | `isMainAdmin` mezcla flag backend (`is_main_admin`) con fallback a email canónico `admin@gobernacion.gov.co`. No es legacy de RBAC por rol; es un mecanismo de "no editar usuario raíz" que cuando el backend siempre emita `is_main_admin` puede simplificarse. `selectedRoleIsAdmin` mira `role?.name` pero del registro que se está editando — no autoriza, sólo decide si la sección de "componentes" se oculta. Se deja como pieza limpiable pero no es legacy RBAC clásico. |
| `src/app/features/user/users-list/users-list.ts` (`isMainAdmin`) | Mismo patrón: fallback al email canónico. No autoriza ni esconde UI por rol del usuario logueado. Cuando el backend emita `is_main_admin` consistentemente, eliminar el fallback de email. |

No se detectó ningún archivo "legacy oculto" fuera del scope auditado. Las únicas referencias a `hasRole`/`role?.name` activas en producción están listadas arriba.

### 1.4 Display-only (NO migrar — labels visuales)

| Archivo | Uso |
|---|---|
| `src/app/layout/dashboard-layout/sidebar/sidebar.ts` (`roleLabel = user.role?.name`) | Etiqueta visible bajo el nombre del usuario en el sidebar. |
| `src/app/features/user/users-list/users-list.html` (`user.role?.name === 'admin' \| 'editor' \| 'viewer' \| 'monitor'`) | Sólo decide el color del badge del rol en la tabla, y se imprime el nombre. Aplica a CADA fila listada (es el rol del registro mostrado, no del usuario logueado). Y `applyFilter` usa `u.role?.name` para que el buscador encuentre por rol. |
| `src/app/features/user/users-list/users-list.html` (`{{ user.role?.name }}`) | Etiqueta en cada fila. |
| `src/app/features/user/my-profile/my-profile.html` (`{{ user.role?.name || 'Sin rol' }}`) | Etiqueta en hero y en grid de datos personales. |
| `src/app/features/user/models/user.model.ts` | `role: RoleModel` es contrato de API; no autoriza. |
| `src/app/features/user/user-form/user-form.html` | `[(ngModel)]="form.role_id"` y `*ngIf="form.role_id && !selectedRoleIsAdmin"` — son del formulario que estás editando, no del usuario logueado. |

---

## 2. Rutas y guards

| Path | Guard aplicado | Perm exigido | Fallback rol | Riesgo |
|---|---|---|---|---|
| `/auth/login` | `guestGuard` | n/a | n/a | OK (no requiere autorización; bloquea autenticados). |
| `/` (DashboardLayout, todo bajo `/`) | `authGuard` + `canActivateChild: authGuard` | n/a | n/a | OK (sólo autenticación). |
| `/dashboard` | hereda `authGuard` | n/a | n/a | OK. |
| `/users/me` | `viewerGuard` (bloquea rol 1) | n/a (legacy) | rol 1 (viewer) excluido | **RIESGO BAJO**: hoy depende de `hasRole(1)`. Pendiente migrar; mientras shadow mode esté on no hay alternativa de perm directa para "ver mi perfil". |
| `/reports` (listado) | hereda `authGuard` | n/a | n/a | OK (acceso libre dentro de autenticados; el listado interno gateía acciones). |
| `/reports/create` | `viewerGuard` | n/a (legacy) | rol 1 excluido | **RIESGO BAJO**: idem `/users/me`. |
| `/reports/new` | `viewerGuard` | n/a (legacy) | rol 1 excluido | **RIESGO BAJO**: idem. |
| `/reports/:id/edit` | `viewerGuard` | n/a (legacy) | rol 1 excluido | **RIESGO BAJO**: idem. |
| `/reports/:id` (detalle) | hereda `authGuard` | n/a | n/a | OK. |
| `/reports/strategies` | `permGuard` | `STRATEGIES_MANAGE` | `ADMIN` | OK (híbrido). |
| `/reports/components` | `permGuard` | `COMPONENTS_MANAGE` | `ADMIN` | OK (híbrido). |
| `/datasets` | `permGuard` | `DATASETS_MANAGE` | `ADMIN` | OK (híbrido). |
| `/datasets/tables/:tableId/records` | hereda padre `permGuard` | `DATASETS_MANAGE` | `ADMIN` | OK. |
| `/action-plans` | `viewerGuard` | n/a (legacy) | rol 1 excluido | **RIESGO BAJO**: legacy; sin equivalente perm para "no-viewer". |
| `/action-plans/calendar` | hereda `viewerGuard` | idem | idem | idem. |
| `/action-plans/dashboard` | hereda `viewerGuard` (NO tiene `permGuard(ACTION_PLANS_DASHBOARD)`) | n/a | rol 1 excluido | **RIESGO MEDIO**: la ruta `/action-plans/dashboard` debería estar gateada por `ACTION_PLANS_DASHBOARD`, pero hoy cualquier no-viewer entra. La UI sí lo respeta (`canViewDashboard` en el calendar), pero acceso directo por URL queda abierto a editor/admin/monitor sin chequear el perm. Considerar añadir `permGuard({ perms: [PERMS.ACTION_PLANS_DASHBOARD], fallbackRoles: [ROLE_IDS.ADMIN, ROLE_IDS.MONITOR] })`. |
| `/users` | `permGuard` | `USERS_MANAGE` | `ADMIN` | OK (híbrido). |
| `/users/create` | hereda padre `permGuard` | `USERS_MANAGE` | `ADMIN` | OK. |
| `/users/:id/edit` | hereda padre `permGuard` | `USERS_MANAGE` | `ADMIN` | OK. |
| `/audit-history` | `permGuard` | `AUDIT_READ` | `ADMIN` | OK (híbrido). |
| `**` (catch-all) | redirect `''` | n/a | n/a | OK. |

Ninguna ruta queda gobernada exclusivamente por `hasRole` con un rol "permitir". El único patrón legacy de ruta es `viewerGuard` (que bloquea por rol) y `adminGuard` (no usado en ruta alguna actualmente — sólo exportado).

---

## 3. Auditoría de divergencias por predicado

Notación:
- "Comportamiento previo" = lo que la lógica hacía cuando se basaba sólo en rol, antes de migrar a `hasPermissionOrRole`.
- "Divergencia esperada" = qué cambia si el backend emite el set de permisos correcto vs si NO los emite (shadow mode real).

| Predicado | Perm | Fallback | Comportamiento previo (sólo rol) | Divergencia esperada |
|---|---|---|---|---|
| `reports-list.isAdmin` | `REPORTS_UPDATE_ANY` | `ADMIN` | `role?.name === 'admin'` | Ninguna si el perm sólo lo tiene admin. Si en el futuro `editor` recibiera `REPORTS_UPDATE_ANY`, el flag se activaría también para él — comportamiento deseado bajo perms-only. |
| `reports-list.isViewer` (negado) | `REPORTS_CREATE` | `ADMIN, EDITOR, MONITOR` | `role?.name === 'viewer'` (excluye los demás) | Ninguna. La lista de fallback cubre los tres roles que antes implícitamente podían crear. |
| `reports-list.html *appCan create` | `REPORTS_CREATE` | `EDITOR, ADMIN, MONITOR` | Mostrado a roles ≠ viewer | Ninguna. |
| `report-detail.isViewer` (negado) | `REPORTS_CREATE` | `ADMIN, EDITOR, MONITOR` | Mostrado a roles ≠ viewer | Ninguna. |
| `report-detail.html *appCan evidence link` | `REPORTS_CREATE` | `EDITOR, ADMIN, MONITOR` | Mostrado a roles ≠ viewer | Ninguna. |
| `map-detail.isViewer` (negado) | `REPORTS_CREATE` | `ADMIN, EDITOR, MONITOR` | Mostrado a roles ≠ viewer | Ninguna. |
| `report-form.filterComponentsByRole` (scoping) | n/a — `bypassesComponentScope` | ADMIN, MONITOR | admin/monitor ven todo; otros ven solo asignados | Ninguna. Helper sin equivalente en perms — se mantendrá. |
| `report-form.filterStrategiesByRole` (scoping) | n/a — `bypassesComponentScope` | ADMIN, MONITOR | idem | Ninguna. |
| `action-plan-calendar.canEditPlanBound` rama any | `ACTION_PLANS_UPDATE_ANY` | `ADMIN` | admin podía editar cualquier plan | Ninguna. |
| `action-plan-calendar.canEditPlanBound` rama own | `ACTION_PLANS_UPDATE_OWN` | `EDITOR, MONITOR` | editor/monitor podía editar sólo el suyo | Ninguna. Combinación `any OR (own AND es-creador)`. |
| `action-plan-calendar.canReportActivity` rama any | `ACTION_PLANS_UPDATE_ANY` | `ADMIN` | admin sobre cualquier actividad | Ninguna. |
| `action-plan-calendar.canReportActivity` rama report | `ACTION_PLANS_REPORT_ACTIVITY` | `EDITOR, MONITOR` | editor/monitor sobre actividades de las que es responsable | Ninguna. |
| `action-plan-calendar.canViewDashboard` | `ACTION_PLANS_DASHBOARD` | `ADMIN, MONITOR` | admin/monitor veían el botón | Ninguna. Pero ver §2: la ruta no aplica `permGuard` correspondiente — la UI lo respeta pero la URL queda abierta. |
| `action-plan-list.canModify` rama any | `ACTION_PLANS_UPDATE_ANY` | `ADMIN` | admin total | Ninguna. |
| `action-plan-list.canModify` rama own | `ACTION_PLANS_UPDATE_OWN` | `EDITOR, MONITOR` | creador del plan (editor/monitor) | Ninguna. |
| `action-plan-create-modal` scoping | n/a — `bypassesComponentScope` | ADMIN, MONITOR | admin/monitor ven todas; otros solo asignados | Ninguna. |
| `action-plan-edit-plan-modal.canDeletePlan` rama any | `ACTION_PLANS_DELETE_ANY` | `ADMIN` | admin total | Ninguna. |
| `action-plan-edit-plan-modal.canDeletePlan` rama own | `ACTION_PLANS_DELETE_OWN` | `EDITOR, MONITOR` | creador (editor/monitor) | Ninguna. |
| `MenuService.canShow` por item (Reportes PYBA, Reportes, Estrategias, Componentes Estratégicos, Bases de datos, Planes de acción, Usuarios, Historial) | `REPORTS_READ`, `STRATEGIES_MANAGE`, `COMPONENTS_MANAGE`, `DATASETS_MANAGE`, `ACTION_PLANS_READ`, `USERS_MANAGE`, `AUDIT_READ` | roles[] según item | Visibilidad por rol del usuario | Ninguna. Si perm está → se muestra; si no, fallback rol → se muestra; lógica OR equivalente al modelo previo. |
| `permGuard /datasets` | `DATASETS_MANAGE` | `ADMIN` | Sólo admin | Ninguna. |
| `permGuard /users` | `USERS_MANAGE` | `ADMIN` | Sólo admin | Ninguna. |
| `permGuard /audit-history` | `AUDIT_READ` | `ADMIN` | Sólo admin | Ninguna. |
| `permGuard reports/strategies` | `STRATEGIES_MANAGE` | `ADMIN` | Sólo admin | Ninguna. |
| `permGuard reports/components` | `COMPONENTS_MANAGE` | `ADMIN` | Sólo admin | Ninguna. |
| `viewerGuard` (en `/action-plans`, `/users/me`, `/reports/create|new|:id/edit`) | n/a — sólo `hasRole(1)` excluye | n/a | Bloqueaba rol viewer | **Sin perm equivalente todavía**. Migrar requiere decidir qué perm representa "no viewer" o crear `permGuard` con `hasAny(ACTION_PLANS_READ, REPORTS_CREATE, ...)`. Hoy es legacy puro pero coincide funcionalmente con la lógica previa. |
| `adminGuard` | n/a — `hasRole(3)` | n/a | Sólo admin | **No usado en ninguna ruta**, deprecado. Sin divergencia (muerto). |

---

## 4. Removable cuando `PERM_SHADOW_MODE` se apague

Lista priorizada — en orden seguro de eliminación:

1. [ ] `fallbackRoles: [ROLE_IDS.ADMIN]` en `permGuard({ perms: [PERMS.DATASETS_MANAGE], ... })` en `src/app/app.routes.ts`.
2. [ ] `fallbackRoles: [ROLE_IDS.ADMIN]` en `permGuard({ perms: [PERMS.USERS_MANAGE], ... })` en `src/app/app.routes.ts`.
3. [ ] `fallbackRoles: [ROLE_IDS.ADMIN]` en `permGuard({ perms: [PERMS.AUDIT_READ], ... })` en `src/app/app.routes.ts`.
4. [ ] `fallbackRoles: [ROLE_IDS.ADMIN]` en `permGuard` de `reports/strategies` y `reports/components` (`src/app/features/report/reports/reports.routes.ts`).
5. [ ] Argumentos `...fallbackRoleIds` en TODAS las llamadas a `hasPermissionOrRole(...)` listadas en §1.2 (reports-list, report-detail, map-detail, action-plan-calendar, action-plan-list, action-plan-edit-plan-modal). Tras esta refactor, esos componentes pueden llamar directamente a `hasPermission`/`hasAny`/`hasAll`.
6. [ ] Atributo `appCanFallbackRole` en `*appCan` (`reports-list.html`, `report-detail.html`). Eliminar también la propiedad `_fallbackRoles` y la rama del `update()` en `src/app/shared/directives/can.ts`.
7. [ ] `roles?: number[]` y `roleGranted` en `MenuService.canShow()` (`src/app/core/services/menu.service.ts`). Quedará sólo `permGranted`.
8. [ ] `MenuItem.roles` de la interfaz y de los items del menú — todos pasan a sólo `perms`.
9. [ ] Migrar `viewerGuard` → `permGuard({ perms: [...alguno que cubra no-viewer...] })` en las 4 rutas que lo usan (`/users/me`, `/action-plans`, `/reports/create`, `/reports/new`, `/reports/:id/edit`). Eliminar `src/app/core/guards/viewer-guard-guard.ts`.
10. [ ] Eliminar `src/app/core/guards/admin-guard.ts` (ya no se usa en ninguna ruta; sólo se importa en sus tests).
11. [ ] Eliminar `AuthService.hasRole(...)` en `src/app/core/services/auth.service.ts` y la entrada en `JwtPayload.role` (mantener `role_id` porque sigue siendo útil para scoping `bypassesComponentScope`).
12. [ ] Refactor de `hasPermissionOrRole` en `src/app/core/services/permission.service.ts` — convertir en alias deprecado de `hasPermission` y eventualmente eliminar.
13. [ ] Specs derivados: actualizar `admin-guard.spec.ts`, `reports.routes.spec.ts`, `reports-list.auth.spec.ts`, `map-detail.auth.spec.ts`, `action-plans.auth.spec.ts`, `report-form.scope.spec.ts`, `can.spec.ts`, `perm-guard.spec.ts`, `menu.service.spec.ts` cuando se quite el modo dual.

NO eliminar (no son shadow-mode):
- `PermissionService.bypassesComponentScope(roleId)` — es scoping (admin/monitor ven todo) y no tiene paridad de permiso. Permanece.
- `ROLE_IDS` constants — usados por `bypassesComponentScope` y por specs.
- `AuthService.getTokenPayload().role_id` — fuente del scoping, no autorización.
- Labels visuales de §1.4 — `user.role?.name` para badges, `roleLabel` en sidebar, `is_main_admin` (no es RBAC, es protección de cuenta raíz).

Pieza separada pero relacionada (cuando backend lo permita):
- [ ] `UserModel.is_main_admin` siempre presente desde backend → eliminar fallback al email canónico `admin@gobernacion.gov.co` en `users-list.ts::isMainAdmin` y `user-form.ts::isMainAdmin`. No es shadow mode; es endurecer el contrato backend → frontend.

---

## 5. Próximos pasos

### 5.1 Para apagar shadow mode (lado backend)

1. Asegurar que `role_permissions` cubre el catálogo completo para los 4 roles del sistema (`admin`, `editor`, `monitor`, `viewer`) — comparar contra los permisos que actualmente sirven de fallback en cada predicado documentado en §3.
2. Confirmar que el JWT emite `permissions: [...]` siempre (login + refresh) y que el endpoint `GET /users/me/permissions` devuelve el set completo.
3. Apagar `PERM_SHADOW_MODE`: la decisión pasa a ser autoritativamente por permisos en backend (los decorators `dual_required` colapsan a `permission_required`).

### 5.2 Para apagar shadow mode (lado frontend, tras §5.1)

Aplicar los pasos 1→13 de §4 en orden. Cada batch se puede mergear independiente porque la API `hasPermissionOrRole(code, roleId, ...fallback)` es retro-compatible con `...fallback = []` (degrada a `hasPermission`).

### 5.3 Tarea independiente (no bloquea apagar shadow mode)

Cerrar el agujero de `/action-plans/dashboard` (§2, RIESGO MEDIO): añadir guard explícito `permGuard({ perms: [PERMS.ACTION_PLANS_DASHBOARD], fallbackRoles: [ROLE_IDS.ADMIN, ROLE_IDS.MONITOR] })` a esa ruta en `src/app/features/action-plans/action-plans.routes.ts`.
