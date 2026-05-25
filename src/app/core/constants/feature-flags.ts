/**
 * Feature flags de la app — booleanos compilados en build.
 *
 * Centraliza interruptores transitorios para que el código de negocio
 * no haga comparaciones dispersas con strings. Cada flag debe declarar
 * cuándo se elimina.
 */

/**
 * Modo paralelo (shadow) del modelo RBAC durante la Fase C de migración:
 * los cambios de permisos aún no son autoritativos. Las decisiones se
 * toman por rol mientras dure la transición.
 *
 * Mientras esté en `true`:
 *  - `/admin/roles` muestra los permisos como read-only.
 *  - `<app-shadow-mode-banner>` aparece en pantallas admin.
 *
 * Se elimina en C7 (cuando los permisos pasan a ser autoritativos en el
 * backend y se borra el `PERM_SHADOW_MODE` del backend).
 */
export const SHADOW_MODE_ENABLED = true;
