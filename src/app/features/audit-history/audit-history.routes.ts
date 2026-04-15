import { Routes } from '@angular/router';

export const AUDIT_HISTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./audit-history').then(m => m.AuditHistoryComponent),
  },
];
