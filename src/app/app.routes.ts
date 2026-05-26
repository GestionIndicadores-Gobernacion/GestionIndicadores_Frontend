import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';
import { permGuard } from './core/guards/perm-guard';
import { PERMS, ROLE_IDS } from './core/constants/permissions';

import { AuthLayoutComponent } from './layout/auth-layout/auth-layout';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout';
import { viewerGuard } from './core/guards/viewer-guard-guard';

export const routes: Routes = [

  // =========================
  // 🔓 AUTH
  // =========================
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/login/login')
            .then(m => m.LoginComponent),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },

  // =========================
  // 🔐 APP PRIVADA
  // =========================
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [

      // HOME / DASHBOARD
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./layout/dashboard-layout/dashboard-layout.routes')
            .then(m => m.DASHBOARD_LAYOUT_ROUTES),
      },

      // ✅ RUTA INDEPENDIENTE — antes de 'users' para tener precedencia
      {
        path: 'users/me',
        loadComponent: () =>
          import('./features/user/my-profile/my-profile')
            .then(m => m.MyProfileComponent),
        // authGuard ya cubre toda esta sección via canActivateChild
        // viewerGuard bloquea solo rol 4
        canActivate: [viewerGuard],
      },

      // INFORMES
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/report/reports/reports.routes')
            .then(m => m.REPORTS_ROUTES),
      },
      {
        path: 'datasets',
        canActivate: [permGuard({ perms: [PERMS.DATASETS_READ, PERMS.DATASETS_MANAGE], fallbackRoles: [ROLE_IDS.ADMIN] })],
        loadChildren: () =>
          import('./features/datasets/datasets.routes')
            .then(m => m.DATASETS_ROUTES),
      },
      {
        path: 'action-plans',
        canActivate: [viewerGuard],
        loadChildren: () =>
          import('./features/action-plans/action-plans.routes')
            .then(m => m.ACTION_PLANS_ROUTES),
      },

      // ADMINISTRACIÓN — Roles y permisos (solo admin)
      {
        path: 'admin',
        canActivate: [permGuard({
          perms: [PERMS.ROLES_MANAGE],
          fallbackRoles: [ROLE_IDS.ADMIN],
        })],
        loadChildren: () =>
          import('./features/admin/admin.routes')
            .then(m => m.ADMIN_ROUTES),
      },

      // USUARIOS (SOLO ADMIN)
      {
        path: 'users',
        canActivate: [permGuard({ perms: [PERMS.USERS_MANAGE], fallbackRoles: [ROLE_IDS.ADMIN] })],
        loadChildren: () =>
          import('./features/user/users.routes')
            .then(m => m.USERS_ROUTES),
      },

      // HISTORIAL (SOLO ADMIN)
      {
        path: 'audit-history',
        canActivate: [permGuard({ perms: [PERMS.AUDIT_READ], fallbackRoles: [ROLE_IDS.ADMIN] })],
        loadChildren: () =>
          import('./features/audit-history/audit-history.routes')
            .then(m => m.AUDIT_HISTORY_ROUTES),
      },

      // SOPORTE — Centro de tickets (SOLO ADMIN)
      {
        path: 'support',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/support/support.routes')
            .then(m => m.SUPPORT_ROUTES),
      },

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // =========================
  // ❌ NOT FOUND
  // =========================
  {
    path: '**',
    redirectTo: '',
  },
];
