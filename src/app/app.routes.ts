import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout';
import { adminGuard } from './core/guards/admin-guard';


export const routes: Routes = [

  // AUTH AREA  -----------------------------
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login')
            .then(m => m.LoginComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // APP AREA (PROTEGIDA)  -----------------
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [

      // Dashboard Home
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/home-dashboard/home-dashboard')
            .then(m => m.HomeDashboardComponent),
      },

      // Indicators
      {
        path: 'indicators',
        loadChildren: () =>
          import('./features/indicators/indicators.routes')
            .then(m => m.INDICATORS_ROUTES),
      },

      // Components Estratégicos
      {
        path: 'components',
        loadChildren: () =>
          import('./features/componentes/componentes.routes')
            .then(m => m.COMPONENTS_ROUTES),
      },

      // Records
      {
        path: 'records',
        loadChildren: () =>
          import('./features/records/records.routes')
            .then(m => m.RECORDS_ROUTES),
      },

      // Reports
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes')
            .then(m => m.REPORTS_ROUTES),
      },

      // Users (Solo Admin)
      {
        path: 'users',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/users/users.routes')
            .then(m => m.USERS_ROUTES),
      },

      // Default interno
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Not found
  { path: '**', redirectTo: '' },
];
