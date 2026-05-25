# Plan de apagado de `PERM_SHADOW_MODE`

Aplicable cuando se completaron las validaciones de paridad y se decide promover los permisos a fuente de verdad autoritativa, retirando la compatibilidad por rol.

## Prerequisitos (hard gates)

Cada uno DEBE cumplirse antes de proceder:

1. **0 divergencias en producción durante 7 días consecutivos.** Métrica: count de logs `RBAC_SHADOW_DIVERGENCE` = 0 en la ventana móvil de 7 días.
2. **Cobertura de tráfico**: cada endpoint con `dual_required` fue ejercitado por al menos 1 usuario de cada rol durante esos 7 días. Verificar con telemetría de hit-count o logs de acceso.
3. **`flask seed_permissions` aplicado** en el último deploy con resultado "0 huérfanos / 0 nuevos pendientes".
4. **Catálogo congelado**: ningún PR mergeado modifica `app/shared/permissions/catalog.py` ni `core/constants/permissions.ts` en los últimos 7 días.
5. **Frontend al día**: la versión en producción incluye todos los cambios C1–C7. Verificar contra `RBAC_C7_INVENTORY.md`.
6. **Backup** de la BD de producción justo antes del cambio.
7. **Ventana de mantenimiento** anunciada (aunque el cambio no es destructivo, conviene tenerla por si requiere rollback).

## Soft gates adicionales

- [ ] Tests backend de paridad (shadow vs perm) en CI con 0 fallas en los 7 días previos.
- [ ] PRD actualizado: Fase B → "Completa".
- [ ] 0 tickets RBAC abiertos en el board de soporte.

## Secuencia de apagado (NO saltarse pasos)

### Etapa 1 — Backend: cambio de autoritativo

1. Setear `PERM_SHADOW_MODE = False` en el config del entorno.
2. En `dual_required`, hacer que la decisión por permisos sea autoritativa (no la de rol).
3. Mantener la telemetría de divergencia activa **2 semanas más** (sólo logging, no enforcement por rol).
4. Deploy. Ejecutar QA manual checklist completo por rol.
5. Monitorear 72 h. Si aparece cualquier 403 inesperado a un usuario válido → rollback inmediato del paso 1.

### Etapa 2 — Frontend: barrido de `fallbackRoles`, fase 1 (zonas conservadoras)

Predicados con menor blast radius (siempre tienen gate también en backend):

1. `/audit-history` — `permGuard({ perms: [PERMS.AUDIT_READ] })` (quitar `fallbackRoles: [ADMIN]`).
2. `/datasets` — `permGuard({ perms: [PERMS.DATASETS_MANAGE] })`.
3. `/users` — `permGuard({ perms: [PERMS.USERS_MANAGE] })`.
4. `/reports/strategies` — `permGuard({ perms: [PERMS.STRATEGIES_MANAGE] })`.
5. `/reports/components` — `permGuard({ perms: [PERMS.COMPONENTS_MANAGE] })`.

Deploy individual o en lote, según apetito de riesgo. Monitorear 24 h entre lotes.

### Etapa 3 — Frontend: fase 2 (predicados de features)

Quitar `fallbackRoles` de los predicados migrados en C4:

6. `reports-list.isAdmin` / `isViewer` → sólo permisos.
7. `report-detail.isViewer` → sólo permisos.
8. `map-detail.isViewer` → sólo permisos.
9. Action plans: `canEditPlanBound`, `canReportActivity`, `canViewDashboard`, `canModify`, `canDeletePlan` → quitar `fallbackRoles` y dejar checks directos (`hasPermission`, `hasAny`, `hasAll`).

### Etapa 4 — Eliminar guards legacy

10. Borrar `src/app/core/guards/admin-guard.ts` y su `.spec.ts` (0 consumidores desde C7).
11. **Antes de borrar `viewerGuard`**, migrar sus consumidores actuales a `permGuard`:
    - `/users/me` → quitar el guard (el padre `authGuard` ya basta — cualquier autenticado puede ver su perfil).
    - `/action-plans` (parent) → `permGuard({ perms: [PERMS.ACTION_PLANS_READ] })`.
    - `/reports/create` y `/reports/new` → `permGuard({ perms: [PERMS.REPORTS_CREATE] })`.
    - `/reports/:id/edit` → `permGuard({ perms: [PERMS.REPORTS_UPDATE_OWN, PERMS.REPORTS_UPDATE_ANY], mode: 'any' })` (backend sigue validando ownership).
12. Borrar `viewer-guard-guard.ts` y los imports residuales.

### Etapa 5 — Eliminar API legacy en frontend

13. Eliminar `AuthService.hasRole(...)` — ya sin consumidores.
14. Refactor `PermissionService.hasPermissionOrRole(code, roleId, ...fb)` → `hasPermission(code)` con firma reducida. Eliminar usos que pasaban roleId/fallback.
15. Eliminar `ROLE_IDS` constant si ya no quedan referencias funcionales. Atención: `sidebar.ts` usa `role?.name` (display) — eso es harmless.
16. Eliminar el campo `roles?: number[]` de `MenuItem` y de cada item en `getMenu()`. Quitar la rama "roleGranted" de `MenuService.canShow`.
17. Eliminar el input `appCanFallbackRole` del `*appCan` directive y todas sus apariciones en templates.

### Etapa 6 — Limpiar fallbacks de modelo

18. Eliminar el fallback al email canónico en `users-list.isMainAdmin` y `user-form.isMainAdmin`. Usar exclusivamente `user.is_main_admin`.
    - Prerequisito específico: query SQL en producción que confirme que TODOS los usuarios con `email = 'admin@gobernacion.gov.co'` tienen `is_main_admin = true`.

### Etapa 7 — Backend: retirar telemetría dual

19. Eliminar `dual_required` y reemplazar usos por `require_permission` directo.
20. Eliminar el log `RBAC_SHADOW_DIVERGENCE` (ya no relevante).
21. Eliminar el config flag `PERM_SHADOW_MODE`.

## Qué borrar primero vs último

| Orden    | Acción                                                       | Riesgo |
|----------|--------------------------------------------------------------|--------|
| Primero  | Cambiar `PERM_SHADOW_MODE = False` + autoritativo en backend (etapa 1) | Alto — única acción que afecta semántica de runtime |
| Temprano | Borrar `admin-guard.ts` (0 consumidores)                     | Nulo |
| Medio    | Quitar `fallbackRoles` por ruta (etapas 2–3)                 | Bajo — cada cambio es localizable |
| Tarde    | Migrar `viewerGuard` + borrar (etapa 4)                       | Medio — toca 4 rutas |
| Último   | Borrar `hasRole`, refactor `hasPermissionOrRole`, eliminar `MenuItem.roles` (etapas 5–6) | Bajo si previas pasaron limpio |
| Final    | Eliminar `dual_required` y telemetría en backend (etapa 7)   | Nulo tras 2 semanas estables |

## Salidas y validaciones

- Tras etapa 1 → re-ejecutar `RBAC_QA_CHECKLIST.md` completo.
- Tras cada etapa de frontend (2, 3, 4) → smoke por rol de las rutas afectadas.
- Tras etapa 7 → renombrar `RBAC_C7_INVENTORY.md` a `RBAC_POST_SHADOW.md` y dejar sólo el estado actual (sin secciones "legacy" ni "removable").

## Rollback de cada etapa

- Etapa 1: flip `PERM_SHADOW_MODE = True` + revertir cambio de autoritativo + redeploy backend.
- Etapas 2–6: revertir el commit frontend; sin necesidad de tocar backend.
- Etapa 7: revertir el commit backend; las tablas siguen en sync.
