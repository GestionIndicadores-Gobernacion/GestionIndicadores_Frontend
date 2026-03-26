import { Routes } from '@angular/router';
import { adminGuard } from '../../../core/guards/admin-guard';
import { viewerGuard } from '../../../core/guards/viewer-guard-guard';

export const REPORTS_ROUTES: Routes = [

  // 📄 LISTADO — todos pueden ver
  {
    path: '',
    loadComponent: () =>
      import('./reports-list/reports-list')
        .then(m => m.ReportsListComponent),
  },

  // ➕ CREAR — sin viewer
  {
    path: 'create',
    canActivate: [viewerGuard],
    loadComponent: () =>
      import('./report-form/report-form')
        .then(m => m.ReportFormComponent),
  },

  // 🔽 SUBMÓDULOS — solo admin
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

  // ✏️ EDITAR — sin viewer
  {
    path: ':id/edit',
    canActivate: [viewerGuard],
    loadComponent: () =>
      import('./report-form/report-form')
        .then(m => m.ReportFormComponent),
  },

  // 🔍 DETALLE — todos pueden ver
  {
    path: ':id',
    loadComponent: () =>
      import('./report-detail/report-detail')
        .then(m => m.ReportDetailComponent),
  },
];