import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout';
import { guestGuard } from './core/guards/guest-guard';


export const routes: Routes = [

  // AUTH
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
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // APP PRIVADA
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [

      // HOME
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./layouts/dashboard-layout/dashboard-layout.routes')
            .then(m => m.DASHBOARD_LAYOUT_ROUTES),
      },

      // ✅ INFORMES COMO MÓDULO RAÍZ
      {
        path: 'records',
        loadChildren: () =>
          import('./features/records/records.routes')
            .then(m => m.RECORDS_ROUTES),
      },

      {
        path: 'users',
        loadChildren: () =>
          import('./features/users/users.routes')
            .then(m => m.USERS_ROUTES),
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  { path: '**', redirectTo: '' },
];
