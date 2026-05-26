import { Routes } from '@angular/router';

export const SUPPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-support/admin-support').then(m => m.AdminSupportComponent),
  },
];
