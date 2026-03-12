import { Routes } from '@angular/router';
import { adminGuard } from '../../../core/guards/admin-guard';

export const REPORTS_ROUTES: Routes = [

  // 📄 LISTADO
  {
    path: '',
    loadComponent: () =>
      import('./reports-list/reports-list')
        .then(m => m.ReportsListComponent),
  },

  // ➕ CREAR
  {
    path: 'create',
    loadComponent: () =>
      import('./report-form/report-form')
        .then(m => m.ReportFormComponent),
  },

  // 🔽 SUBMÓDULOS (PRIMERO)
  {
    path: '',
    canActivateChild: [adminGuard],
    children: [
      {
        path: 'strategies',
        loadChildren: () =>
          import('../strategy/strategy.routes')
            .then(m => m.STRATEGY_ROUTES),
      },
      {
        path: 'components',
        loadChildren: () =>
          import('../componentes/componentes.routes')
            .then(m => m.COMPONENTS_ROUTES),
      },
    ],
  },

  // ✏️ EDITAR (AL FINAL)
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./report-form/report-form')
        .then(m => m.ReportFormComponent),
  },

  // 🔍 DETALLE(AL FINAL DE TODO)
  {
    path: ':id',
    loadComponent: () =>
      import('./report-detail/report-detail')
        .then(m => m.ReportDetailComponent),
  },
];
