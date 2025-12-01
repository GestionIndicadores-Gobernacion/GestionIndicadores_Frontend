import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin-guard';

export const DASHBOARD_LAYOUT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../features/dashboard/home-dashboard/home-dashboard')
        .then(m => m.HomeDashboardComponent),
  },

  {
    path: 'users',
    loadChildren: () =>
      import('../../features/users/users.routes')
        .then(m => m.USERS_ROUTES),
  },
  {
    path: 'strategies',
    loadChildren: () =>
      import('../../features/strategy/strategy.routes')
        .then(m => m.STRATEGY_ROUTES),
  },
  {
    path: 'indicators',
    loadChildren: () =>
      import('../../features/indicators/indicators.routes')
        .then(m => m.INDICATORS_ROUTES),
  },

  {
    path: 'components',
    loadChildren: () =>
      import('../../features/componentes/componentes.routes')
        .then(m => m.COMPONENTS_ROUTES),
  },

  {
    path: 'records',
    loadChildren: () =>
      import('../../features/records/records.routes')
        .then(m => m.RECORDS_ROUTES),
  },
];
