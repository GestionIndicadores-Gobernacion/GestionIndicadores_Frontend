# RBAC — Checklist de rollout a staging / producción

Aplicable cuando se promueven cambios RBAC (cualquiera de C1–C7 o el shutdown de shadow mode) desde development hacia staging y producción.

## Pre-deploy

- [ ] Tests verdes en CI: backend `pytest` (incluyendo RBAC invariants + shadow telemetry) y frontend `ng test` (14 specs RBAC, 186 tests).
- [ ] `flask seed_permissions` incluido en el deploy script (idempotente).
- [ ] Build de frontend de producción exitoso (`ng build --configuration production`).
- [ ] Migrations pendientes (`flask db upgrade`) revisadas y aprobadas.
- [ ] Verificar que `PERM_SHADOW_MODE=true` en el config del entorno destino (no se apaga en este deploy salvo que sea el deploy específico de shutdown).
- [ ] `RBAC_C7_INVENTORY.md` actualizado y refleja el estado a deployar.
- [ ] Snapshot/backup de la BD de producción.

## Orden recomendado de deploy

**Backend primero, frontend después.** Justificación:

- El frontend tiene dual-mode con fallback de rol → es retro-compatible con cualquier backend.
- El backend puede emitir el claim `permissions` en los JWT nuevos sin que el frontend lo use (el `PermissionService` lo ignora si está ausente).
- Desplegar frontend primero contra backend viejo no rompe nada, pero deja la suite RBAC del frontend sin ejercitar correctamente.

### Paso 1 — Backend

1. Aplicar migraciones: `flask db upgrade`.
2. Correr `flask seed_permissions` (upsert idempotente). Loggear el resultado.
3. Validar que el log indica "0 nuevos / 0 huérfanos" (o exactamente los esperados del PR).
4. Smoke API: `/swagger-ui` carga; `/api-spec.json` parsea correctamente.
5. Login de prueba: inspeccionar el JWT devuelto — debe traer claim `permissions` con el set del rol.

### Paso 2 — Frontend

1. Deploy del bundle a Netlify (o equivalente).
2. Verificar que `index.html` se sirve y los chunks se cargan.
3. Login con admin@gobernacion.gov.co; navegar a `/dashboard`.
4. Inspeccionar `localStorage.access_token` → JWT debe traer `permissions`.
5. Verificar en Network que NO se llama `GET /users/me/permissions` en este flujo (el set se hidrata desde el JWT directamente).

## Validaciones post-deploy

Ejecutar los pasos A–J del **RBAC_QA_CHECKLIST.md** con los 4 roles. Foco mínimo:

- [ ] Cada rol ve su menú correcto (sección C).
- [ ] Cada rol pasa/rechaza las rutas críticas (sección D).
- [ ] Login y logout limpios para cada rol.
- [ ] Un editor crea un reporte, sube evidencia y reporta una actividad.
- [ ] Admin entra a `/users`, `/datasets`, `/audit-history`.
- [ ] Logs estructurados del backend: `RBAC_SHADOW_DIVERGENCE` debe ser **0** durante el smoke.

## Qué monitorear (24–48 h post-deploy)

| Métrica                                        | Umbral verde       | Umbral alerta            |
|------------------------------------------------|--------------------|--------------------------|
| `RBAC_SHADOW_DIVERGENCE` logs/h                | 0                  | ≥ 1                      |
| HTTP 403 rate por endpoint                     | < 1% del baseline  | ≥ 2× del baseline        |
| Login success rate                             | > 99%              | < 95%                    |
| JWT decode failures (frontend Sentry/console)  | 0                  | cualquiera               |
| `POST /auth/refresh` 401 rate                  | < 0.5%             | > 2%                     |
| Tiempo de `flask seed_permissions` en startup  | sin cambios        | +50%                     |

## Señales de divergencia rol vs permisos

`RBAC_SHADOW_DIVERGENCE` se emite cuando la decisión por rol y la decisión por permisos no coinciden en un endpoint con `dual_required`. Tipos:

- **"Rol concede / perm niega"** (típico de migración incompleta). Causa probable: el rol no tiene el perm asignado en `role_permissions`, o el JWT está cacheado pre-migración en clientes.
  - Acción: re-ejecutar `flask seed_permissions`; pedir al usuario afectado que cierre sesión y vuelva a entrar; auditar `role_permissions` de ese rol.
- **"Perm concede / rol niega"** (raro y esperado). Causa: override granular que amplía el acceso de un usuario fuera de su rol estándar.
  - Acción: NO alertar. Sólo telemetría.

## Rollback plan

### Rollback frontend
- Trivial: redeploy del bundle anterior desde el panel de Netlify (`Deploys → Restore`).
- No requiere coordinar con backend porque el frontend es stateless + dual-mode.
- Tiempo estimado: < 5 minutos.

### Rollback backend
- Si las migraciones son backwards-compatible (todas las de Fase A–C lo son): `git revert` del commit + redeploy. Las tablas `permissions`, `role_permissions`, `user_permission_overrides` permanecen pero el código las ignora.
- Si una migración drop tabla/columna en uso: `flask db downgrade` al revision previo + redeploy.
- **Importante**: NO conviene rollback del backend si el frontend ya está en una versión que asume el nuevo claim `permissions` en JWT. Pero como dual-mode protege, no rompe — sólo deja la suite RBAC frontend sin ejercitar.

### Hard rollback (incidente serio)
1. Frontend → restore deploy previo.
2. Backend → `git revert` + redeploy.
3. JWTs ya emitidos NO necesitan invalidarse manualmente: expirarán solos en ≤ 24 h y, mientras tanto, el `PermissionService` los procesa con el shape que conoce.
4. Postmortem: revisar `RBAC_SHADOW_DIVERGENCE` previo al rollback para identificar la divergencia que disparó el incidente.

## Comunicación

- [ ] Anunciar a usuarios admin antes del deploy: "Cambios RBAC; si experimentás algo raro, cierra sesión y vuelve a entrar".
- [ ] Documentar la versión deployada en el canal compartido (Slack, etc.).
- [ ] Tras 48 h estables, marcar la versión como "promoted" en el changelog interno.
