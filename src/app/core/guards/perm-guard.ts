import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { PermCode, RoleId } from '../constants/permissions';

export interface PermGuardOptions {
  /** Permisos requeridos. Si `mode='any'` basta uno; si 'all' deben todos. */
  perms: ReadonlyArray<PermCode>;
  /** Default: 'any'. */
  mode?: 'any' | 'all';
  /**
   * Roles que conceden acceso aunque el set de permisos no lo haga (modo
   * dual durante Fase C). Vacío => sólo permisos.
   */
  fallbackRoles?: ReadonlyArray<RoleId>;
  /** Ruta a la que redirigir si no autorizado. Default: '/dashboard'. */
  redirectTo?: string;
}

export function permGuard(opts: PermGuardOptions): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const perms = inject(PermissionService);

    if (!auth.isAuthenticated()) {
      auth.handleExpiredSession('expired');
      return false;
    }

    const roleId = auth.getTokenPayload()?.role_id ?? null;
    const fb = opts.fallbackRoles ?? [];
    const codes = opts.perms;

    const granted = (opts.mode === 'all')
      ? codes.every(c => perms.hasPermissionOrRole(c, roleId, ...fb))
      : codes.some(c => perms.hasPermissionOrRole(c, roleId, ...fb));

    if (!granted) {
      router.navigate([opts.redirectTo ?? '/dashboard']);
      return false;
    }
    return true;
  };
}
