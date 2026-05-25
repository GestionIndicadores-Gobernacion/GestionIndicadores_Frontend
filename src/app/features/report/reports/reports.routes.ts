import { Routes } from '@angular/router';
import { viewerGuard } from '../../../core/guards/viewer-guard-guard';
import { permGuard } from '../../../core/guards/perm-guard';
import { PERMS, ROLE_IDS } from '../../../core/constants/permissions';

export const REPORTS_ROUTES: Routes = [

  // 📄 LISTADO
  {
    path: '',
    loadComponent: () =>
      import('./reports-list/reports-list')
        .then(m => m.ReportsListComponent),
  },

  // ➕ CREAR (ruta fija /create)
  {
    path: 'create',
    canActivate: [viewerGuard],
    loadComponent: () =>
      import('./report-form/report-form')
        .then(m => m.ReportFormComponent),
  },

  // ➕ CREAR DESDE ACTIVIDAD (ruta /new?activityId=xxx) ← NUEVO
  {
    path: 'new',
    canActivate: [viewerGuard],
    loadComponent: () =>
      import('./report-form/report-form')
        .then(m => m.ReportFormComponent),
  },

  // 🔽 SUBMÓDULOS — protegidos por permiso específico (fallback rol admin)
  {
    path: 'strategies',
    canActivate: [permGuard({
      perms: [PERMS.STRATEGIES_MANAGE],
      fallbackRoles: [ROLE_IDS.ADMIN],
    })],
    loadChildren: () =>
      import('../strategy/strategy.routes')
        .then(m => m.STRATEGY_ROUTES),
  },
  {
    path: 'components',
    canActivate: [permGuard({
      perms: [PERMS.COMPONENTS_MANAGE],
      fallbackRoles: [ROLE_IDS.ADMIN],
    })],
    loadChildren: () =>
      import('../componentes/componentes.routes')
        .then(m => m.COMPONENTS_ROUTES),
  },

  // ✏️ EDITAR
  {
    path: ':id/edit',
    canActivate: [viewerGuard],
    loadComponent: () =>
      import('./report-form/report-form')
        .then(m => m.ReportFormComponent),
  },

  // 🔍 DETALLE
  {
    path: ':id',
    loadComponent: () =>
      import('./report-detail/report-detail')
        .then(m => m.ReportDetailComponent),
  },
];