# RBAC — Checklist de QA manual

Fecha: 2026-05-25
Estado: post-C7, pre-shutdown de `PERM_SHADOW_MODE`.

## Cuentas de prueba (seed `flask seed`)

| Rol     | Email                       | Password |
|---------|-----------------------------|----------|
| admin   | admin@gobernacion.gov.co    | Gob2025* |
| editor  | editor@gobernacion.gov.co   | Gob2025* |
| viewer  | viewer@gobernacion.gov.co   | Gob2025* |
| monitor | crear via `/users` si no está en seed | Gob2025* |

> Para escenarios de override granular se requiere insertar registros en `user_permission_overrides` directamente por SQL (la UI admin de overrides es Fase D).

---

## A. Login / Logout

- [ ] Login con credenciales válidas → redirect a `/dashboard`.
- [ ] Login con password incorrecta → toast de error; permanece en `/auth/login`.
- [ ] Login con email inexistente → toast de error.
- [ ] 9 intentos seguidos de login → 429 (rate limit backend `8/min; 30/hora`).
- [ ] Logout desde sidebar → POST `/auth/logout` + POST `/auth/logout-refresh` + limpia localStorage + redirect.
- [ ] Backend caído durante logout → la sesión local se limpia igual; navega a `/auth/login`.
- [ ] Tras logout, intentar volver con back-button del navegador → redirect a login.

## B. Refresh token

- [ ] Access próximo a expirar (<60 s): la siguiente request dispara refresh proactivo (Network: POST `/auth/refresh` antes del request real).
- [ ] Múltiples requests en paralelo cuando expira el access → un solo POST `/auth/refresh` (dedupe via `shareReplay`).
- [ ] Refresh exitoso → nuevo access persiste; `PermissionService` lo decodifica y actualiza el set.
- [ ] Refresh fallido (refresh expirado o revocado) → toast "Tu sesión ha expirado" + redirect a login.
- [ ] Backend rota el refresh: si la respuesta incluye `refresh_token`, se persiste y reemplaza el anterior.

## C. Visibilidad de menú (sidebar) por rol

Cada usuario debe ver EXACTAMENTE los items listados:

### admin (role_id=3)
- [ ] Dashboard
- [ ] Reportes PYBA → Reportes
- [ ] Reportes PYBA → Estrategias → Plan de Desarrollo
- [ ] Reportes PYBA → Componentes Estratégicos
- [ ] Bases de datos → Gestión de Base de Datos y Tablas
- [ ] Planes de acción → Calendario
- [ ] Usuarios
- [ ] Historial

### editor (role_id=2)
- [ ] Dashboard
- [ ] Reportes PYBA → Reportes
- [ ] Planes de acción → Calendario
- [ ] NO ve: Estrategias, Componentes, Bases de datos, Usuarios, Historial.

### monitor (role_id=4)
- [ ] Dashboard
- [ ] Reportes PYBA → Reportes
- [ ] Planes de acción → Calendario
- [ ] NO ve: Estrategias, Componentes, Bases de datos, Usuarios, Historial.

### viewer (role_id=1)
- [ ] Dashboard
- [ ] Reportes PYBA → Reportes
- [ ] NO ve: Planes de acción ni nada más.

## D. Guards de rutas (acceso directo por URL)

Por cada rol, intentar visitar la URL y validar redirect cuando corresponda:

| URL                          | admin | editor | monitor | viewer |
|------------------------------|:-----:|:------:|:-------:|:------:|
| `/users`                     | OK    | →/dash | →/dash  | →/dash |
| `/datasets`                  | OK    | →/dash | →/dash  | →/dash |
| `/audit-history`             | OK    | →/dash | →/dash  | →/dash |
| `/reports/strategies`        | OK    | →/dash | →/dash  | →/dash |
| `/reports/components`        | OK    | →/dash | →/dash  | →/dash |
| `/reports/create`            | OK    | OK     | OK      | →/dash |
| `/reports/new?activityId=X`  | OK    | OK     | OK      | →/dash |
| `/reports/:id/edit`          | OK    | OK     | OK      | →/dash |
| `/action-plans/calendar`     | OK    | OK     | OK      | →/dash |
| `/action-plans/dashboard`    | OK    | OK ⚠️  | OK      | →/dash |
| `/users/me`                  | OK    | OK     | OK      | →/dash |

⚠️ Editor accede a `/action-plans/dashboard` por gap conocido — ver `RBAC_DASHBOARD_GAP_FIX.md`.

## E. Botones / acciones por rol (UI-level con `*appCan`)

### Reportes (`/reports`)
- [ ] admin/editor/monitor: ven "Crear reporte".
- [ ] viewer: NO ve "Crear reporte".
- [ ] admin: ve editar/eliminar en cualquier fila.
- [ ] editor/monitor: ve editar/eliminar SÓLO en sus propios reportes (ownership).
- [ ] viewer: no ve botones de acción.

### Reporte detalle (`/reports/:id`)
- [ ] admin/editor/monitor: ven enlace "Abrir evidencia" si `evidence_link` es URL válida.
- [ ] viewer: no ve enlace de evidencia.
- [ ] El enlace NO aparece si `evidence_link` es vacío o inválido (control no-auth se mantiene).

### Planes de acción (`/action-plans/calendar`)
- [ ] admin: ve editar/eliminar/reportar en cualquier plan/actividad.
- [ ] editor: ve editar/reportar SÓLO en sus planes (`user_id === currentUser.id` o es responsable de la actividad).
- [ ] monitor: ve editar SÓLO en sus planes; puede reportar si es responsable.
- [ ] viewer: ve lectura; ningún botón de acción.
- [ ] Status "Realizado" siempre permite abrir detalle (read-only) sin importar rol.

