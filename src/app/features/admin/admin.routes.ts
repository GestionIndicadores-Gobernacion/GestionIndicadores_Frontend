import { Routes } from '@angular/router';

/**
 * Rutas internas del módulo admin (`/admin/...`).
 *
 * El guard `permGuard({ perms: [PERMS.ROLES_READ], fallbackRoles:
 * [ROLE_IDS.ADMIN, ROLE_IDS.MONITOR] })` está aplicado a la entrada del
 * módulo en `app.routes.ts`, no aquí, para evitar duplicación.
 *
 * En D1 solo existen las pantallas read-only de roles. La edición se
 * activará en una fase posterior (D2+).
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'roles',
    pathMatch: 'full',
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./roles-list/roles-list').then(m => m.RolesListComponent),
  },
  {
    path: 'roles/:id',
    loadComponent: () =>
      import('./role-detail/role-detail').then(m => m.RoleDetailComponent),
  },
];
