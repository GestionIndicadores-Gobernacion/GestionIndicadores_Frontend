import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home-dashboard/home-dashboard')
        .then(m => m.HomeDashboardComponent)
  }
];