### Action plan edit modal — botón "Eliminar plan"
- [ ] admin: visible siempre.
- [ ] editor/monitor: visible SÓLO si el usuario actual creó el plan (`user_id`).
- [ ] viewer: oculto.

### Usuarios (`/users`)
- [ ] admin: ve listado, crear, editar, eliminar.
- [ ] Admin principal (flag `is_main_admin` o email `admin@gobernacion.gov.co`): badge "PRINCIPAL"; botón eliminar oculto; al editar, campos email/password/role deshabilitados; botón submit reemplazado por "Sin permisos para modificar".
- [ ] Crear usuario nuevo con rol viewer → guardar → aparece en listado con badge zinc.

### Map detail (dashboard de mapa)
- [ ] viewer: NO ve la sección de evidencia.
- [ ] otros roles: la ven.

## F. CRUDs end-to-end

Por cada CRUD ejecutar con admin Y con el rol más permisivo no-admin:

### Reportes
- [ ] admin: crea → aparece en listado → edita → elimina.
- [ ] editor: crea uno propio → puede editarlo y eliminarlo.
- [ ] editor intenta editar ajeno: botones no aparecen; intento por URL `/reports/:id/edit` lo deja entrar (`viewerGuard` pasa) pero backend devuelve 403 al guardar.

### Planes de acción
- [ ] admin: crea plan → asigna responsables → reporta actividad → adjunta evidencia.
- [ ] editor: crea plan propio → reporta su actividad → adjunta evidencia dentro de la ventana de 8 días.
- [ ] editor intenta reportar plan ajeno: backend 403.

### Datasets (solo admin)
- [ ] admin sube Excel válido → aparece en listado.
- [ ] admin abre tabla → ve registros tipados por dashboard del tipo.
- [ ] admin elimina dataset → desaparece.

### Usuarios (solo admin)
- [ ] admin crea usuario → asigna rol + componentes → guardar.
- [ ] admin edita usuario → cambia rol o componentes → guardar; el usuario afectado debe re-login para ver el cambio.
- [ ] admin intenta eliminar al admin principal: opción no aparece.

## G. Overrides (per-user grants / revokes)

Hasta que exista UI Fase D, simular via SQL:

```sql
-- Otorgar users.read al usuario editor
INSERT INTO user_permission_overrides (user_id, permission_code, kind)
  VALUES ((SELECT id FROM users WHERE email = 'editor@gobernacion.gov.co'),
          'users.read', 'grant');

-- Revocar reports.read al usuario viewer
INSERT INTO user_permission_overrides (user_id, permission_code, kind)
  VALUES ((SELECT id FROM users WHERE email = 'viewer@gobernacion.gov.co'),
          'reports.read', 'revoke');
```

- [ ] Tras el grant, el editor (re-login) ve `/users` (read-only) pero NO la sección crear (`users.manage` ausente).
- [ ] Tras el revoke, el viewer pierde acceso a `/reports`.
- [ ] `GET /users/me/permissions` refleja el set efectivo (grants ∪ rol − revokes).
- [ ] Llamar a `permissionService.refresh()` desde DevTools (`window.ng…`) actualiza el set sin reemitir token.

## H. Expiración de sesión

- [ ] Con la app abierta, esperar a que expire el access → interceptor refresca silenciosamente; la operación continúa sin avisos.
- [ ] Esperar a que expiren access Y refresh → siguiente acción: toast "Tu sesión ha expirado" + redirect a login.
- [ ] Tras expirar, click en cualquier link del sidebar → redirect a login (NO inertes).
- [ ] Logout manual con requests in-flight → no se duplican toasts de expiración.
- [ ] `localStorage` queda limpio después del logout.

## I. Fallback JWT viejo vs nuevo

Simular un cliente con JWT pre-migración (sin claim `permissions`):

1. Login normal y guardar el `access_token` en una nota.
2. Desde DevTools, modificar el localStorage para reemplazar el access actual por un JWT sintetizado SIN el claim `permissions` (mantener `sub`, `role_id`, `exp` válidos). Patrón:
   ```js
   const tok = `${btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))}.${btoa(JSON.stringify({sub:1,role_id:3,exp:9999999999}))}.sig`;
   localStorage.setItem('access_token', tok);
   location.reload();
   ```
3. La app debe:
   - [ ] Cargar el dashboard sin error.
   - [ ] Llamar `GET /users/me/permissions` la primera vez que se invoque `permissionService.refresh()` (verificar Network).
   - [ ] Caer al fallback de rol (definido en JWT) para gates de UI hasta que el endpoint emita el set.
4. Si `/users/me/permissions` falla (forzarlo: bloquear el endpoint con DevTools throttling), el set queda vacío y SÓLO el rol decide — el menú y los guards siguen respondiendo correctamente porque el dual-mode rescata.

## J. Sanidad cross-cutting

- [ ] Cambiar el rol de un usuario via UI → el usuario debe re-login para ver el cambio (tokens cacheados).
- [ ] Probar desde dominio Netlify preview (`https://NN--gestionindicadoresgov.netlify.app`) → CORS permite.
- [ ] Inactividad > 30 min con refresh válido → al volver, la app sigue respondiendo tras refresh proactivo.
- [ ] Backend devuelve 422 con `error: token_expired` → el frontend lo interpreta como auth rejection y dispara refresh.
- [ ] `/swagger-ui` accesible (smoke del backend).
- [ ] Bundle inicial < 1 MB (warning permitido); build de producción sin errores.
