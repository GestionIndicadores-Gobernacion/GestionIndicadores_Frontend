import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout';


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
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./layouts/dashboard-layout/dashboard-layout.routes')
            .then(m => m.DASHBOARD_LAYOUT_ROUTES),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  // Not found
  { path: '**', redirectTo: '' },
];
