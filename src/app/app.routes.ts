import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

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
        canActivate: [adminGuard],
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

      // USUARIOS (SOLO ADMIN) — sigue igual
      {
        path: 'users',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/user/users.routes')
            .then(m => m.USERS_ROUTES),
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
