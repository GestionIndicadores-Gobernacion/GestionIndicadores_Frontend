import { Routes } from '@angular/router';

export const DASHBOARD_LAYOUT_ROUTES: Routes = [

  {
    path: '',
    loadComponent: () =>
      import('../../features/dashboard/home-dashboard/home-dashboard')
        .then(m => m.HomeDashboardComponent),
  },
];
