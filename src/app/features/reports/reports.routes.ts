import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./reports-list/reports-list')
        .then(m => m.ReportsListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./report-detail/report-detail')
        .then(m => m.ReportDetailComponent),
  },
];
