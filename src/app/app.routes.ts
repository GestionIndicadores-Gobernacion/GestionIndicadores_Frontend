import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout';

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
          import('./layouts/dashboard-layout/dashboard-layout.routes')
            .then(m => m.DASHBOARD_LAYOUT_ROUTES),
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
        loadChildren: () =>
          import('./features/datasets/datasets.routes')
            .then(m => m.DATASETS_ROUTES),
      },

      // USUARIOS (SOLO ADMIN)
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
